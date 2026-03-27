package com.lunero.integration;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
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

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * End-to-end integration test covering the full new-user flow:
 *   1. User registration (GET /api/v1/profile — creates user on first call)
 *   2. Onboarding completion (PATCH /api/v1/profile)
 *   3. Create a FlowSheet (POST /api/v1/flowsheets)
 *   4. Add income, expense, and savings entries (POST /api/v1/entries)
 *   5. Verify availableBalance = totalIncome − (totalExpenses + totalSavings)
 *
 * Uses an in-memory H2 database with a test-specific schema (no btree_gist / EXCLUDE constraint).
 * The Clerk JWT filter is bypassed by injecting a ClerkAuthentication directly into the
 * SecurityContext via a custom RequestPostProcessor.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("integration-test")
@Sql(scripts = "/schema-integration.sql",
     executionPhase = Sql.ExecutionPhase.BEFORE_TEST_CLASS)
class UserRegistrationFlowTest {

    // ── Test infrastructure ──────────────────────────────────────────────────

    /**
     * Replaces beans that require external services (VAPID crypto, Spring AI, Clerk JWKS)
     * with mocks or no-ops so the application context starts cleanly in tests.
     */
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

        /**
         * No-op ClerkJwtFilter for tests — does not attempt JWKS validation.
         * Authentication is injected directly via SecurityMockMvcRequestPostProcessors.
         */
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
                    // No-op: do not validate JWT; let SecurityContext auth pass through
                    filterChain.doFilter(request, response);
                }
            };
        }
    }

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private ObjectMapper objectMapper;

    private static final String TEST_CLERK_USER_ID = "clerk_integration_test_user";

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        objectMapper.registerModule(new JavaTimeModule());

        // Clean up between tests so each test starts with a fresh user
        jdbcTemplate.execute("DELETE FROM entries");
        jdbcTemplate.execute("DELETE FROM category_projections");
        jdbcTemplate.execute("DELETE FROM flow_sheets");
        jdbcTemplate.execute("DELETE FROM recurring_entries");
        jdbcTemplate.execute("DELETE FROM categories");
        jdbcTemplate.execute("DELETE FROM notification_tokens");
        jdbcTemplate.execute("DELETE FROM dismissed_alerts");
        jdbcTemplate.execute("DELETE FROM audit_log");
        jdbcTemplate.execute("DELETE FROM users");
    }

    // ── Full flow test ───────────────────────────────────────────────────────

    /**
     * Validates: Available Balance = Total Income − (Total Expenses + Total Savings)
     *
     * Full sequence:
     *   Step 1 — GET /api/v1/profile  → creates user profile on first call
     *   Step 2 — PATCH /api/v1/profile → completes onboarding
     *   Step 3 — POST /api/v1/flowsheets → creates a monthly FlowSheet
     *   Step 4 — POST /api/v1/entries (income $3000)
     *   Step 5 — POST /api/v1/entries (expense $800)
     *   Step 6 — POST /api/v1/entries (savings $500)
     *   Step 7 — GET /api/v1/flowsheets/active → verify availableBalance = 3000 − (800 + 500) = 1700
     */
    @Test
    void fullUserFlow_availableBalanceEqualsIncomeMinusExpensesAndSavings() throws Exception {

        // ── Step 1: Registration — GET /api/v1/profile creates user on first call ──
        mockMvc.perform(get("/api/v1/profile")
                        .with(clerkAuth()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.clerkUserId").value(TEST_CLERK_USER_ID))
                .andExpect(jsonPath("$.onboardingComplete").value(false));

        // ── Step 2: Onboarding — PATCH /api/v1/profile ──────────────────────────
        String onboardingBody = """
                {
                  "displayName": "Alice Test",
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
                .andExpect(jsonPath("$.displayName").value("Alice Test"))
                .andExpect(jsonPath("$.defaultCurrency").value("USD"))
                .andExpect(jsonPath("$.flowsheetPeriod").value("monthly"))
                .andExpect(jsonPath("$.themePreference").value("dark"))
                .andExpect(jsonPath("$.onboardingComplete").value(true));

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
                .andExpect(jsonPath("$.periodType").value("monthly"))
                .andReturn();

        String flowSheetId = objectMapper
                .readTree(flowSheetResult.getResponse().getContentAsString())
                .get("id").asText();

        // Resolve default category IDs seeded by UserService on user creation
        String incomeCategoryId  = findCategoryId("income");
        String expenseCategoryId = findCategoryId("expense");
        String savingsCategoryId = findCategoryId("savings");

        // ── Step 4: Add income entry ($3000) ─────────────────────────────────────
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
                .andExpect(jsonPath("$.availableBalance").value(3000.0));

        // ── Step 5: Add expense entry ($800) ─────────────────────────────────────
        String expenseBody = String.format("""
                {
                  "flowSheetId": "%s",
                  "entryType": "expense",
                  "categoryId": "%s",
                  "amount": 800.00,
                  "currency": "USD",
                  "entryDate": "%s"
                }
                """, flowSheetId, expenseCategoryId, startDate);

        mockMvc.perform(post("/api/v1/entries")
                        .with(clerkAuth())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(expenseBody))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.entryType").value("expense"))
                .andExpect(jsonPath("$.amount").value(800.0))
                // balance = 3000 - 800 = 2200
                .andExpect(jsonPath("$.availableBalance").value(2200.0));

        // ── Step 6: Add savings entry ($500) ─────────────────────────────────────
        String savingsBody = String.format("""
                {
                  "flowSheetId": "%s",
                  "entryType": "savings",
                  "categoryId": "%s",
                  "amount": 500.00,
                  "currency": "USD",
                  "entryDate": "%s"
                }
                """, flowSheetId, savingsCategoryId, startDate);

        mockMvc.perform(post("/api/v1/entries")
                        .with(clerkAuth())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(savingsBody))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.entryType").value("savings"))
                .andExpect(jsonPath("$.amount").value(500.0))
                // balance = 3000 - (800 + 500) = 1700
                .andExpect(jsonPath("$.availableBalance").value(1700.0));

        // ── Step 7: Verify active FlowSheet balance ───────────────────────────────
        MvcResult activeResult = mockMvc.perform(get("/api/v1/flowsheets/active")
                        .with(clerkAuth()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("active"))
                .andExpect(jsonPath("$.totalIncome").value(3000.0))
                .andExpect(jsonPath("$.totalExpenses").value(800.0))
                .andExpect(jsonPath("$.totalSavings").value(500.0))
                .andExpect(jsonPath("$.availableBalance").value(1700.0))
                .andReturn();

        // Final assertion: availableBalance = totalIncome − (totalExpenses + totalSavings)
        JsonNode activeSheet = objectMapper.readTree(activeResult.getResponse().getContentAsString());
        BigDecimal totalIncome      = new BigDecimal(activeSheet.get("totalIncome").asText());
        BigDecimal totalExpenses    = new BigDecimal(activeSheet.get("totalExpenses").asText());
        BigDecimal totalSavings     = new BigDecimal(activeSheet.get("totalSavings").asText());
        BigDecimal availableBalance = new BigDecimal(activeSheet.get("availableBalance").asText());

        BigDecimal expectedBalance = totalIncome.subtract(totalExpenses.add(totalSavings));
        assertThat(availableBalance).isEqualByComparingTo(expectedBalance);
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    /**
     * Returns a RequestPostProcessor that injects a ClerkAuthentication directly
     * into the MockMvc request, bypassing the JWT filter entirely.
     */
    private RequestPostProcessor clerkAuth() {
        ClerkAuthentication auth = new ClerkAuthentication(
                TEST_CLERK_USER_ID,
                List.of(new SimpleGrantedAuthority("ROLE_USER"))
        );
        return SecurityMockMvcRequestPostProcessors.authentication(auth);
    }

    /**
     * Looks up the first default category ID for the given entry type.
     * Default categories are seeded by UserService.getOrCreateUser → CategoryService.seedDefaultCategories.
     */
    private String findCategoryId(String entryType) {
        return jdbcTemplate.queryForObject(
                "SELECT id FROM categories WHERE entry_type = ? AND is_default = TRUE LIMIT 1",
                String.class,
                entryType
        );
    }
}
