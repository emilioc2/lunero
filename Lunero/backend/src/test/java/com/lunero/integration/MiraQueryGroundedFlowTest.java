package com.lunero.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.lunero.security.ClerkAuthentication;
import com.lunero.security.ClerkJwtFilter;
import nl.martijndwars.webpush.PushService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
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

import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * End-to-end integration test verifying Mira data isolation (Property 20):
 * When user A queries Mira, the context prompt sent to Gemini contains ONLY
 * user A's financial data and never user B's data.
 *
 * Validates: Requirement 7.6 — Mira only accesses the authenticated user's data.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("integration-test")
@Sql(scripts = "/schema-integration.sql",
     executionPhase = Sql.ExecutionPhase.BEFORE_TEST_CLASS)
class MiraQueryGroundedFlowTest {

    // ── Test infrastructure ──────────────────────────────────────────────────

    /** Shared mock so we can use ArgumentCaptor after Mira queries. */
    static ChatClient.ChatClientRequestSpec sharedRequestSpec;

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
            sharedRequestSpec = mock(ChatClient.ChatClientRequestSpec.class);
            ChatClient.CallResponseSpec callSpec = mock(ChatClient.CallResponseSpec.class);

            when(mockChatClient.prompt()).thenReturn(sharedRequestSpec);
            when(sharedRequestSpec.user(anyString())).thenReturn(sharedRequestSpec);
            when(sharedRequestSpec.call()).thenReturn(callSpec);
            when(callSpec.content()).thenReturn("Your available balance is $2200.");

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

    private static final String USER_A_CLERK_ID = "clerk_grounded_test_user_a";
    private static final String USER_B_CLERK_ID = "clerk_grounded_test_user_b";

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        objectMapper.registerModule(new JavaTimeModule());

        // Clean slate
        jdbcTemplate.execute("DELETE FROM entries");
        jdbcTemplate.execute("DELETE FROM category_projections");
        jdbcTemplate.execute("DELETE FROM flow_sheets");
        jdbcTemplate.execute("DELETE FROM recurring_entries");
        jdbcTemplate.execute("DELETE FROM categories");
        jdbcTemplate.execute("DELETE FROM notification_tokens");
        jdbcTemplate.execute("DELETE FROM dismissed_alerts");
        jdbcTemplate.execute("DELETE FROM audit_log");
        jdbcTemplate.execute("DELETE FROM users");

        // Reset mock interaction history so ArgumentCaptor works cleanly
        reset(sharedRequestSpec);
        when(sharedRequestSpec.user(anyString())).thenReturn(sharedRequestSpec);
        ChatClient.CallResponseSpec callSpec = mock(ChatClient.CallResponseSpec.class);
        when(sharedRequestSpec.call()).thenReturn(callSpec);
        when(callSpec.content()).thenReturn("Your available balance is $2200.");
    }

    // ── Full flow test ───────────────────────────────────────────────────────

    /**
     * Validates: Property 20 — Mira Data Isolation
     *
     * Full sequence:
     *   1. Create user A (onboarding complete), FlowSheet, income $3000, expense $800
     *   2. Create user B (onboarding complete), FlowSheet, income $5000, expense $1000
     *   3. Query Mira as user A → capture the prompt sent to Gemini
     *   4. Verify the captured prompt contains user A's data (3000, 800)
     *      and does NOT contain user B's data (5000, 1000)
     *   5. Query Mira as user B → capture the prompt
     *   6. Verify the captured prompt contains user B's data (5000, 1000)
     *      and does NOT contain user A's data (3000, 800)
     */
    @Test
    void miraQuery_contextPromptContainsOnlyAuthenticatedUsersData() throws Exception {

        // ── Set up user A with income $3000 and expense $800 ─────────────────
        setupUserWithEntries(USER_A_CLERK_ID, "Alice", 3000.00, 800.00);

        // ── Set up user B with income $5000 and expense $1000 ────────────────
        setupUserWithEntries(USER_B_CLERK_ID, "Bob", 5000.00, 1000.00);

        // ── Query Mira as user A ─────────────────────────────────────────────
        clearInvocations(sharedRequestSpec);

        String miraBody = """
                { "message": "What is my available balance?" }
                """;

        mockMvc.perform(post("/api/v1/ai/query")
                        .with(clerkAuth(USER_A_CLERK_ID))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(miraBody))
                .andExpect(status().isOk());

        // Capture the prompt that was sent to Gemini for user A's query
        ArgumentCaptor<String> promptCaptorA = ArgumentCaptor.forClass(String.class);
        verify(sharedRequestSpec, atLeastOnce()).user(promptCaptorA.capture());
        String capturedPromptA = promptCaptorA.getValue();

        // User A's data should be present
        assertThat(capturedPromptA).contains("3000");
        assertThat(capturedPromptA).contains("800");
        // User B's data must NOT be present
        assertThat(capturedPromptA).doesNotContain("5000");
        assertThat(capturedPromptA).doesNotContain("1000");

        // ── Query Mira as user B ─────────────────────────────────────────────
        clearInvocations(sharedRequestSpec);
        // Re-wire the fluent chain after clearing invocations
        when(sharedRequestSpec.user(anyString())).thenReturn(sharedRequestSpec);
        ChatClient.CallResponseSpec callSpec = mock(ChatClient.CallResponseSpec.class);
        when(sharedRequestSpec.call()).thenReturn(callSpec);
        when(callSpec.content()).thenReturn("Your available balance is $4000.");

        mockMvc.perform(post("/api/v1/ai/query")
                        .with(clerkAuth(USER_B_CLERK_ID))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(miraBody))
                .andExpect(status().isOk());

        // Capture the prompt that was sent to Gemini for user B's query
        ArgumentCaptor<String> promptCaptorB = ArgumentCaptor.forClass(String.class);
        verify(sharedRequestSpec, atLeastOnce()).user(promptCaptorB.capture());
        String capturedPromptB = promptCaptorB.getValue();

        // User B's data should be present
        assertThat(capturedPromptB).contains("5000");
        assertThat(capturedPromptB).contains("1000");
        // User A's data must NOT be present
        assertThat(capturedPromptB).doesNotContain("3000");
        assertThat(capturedPromptB).doesNotContain("800");
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    /**
     * Creates a user, completes onboarding, creates a FlowSheet, and adds
     * an income entry and an expense entry with the given amounts.
     */
    private void setupUserWithEntries(String clerkUserId, String displayName,
                                      double incomeAmount, double expenseAmount) throws Exception {
        RequestPostProcessor auth = clerkAuth(clerkUserId);

        // Register user
        mockMvc.perform(get("/api/v1/profile").with(auth))
                .andExpect(status().isOk());

        // Complete onboarding
        String onboardingBody = String.format("""
                {
                  "displayName": "%s",
                  "defaultCurrency": "USD",
                  "flowsheetPeriod": "monthly",
                  "themePreference": "dark",
                  "overspendAlerts": true,
                  "onboardingComplete": true,
                  "onboardingStep": 5
                }
                """, displayName);

        mockMvc.perform(patch("/api/v1/profile")
                        .with(auth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(onboardingBody))
                .andExpect(status().isOk());

        // Create FlowSheet
        LocalDate startDate = LocalDate.now();
        LocalDate endDate = startDate.plusMonths(1).minusDays(1);

        String flowSheetBody = String.format("""
                {
                  "periodType": "monthly",
                  "startDate": "%s",
                  "endDate": "%s"
                }
                """, startDate, endDate);

        MvcResult fsResult = mockMvc.perform(post("/api/v1/flowsheets")
                        .with(auth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(flowSheetBody))
                .andExpect(status().isCreated())
                .andReturn();

        String flowSheetId = objectMapper
                .readTree(fsResult.getResponse().getContentAsString())
                .get("id").asText();

        // Resolve default category IDs for this user
        String incomeCategoryId = findCategoryId(clerkUserId, "income");
        String expenseCategoryId = findCategoryId(clerkUserId, "expense");

        // Add income entry
        String incomeBody = String.format("""
                {
                  "flowSheetId": "%s",
                  "entryType": "income",
                  "categoryId": "%s",
                  "amount": %.2f,
                  "currency": "USD",
                  "entryDate": "%s"
                }
                """, flowSheetId, incomeCategoryId, incomeAmount, startDate);

        mockMvc.perform(post("/api/v1/entries")
                        .with(auth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(incomeBody))
                .andExpect(status().isCreated());

        // Add expense entry
        String expenseBody = String.format("""
                {
                  "flowSheetId": "%s",
                  "entryType": "expense",
                  "categoryId": "%s",
                  "amount": %.2f,
                  "currency": "USD",
                  "entryDate": "%s"
                }
                """, flowSheetId, expenseCategoryId, expenseAmount, startDate);

        mockMvc.perform(post("/api/v1/entries")
                        .with(auth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(expenseBody))
                .andExpect(status().isCreated());
    }

    private RequestPostProcessor clerkAuth(String clerkUserId) {
        ClerkAuthentication auth = new ClerkAuthentication(
                clerkUserId,
                List.of(new SimpleGrantedAuthority("ROLE_USER"))
        );
        return SecurityMockMvcRequestPostProcessors.authentication(auth);
    }

    /**
     * Looks up the first default category ID for the given entry type,
     * scoped to the user identified by their Clerk user ID.
     */
    private String findCategoryId(String clerkUserId, String entryType) {
        return jdbcTemplate.queryForObject(
                "SELECT c.id FROM categories c " +
                "JOIN users u ON c.user_id = u.id " +
                "WHERE u.clerk_user_id = ? AND c.entry_type = ? AND c.is_default = TRUE " +
                "LIMIT 1",
                String.class,
                clerkUserId, entryType
        );
    }
}
