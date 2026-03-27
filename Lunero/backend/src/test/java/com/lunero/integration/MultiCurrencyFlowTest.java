package com.lunero.integration;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.lunero.currency.CurrencyService;
import com.lunero.security.ClerkAuthentication;
import com.lunero.security.ClerkJwtFilter;
import nl.martijndwars.webpush.PushService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.jdbc.Sql;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import java.lang.reflect.Field;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * End-to-end integration test for multi-currency entry flow:
 *   1. Create a user with default currency USD
 *   2. Create a FlowSheet
 *   3. Add an income entry in USD ($3000)
 *   4. Add an expense entry in EUR (€500) — backend converts to USD
 *   5. Verify the active FlowSheet's availableBalance uses the convertedAmount for the EUR entry
 *
 * Validates: Requirements 2.10, 10.3, 10.4 (Property 7: Server-Side Currency Conversion Round-Trip)
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("integration-test")
@Sql(scripts = "/schema-integration.sql",
     executionPhase = Sql.ExecutionPhase.BEFORE_TEST_CLASS)
class MultiCurrencyFlowTest {

    // ── Test infrastructure ──────────────────────────────────────────────────

    @TestConfiguration
    static class IntegrationTestConfig {

        @Bean
        @Primary
        public PushService pushService() {
            return mock(PushService.class);
        }

        @Bean
        @Primary
        public ChatClient chatClient() {
            return mock(ChatClient.class);
        }

        @Bean
        @Primary
        public ChatClient.Builder chatClientBuilder() {
            ChatClient mockClient = mock(ChatClient.class);
            ChatClient.Builder mockBuilder = mock(ChatClient.Builder.class);
            org.mockito.Mockito.when(mockBuilder.build()).thenReturn(mockClient);
            return mockBuilder;
        }

        @Bean
        @Primary
        public ClerkJwtFilter clerkJwtFilter() throws Exception {
            return new ClerkJwtFilter("https://test.clerk.invalid/.well-known/jwks.json") {
                @Override
                protected void doFilterInternal(
                        jakarta.servlet.http.HttpServletRequest request,
                        jakarta.servlet.http.HttpServletResponse response,
                        jakarta.servlet.FilterChain filterChain)
                        throws jakarta.servlet.ServletException, java.io.IOException {
                    filterChain.doFilter(request, response);
                }
            };
        }
    }

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private CurrencyService currencyService;

    private ObjectMapper objectMapper;

    private static final String TEST_CLERK_USER_ID = "clerk_multi_currency_test_user";

    // EUR-based test rates (Frankfurter returns EUR-based rates)
    private static final double EUR_TO_USD_RATE = 1.08;

    @BeforeEach
    void setUp() throws Exception {
        objectMapper = new ObjectMapper();
        objectMapper.registerModule(new JavaTimeModule());

        // Clean up between tests
        jdbcTemplate.execute("DELETE FROM entries");
        jdbcTemplate.execute("DELETE FROM category_projections");
        jdbcTemplate.execute("DELETE FROM flow_sheets");
        jdbcTemplate.execute("DELETE FROM recurring_entries");
        jdbcTemplate.execute("DELETE FROM categories");
        jdbcTemplate.execute("DELETE FROM notification_tokens");
        jdbcTemplate.execute("DELETE FROM dismissed_alerts");
        jdbcTemplate.execute("DELETE FROM audit_log");
        jdbcTemplate.execute("DELETE FROM users");

        // Inject test FX rates (may be overwritten by @Scheduled refreshRates on startup)
        injectTestRates();
    }

    // ── Full multi-currency flow test ────────────────────────────────────────

    /**
     * Validates: Property 7 — Server-Side Currency Conversion Round-Trip
     *
     * Full sequence:
     *   Step 1 — GET /api/v1/profile → creates user on first call
     *   Step 2 — PATCH /api/v1/profile → set default currency to USD
     *   Step 3 — POST /api/v1/flowsheets → create a monthly FlowSheet
     *   Step 4 — POST /api/v1/entries → add income $3000 USD
     *   Step 5 — POST /api/v1/entries → add expense €500 EUR (converted to USD)
     *   Step 6 — Verify EUR entry has convertedAmount and conversionRate
     *   Step 7 — GET /api/v1/flowsheets/active → verify availableBalance = 3000 - (500 * 1.08) = 2460
     */
    @Test
    void multiCurrencyFlow_eurExpenseConvertedToUsdInBalance() throws Exception {

        // ── Step 1: Registration ─────────────────────────────────────────────────
        mockMvc.perform(get("/api/v1/profile")
                        .with(clerkAuth()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.clerkUserId").value(TEST_CLERK_USER_ID));

        // ── Step 2: Set default currency to USD ──────────────────────────────────
        String onboardingBody = """
                {
                  "displayName": "Currency Test User",
                  "defaultCurrency": "USD",
                  "flowsheetPeriod": "monthly",
                  "themePreference": "dark",
                  "overspendAlerts": true,
                  "onboardingComplete": true,
                  "onboardingStep": 5
                }
                """;

        mockMvc.perform(patch("/api/v1/profile")
                        .with(clerkAuth())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(onboardingBody))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.defaultCurrency").value("USD"));

        // ── Step 3: Create FlowSheet ─────────────────────────────────────────────
        LocalDate startDate = LocalDate.now();
        LocalDate endDate   = startDate.plusMonths(1).minusDays(1);

        String flowSheetBody = String.format("""
                {
                  "periodType": "monthly",
                  "startDate": "%s",
                  "endDate": "%s"
                }
                """, startDate, endDate);

        MvcResult flowSheetResult = mockMvc.perform(post("/api/v1/flowsheets")
                        .with(clerkAuth())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(flowSheetBody))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("active"))
                .andReturn();

        String flowSheetId = objectMapper
                .readTree(flowSheetResult.getResponse().getContentAsString())
                .get("id").asText();

        String incomeCategoryId  = findCategoryId("income");
        String expenseCategoryId = findCategoryId("expense");

        // ── Step 4: Add income entry ($3000 USD) ─────────────────────────────────
        String incomeBody = String.format("""
                {
                  "flowSheetId": "%s",
                  "entryType": "income",
                  "categoryId": "%s",
                  "amount": 3000.00,
                  "currency": "USD",
                  "entryDate": "%s"
                }
                """, flowSheetId, incomeCategoryId, startDate);

        mockMvc.perform(post("/api/v1/entries")
                        .with(clerkAuth())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(incomeBody))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.entryType").value("income"))
                .andExpect(jsonPath("$.amount").value(3000.0))
                .andExpect(jsonPath("$.currency").value("USD"))
                // USD entry for a USD user — no conversion needed
                .andExpect(jsonPath("$.convertedAmount").isEmpty())
                .andExpect(jsonPath("$.conversionRate").isEmpty())
                .andExpect(jsonPath("$.availableBalance").value(3000.0));

        // ── Step 5: Add expense entry (€500 EUR) ─────────────────────────────────
        // Re-inject test rates right before creating the EUR entry.
        // The @Scheduled refreshRates() runs on startup (initialDelay=0) and may
        // overwrite rates set in @BeforeEach, so we set them again here.
        injectTestRates();

        // EUR→USD conversion: fromRate=1.0 (EUR), toRate=1.08 (USD)
        // conversionRate = 1.08 / 1.0 = 1.08
        // convertedAmount = 500 * 1.08 = 540.00
        String expenseBody = String.format("""
                {
                  "flowSheetId": "%s",
                  "entryType": "expense",
                  "categoryId": "%s",
                  "amount": 500.00,
                  "currency": "EUR",
                  "entryDate": "%s"
                }
                """, flowSheetId, expenseCategoryId, startDate);

        MvcResult expenseResult = mockMvc.perform(post("/api/v1/entries")
                        .with(clerkAuth())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(expenseBody))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.entryType").value("expense"))
                .andExpect(jsonPath("$.amount").value(500.0))
                .andExpect(jsonPath("$.currency").value("EUR"))
                .andReturn();

        // ── Step 6: Verify EUR entry has convertedAmount and conversionRate ──────
        JsonNode expenseEntry = objectMapper.readTree(expenseResult.getResponse().getContentAsString());

        BigDecimal convertedAmount = new BigDecimal(expenseEntry.get("convertedAmount").asText());
        BigDecimal conversionRate  = new BigDecimal(expenseEntry.get("conversionRate").asText());

        // conversionRate should be toRate/fromRate = 1.08/1.0 = 1.08
        assertThat(conversionRate).isEqualByComparingTo(BigDecimal.valueOf(EUR_TO_USD_RATE));

        // convertedAmount should be 500 * 1.08 = 540.0000
        BigDecimal expectedConverted = BigDecimal.valueOf(500)
                .multiply(BigDecimal.valueOf(EUR_TO_USD_RATE))
                .setScale(4, RoundingMode.HALF_UP);
        assertThat(convertedAmount).isEqualByComparingTo(expectedConverted);

        // availableBalance from the entry response: 3000 - 540 = 2460
        BigDecimal entryBalance = new BigDecimal(expenseEntry.get("availableBalance").asText());
        BigDecimal expectedBalance = BigDecimal.valueOf(3000).subtract(expectedConverted);
        assertThat(entryBalance).isEqualByComparingTo(expectedBalance);

        // ── Step 7: Verify active FlowSheet balance uses converted amount ────────
        MvcResult activeResult = mockMvc.perform(get("/api/v1/flowsheets/active")
                        .with(clerkAuth()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("active"))
                .andExpect(jsonPath("$.totalIncome").value(3000.0))
                .andReturn();

        JsonNode activeSheet = objectMapper.readTree(activeResult.getResponse().getContentAsString());

        BigDecimal totalIncome      = new BigDecimal(activeSheet.get("totalIncome").asText());
        BigDecimal totalExpenses    = new BigDecimal(activeSheet.get("totalExpenses").asText());
        BigDecimal availableBalance = new BigDecimal(activeSheet.get("availableBalance").asText());

        // totalExpenses should be the converted amount (540), not the original EUR amount (500)
        assertThat(totalExpenses).isEqualByComparingTo(expectedConverted);

        // availableBalance = totalIncome - totalExpenses = 3000 - 540 = 2460
        BigDecimal finalExpected = totalIncome.subtract(totalExpenses);
        assertThat(availableBalance).isEqualByComparingTo(finalExpected);
        assertThat(availableBalance).isEqualByComparingTo(expectedBalance);
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    /**
     * Injects deterministic EUR-based FX rates into CurrencyService via reflection.
     * Frankfurter rates are EUR-based, so EUR is implicit 1.0.
     * Must be called right before currency conversion is needed, because the
     * @Scheduled refreshRates() (initialDelay=0) may overwrite rates on startup.
     */
    private void injectTestRates() throws Exception {
        Map<String, Double> testRates = new HashMap<>();
        testRates.put("USD", EUR_TO_USD_RATE);
        testRates.put("GBP", 0.86);
        testRates.put("JPY", 160.50);
        testRates.put("CAD", 1.47);

        Field ratesField = CurrencyService.class.getDeclaredField("lastKnownRates");
        ratesField.setAccessible(true);
        ratesField.set(currencyService, testRates);
    }

    private RequestPostProcessor clerkAuth() {
        ClerkAuthentication auth = new ClerkAuthentication(
                TEST_CLERK_USER_ID,
                List.of(new SimpleGrantedAuthority("ROLE_USER"))
        );
        return SecurityMockMvcRequestPostProcessors.authentication(auth);
    }

    private String findCategoryId(String entryType) {
        return jdbcTemplate.queryForObject(
                "SELECT id FROM categories WHERE entry_type = ? AND is_default = TRUE LIMIT 1",
                String.class,
                entryType
        );
    }
}
