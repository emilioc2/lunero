package com.lunero.integration;

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
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * End-to-end integration test for the Mira natural-language projection flow:
 *   1. Create a user (onboarding complete) with default currency USD
 *   2. Create a FlowSheet
 *   3. Send a natural-language projection prompt to Mira
 *   4. Verify the category projection was created/updated for the active FlowSheet
 *
 * Validates: Requirement 22.3 — Mira accepts natural-language prompts to set projected amounts.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("integration-test")
@Sql(scripts = "/schema-integration.sql",
     executionPhase = Sql.ExecutionPhase.BEFORE_TEST_CLASS)
class MiraProjectionFlowTest {

    // ── Test infrastructure ──────────────────────────────────────────────────

    /**
     * Replaces beans that require external services with mocks.
     * The ChatClient mock is configured with the fluent API chain so that
     * MiraService.handleProjectionQuery() receives a structured response.
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
            ChatClient mockChatClient = mock(ChatClient.class);
            ChatClient.ChatClientRequestSpec requestSpec = mock(ChatClient.ChatClientRequestSpec.class);
            ChatClient.CallResponseSpec callSpec = mock(ChatClient.CallResponseSpec.class);

            when(mockChatClient.prompt()).thenReturn(requestSpec);
            when(requestSpec.user(anyString())).thenReturn(requestSpec);
            when(requestSpec.call()).thenReturn(callSpec);
            // Return structured projection data: TYPE|AMOUNT|CURRENCY|NOTE
            when(callSpec.content()).thenReturn("expense|500|USD|groceries");

            return mockChatClient;
        }

        @Bean
        @Primary
        public ChatClient.Builder chatClientBuilder() {
            ChatClient.Builder mockBuilder = mock(ChatClient.Builder.class);
            when(mockBuilder.build()).thenReturn(mock(ChatClient.class));
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

    private ObjectMapper objectMapper;

    private static final String TEST_CLERK_USER_ID = "clerk_mira_projection_test_user";

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        objectMapper.registerModule(new JavaTimeModule());

        // Clean up between tests so each test starts fresh
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

    // ── Full Mira projection flow test ───────────────────────────────────────

    /**
     * Validates: Requirement 22.3 — Mira natural-language projection prompt
     *
     * Full sequence:
     *   Step 1 — GET /api/v1/profile → creates user on first call
     *   Step 2 — PATCH /api/v1/profile → complete onboarding with USD default currency
     *   Step 3 — POST /api/v1/flowsheets → create a monthly FlowSheet
     *   Step 4 — POST /api/v1/ai/query → send "I plan to spend $500 on groceries"
     *   Step 5 — Verify response indicates projections were updated
     *   Step 6 — Query category_projections table to verify projection exists with amount 500.00
     */
    @Test
    void miraProjectionFlow_naturalLanguagePromptCreatesProjection() throws Exception {

        // ── Step 1: Registration ─────────────────────────────────────────────────
        mockMvc.perform(get("/api/v1/profile")
                        .with(clerkAuth()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.clerkUserId").value(TEST_CLERK_USER_ID))
                .andExpect(jsonPath("$.onboardingComplete").value(false));

        // ── Step 2: Complete onboarding with USD default currency ─────────────────
        String onboardingBody = """
                {
                  "displayName": "Mira Projection Test User",
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
                .andExpect(jsonPath("$.onboardingComplete").value(true))
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

        // ── Step 4: Send Mira projection prompt ──────────────────────────────────
        // The ChatClient mock returns "expense|500|USD|groceries" which MiraService
        // parses via parseProjectionItems() and calls projectionService.upsertProjection()
        String miraBody = """
                {
                  "message": "I plan to spend $500 on groceries"
                }
                """;

        MvcResult miraResult = mockMvc.perform(post("/api/v1/ai/query")
                        .with(clerkAuth())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(miraBody))
                .andExpect(status().isOk())
                .andReturn();

        // ── Step 5: Verify response indicates projections were updated ────────────
        String miraResponse = miraResult.getResponse().getContentAsString();
        assertThat(miraResponse.toLowerCase())
                .satisfiesAnyOf(
                        r -> assertThat(r).contains("updated"),
                        r -> assertThat(r).contains("projection")
                );

        // ── Step 6: Verify category_projections table has the projection ──────────
        List<Map<String, Object>> projections = jdbcTemplate.queryForList(
                "SELECT cp.projected_amount, cp.currency, cp.flow_sheet_id " +
                "FROM category_projections cp WHERE cp.flow_sheet_id = ?",
                java.util.UUID.fromString(flowSheetId)
        );

        assertThat(projections).isNotEmpty();

        // Verify the projection amount is 500.00
        BigDecimal projectedAmount = (BigDecimal) projections.get(0).get("projected_amount");
        assertThat(projectedAmount).isEqualByComparingTo(new BigDecimal("500.0000"));

        // Verify the projection currency is USD
        String projectionCurrency = (String) projections.get(0).get("currency");
        assertThat(projectionCurrency).isEqualTo("USD");
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private RequestPostProcessor clerkAuth() {
        ClerkAuthentication auth = new ClerkAuthentication(
                TEST_CLERK_USER_ID,
                List.of(new SimpleGrantedAuthority("ROLE_USER"))
        );
        return SecurityMockMvcRequestPostProcessors.authentication(auth);
    }
}
