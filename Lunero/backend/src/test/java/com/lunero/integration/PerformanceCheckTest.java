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

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Performance baseline integration test.
 *
 * Verifies that key API endpoints respond within acceptable time limits
 * against an in-memory H2 database. This serves as a sanity check that
 * no endpoint has egregious performance regressions.
 *
 * Thresholds:
 *   - GET  /api/v1/flowsheets/active  (dashboard load) — median < 2000ms
 *   - POST /api/v1/entries            (entry creation)  — median < 200ms
 *   - GET  /api/v1/flowsheets         (list all)        — median < 200ms
 *   - GET  /api/v1/categories                            — median < 200ms
 *   - GET  /api/v1/trends?view=monthly                   — median < 200ms
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("integration-test")
@Sql(scripts = "/schema-integration.sql",
     executionPhase = Sql.ExecutionPhase.BEFORE_TEST_CLASS)
class PerformanceCheckTest {

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

    private ObjectMapper objectMapper;

    private static final String TEST_CLERK_USER_ID = "clerk_perf_test_user";
    private static final int ITERATIONS = 5;

    private String flowSheetId;
    private String incomeCategoryId;
    private String expenseCategoryId;
    private String savingsCategoryId;
    private LocalDate startDate;
    private LocalDate endDate;

    @BeforeEach
    void setUp() throws Exception {
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

        // Register user
        mockMvc.perform(get("/api/v1/profile").with(clerkAuth()))
                .andExpect(status().isOk());

        // Complete onboarding
        String onboardingBody = """
                {
                  "displayName": "Perf Test User",
                  "defaultCurrency": "USD",
                  "flowsheetPeriod": "monthly",
                  "themePreference": "system",
                  "overspendAlerts": true,
                  "onboardingComplete": true,
                  "onboardingStep": 5
                }
                """;
        mockMvc.perform(patch("/api/v1/profile")
                        .with(clerkAuth())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(onboardingBody))
                .andExpect(status().isOk());

        // Create FlowSheet
        startDate = LocalDate.now();
        endDate = startDate.plusMonths(1).minusDays(1);

        String flowSheetBody = String.format("""
                {
                  "periodType": "monthly",
                  "startDate": "%s",
                  "endDate": "%s"
                }
                """, startDate, endDate);

        MvcResult fsResult = mockMvc.perform(post("/api/v1/flowsheets")
                        .with(clerkAuth())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(flowSheetBody))
                .andExpect(status().isCreated())
                .andReturn();

        flowSheetId = objectMapper
                .readTree(fsResult.getResponse().getContentAsString())
                .get("id").asText();

        // Resolve default category IDs
        incomeCategoryId = findCategoryId("income");
        expenseCategoryId = findCategoryId("expense");
        savingsCategoryId = findCategoryId("savings");

        // Seed 15 entries (mixed types) to simulate realistic data
        String[] types = {"income", "expense", "savings"};
        String[] categoryIds = {incomeCategoryId, expenseCategoryId, savingsCategoryId};
        for (int i = 0; i < 15; i++) {
            int typeIdx = i % 3;
            String entryBody = String.format("""
                    {
                      "flowSheetId": "%s",
                      "entryType": "%s",
                      "categoryId": "%s",
                      "amount": %d.00,
                      "currency": "USD",
                      "entryDate": "%s"
                    }
                    """, flowSheetId, types[typeIdx], categoryIds[typeIdx],
                    100 + (i * 50), startDate);

            mockMvc.perform(post("/api/v1/entries")
                            .with(clerkAuth())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(entryBody))
                    .andExpect(status().isCreated());
        }
    }

    // ── Performance tests ────────────────────────────────────────────────────

    @Test
    void dashboardLoad_activeFlowSheet_medianUnder2000ms() throws Exception {
        long median = measureMedian(() ->
                mockMvc.perform(get("/api/v1/flowsheets/active").with(clerkAuth()))
                        .andExpect(status().isOk()));

        assertThat(median)
                .as("GET /api/v1/flowsheets/active median response time (ms)")
                .isLessThan(2000);
    }

    @Test
    void entryCreation_medianUnder200ms() throws Exception {
        long median = measureMedian(() -> {
            String body = String.format("""
                    {
                      "flowSheetId": "%s",
                      "entryType": "expense",
                      "categoryId": "%s",
                      "amount": 42.00,
                      "currency": "USD",
                      "entryDate": "%s"
                    }
                    """, flowSheetId, expenseCategoryId, startDate);

            mockMvc.perform(post("/api/v1/entries")
                            .with(clerkAuth())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isCreated());
        });

        assertThat(median)
                .as("POST /api/v1/entries median response time (ms)")
                .isLessThan(200);
    }

    @Test
    void listFlowSheets_medianUnder200ms() throws Exception {
        long median = measureMedian(() ->
                mockMvc.perform(get("/api/v1/flowsheets").with(clerkAuth()))
                        .andExpect(status().isOk()));

        assertThat(median)
                .as("GET /api/v1/flowsheets median response time (ms)")
                .isLessThan(200);
    }

    @Test
    void listCategories_medianUnder200ms() throws Exception {
        long median = measureMedian(() ->
                mockMvc.perform(get("/api/v1/categories").with(clerkAuth()))
                        .andExpect(status().isOk()));

        assertThat(median)
                .as("GET /api/v1/categories median response time (ms)")
                .isLessThan(200);
    }

    @Test
    void monthlyTrends_medianUnder200ms() throws Exception {
        long median = measureMedian(() ->
                mockMvc.perform(get("/api/v1/trends")
                                .param("view", "monthly")
                                .param("from", startDate.toString())
                                .param("to", endDate.toString())
                                .with(clerkAuth()))
                        .andExpect(status().isOk()));

        assertThat(median)
                .as("GET /api/v1/trends?view=monthly median response time (ms)")
                .isLessThan(200);
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    /**
     * Runs the given action ITERATIONS times, collects elapsed times,
     * and returns the median in milliseconds.
     */
    private long measureMedian(ThrowingRunnable action) throws Exception {
        List<Long> times = new ArrayList<>();
        for (int i = 0; i < ITERATIONS; i++) {
            long start = System.nanoTime();
            action.run();
            long elapsed = (System.nanoTime() - start) / 1_000_000;
            times.add(elapsed);
        }
        Collections.sort(times);
        return times.get(times.size() / 2);
    }

    @FunctionalInterface
    private interface ThrowingRunnable {
        void run() throws Exception;
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
