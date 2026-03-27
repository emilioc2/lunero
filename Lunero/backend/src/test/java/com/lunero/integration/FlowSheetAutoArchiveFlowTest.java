package com.lunero.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.lunero.flowsheet.FlowSheetService;
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
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * End-to-end integration test for the FlowSheet auto-archive flow:
 *   1. Create a user and a FlowSheet with a past end_date (already expired)
 *   2. Create a recurring entry (monthly cadence) for that FlowSheet
 *   3. Create a category projection for that FlowSheet
 *   4. Trigger archiveExpiredSheets() directly
 *   5. Verify the old FlowSheet is archived (status = 'archived')
 *   6. Verify a new active FlowSheet was created for the next period
 *   7. Verify the recurring entry was auto-populated into the new FlowSheet
 *   8. Verify the projection was carried over to the new FlowSheet
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("integration-test")
@Sql(scripts = "/schema-integration.sql",
     executionPhase = Sql.ExecutionPhase.BEFORE_TEST_CLASS)
class FlowSheetAutoArchiveFlowTest {

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

        /**
         * No-op ClerkJwtFilter — authentication is injected directly via SecurityMockMvcRequestPostProcessors.
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
    private FlowSheetService flowSheetService;

    private ObjectMapper objectMapper;

    private static final String TEST_CLERK_USER_ID = "clerk_archive_flow_test_user";

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        objectMapper.registerModule(new JavaTimeModule());

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

    // ── Full auto-archive flow test ──────────────────────────────────────────

    /**
     * Validates: FlowSheet auto-archive creates next period with recurring entries and projections.
     *
     * Full sequence:
     *   Step 1 — GET /api/v1/profile → creates user on first call
     *   Step 2 — POST /api/v1/flowsheets → creates a FlowSheet with a past end_date (Jan 2024)
     *   Step 3 — POST /api/v1/recurring → creates a monthly recurring entry
     *   Step 4 — PUT /api/v1/flowsheets/{flowSheetId}/projections/{categoryId} → creates a projection
     *   Step 5 — Call archiveExpiredSheets() directly
     *   Step 6 — Verify old FlowSheet is archived (status = 'archived', edit_locked = true)
     *   Step 7 — Verify new active FlowSheet exists for Feb 2024
     *   Step 8 — Verify recurring entry was auto-populated into the new FlowSheet
     *   Step 9 — Verify projection was carried over to the new FlowSheet
     */
    @Test
    void autoArchive_createsNextPeriodWithRecurringEntriesAndProjections() throws Exception {

        // ── Step 1: Create user via GET /api/v1/profile ──────────────────────────
        mockMvc.perform(get("/api/v1/profile")
                        .with(clerkAuth()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.clerkUserId").value(TEST_CLERK_USER_ID));

        // ── Step 2: Create a FlowSheet with a past end_date (Jan 2024) ───────────
        LocalDate oldStart = LocalDate.of(2024, 1, 1);
        LocalDate oldEnd   = LocalDate.of(2024, 1, 31);

        String flowSheetBody = String.format("""
                {
                  "periodType": "monthly",
                  "startDate": "%s",
                  "endDate": "%s"
                }
                """, oldStart, oldEnd);

        MvcResult flowSheetResult = mockMvc.perform(post("/api/v1/flowsheets")
                        .with(clerkAuth())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(flowSheetBody))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("active"))
                .andExpect(jsonPath("$.periodType").value("monthly"))
                .andReturn();

        String oldFlowSheetId = objectMapper
                .readTree(flowSheetResult.getResponse().getContentAsString())
                .get("id").asText();

        // ── Step 3: Create a monthly recurring entry ─────────────────────────────
        String expenseCategoryId = findCategoryId("expense");

        String recurringBody = String.format("""
                {
                  "entryType": "expense",
                  "categoryId": "%s",
                  "amount": 150.00,
                  "currency": "USD",
                  "cadence": "monthly",
                  "note": "Monthly subscription"
                }
                """, expenseCategoryId);

        mockMvc.perform(post("/api/v1/recurring")
                        .with(clerkAuth())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(recurringBody))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.cadence").value("monthly"))
                .andExpect(jsonPath("$.amount").value(150.0));

        // ── Step 4: Create a category projection for the old FlowSheet ───────────
        String projectionBody = """
                {
                  "projectedAmount": 200.00,
                  "currency": "USD"
                }
                """;

        mockMvc.perform(put("/api/v1/flowsheets/{flowSheetId}/projections/{categoryId}",
                        oldFlowSheetId, expenseCategoryId)
                        .with(clerkAuth())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(projectionBody))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.projectedAmount").value(200.0));

        // ── Step 5: Trigger archiveExpiredSheets() directly ──────────────────────
        int archived = flowSheetService.archiveExpiredSheets();
        assertThat(archived).isGreaterThanOrEqualTo(1);

        // ── Step 6: Verify old FlowSheet is now archived ─────────────────────────
        String oldStatus = jdbcTemplate.queryForObject(
                "SELECT status FROM flow_sheets WHERE id = ?",
                String.class,
                UUID.fromString(oldFlowSheetId));
        assertThat(oldStatus).isEqualTo("archived");

        Boolean editLocked = jdbcTemplate.queryForObject(
                "SELECT edit_locked FROM flow_sheets WHERE id = ?",
                Boolean.class,
                UUID.fromString(oldFlowSheetId));
        assertThat(editLocked).isTrue();

        // ── Step 7: Verify a new active FlowSheet was created for the next period ─
        // 2024 is a leap year, so Feb has 29 days: 2024-02-01 to 2024-02-29
        LocalDate expectedNextStart = LocalDate.of(2024, 2, 1);
        LocalDate expectedNextEnd   = LocalDate.of(2024, 2, 29);

        Map<String, Object> newSheet = jdbcTemplate.queryForMap(
                "SELECT id, status, start_date, end_date FROM flow_sheets " +
                "WHERE status = 'active' AND start_date = ? LIMIT 1",
                expectedNextStart);

        assertThat(newSheet).isNotNull();
        assertThat(newSheet.get("status")).isEqualTo("active");
        assertThat(newSheet.get("start_date").toString()).isEqualTo(expectedNextStart.toString());
        assertThat(newSheet.get("end_date").toString()).isEqualTo(expectedNextEnd.toString());

        String newFlowSheetId = newSheet.get("id").toString();

        // ── Step 8: Verify recurring entry was auto-populated into the new sheet ──
        Integer recurringEntryCount = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM entries " +
                "WHERE flow_sheet_id = ? AND category_id = ? AND amount = 150.00 AND is_deleted = FALSE",
                Integer.class,
                UUID.fromString(newFlowSheetId),
                UUID.fromString(expenseCategoryId));
        assertThat(recurringEntryCount).isEqualTo(1);

        // Verify the entry date is the start of the new period
        String entryDate = jdbcTemplate.queryForObject(
                "SELECT entry_date FROM entries " +
                "WHERE flow_sheet_id = ? AND category_id = ? AND amount = 150.00 AND is_deleted = FALSE",
                String.class,
                UUID.fromString(newFlowSheetId),
                UUID.fromString(expenseCategoryId));
        assertThat(entryDate).isEqualTo(expectedNextStart.toString());

        // ── Step 9: Verify projection was carried over to the new FlowSheet ───────
        Integer projectionCount = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM category_projections " +
                "WHERE flow_sheet_id = ? AND category_id = ? AND projected_amount = 200.00",
                Integer.class,
                UUID.fromString(newFlowSheetId),
                UUID.fromString(expenseCategoryId));
        assertThat(projectionCount).isEqualTo(1);
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
