package com.lunero.integration;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.lunero.security.ClerkAuthentication;
import com.lunero.security.ClerkJwtFilter;
import nl.martijndwars.webpush.PushService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
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

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Security review integration tests verifying:
 *   1. All /api/v1/** endpoints require valid JWT (Property 24)
 *   2. No cross-user data leakage (Property 25)
 *   3. Audit log is populated for data mutations
 *
 * Validates: Requirements 13.2, 13.3, 13.4
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("integration-test")
@Sql(scripts = "/schema-integration.sql",
     executionPhase = Sql.ExecutionPhase.BEFORE_TEST_CLASS)
class SecurityReviewTest {

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

    private static final String USER_A_CLERK_ID = "clerk_security_user_a";
    private static final String USER_B_CLERK_ID = "clerk_security_user_b";

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

    // ── Helpers ──────────────────────────────────────────────────────────────

    private RequestPostProcessor clerkAuth(String clerkUserId) {
        ClerkAuthentication auth = new ClerkAuthentication(
                clerkUserId,
                List.of(new SimpleGrantedAuthority("ROLE_USER"))
        );
        return SecurityMockMvcRequestPostProcessors.authentication(auth);
    }

    private String findCategoryId(String clerkUserId, String entryType) throws Exception {
        mockMvc.perform(get("/api/v1/profile").with(clerkAuth(clerkUserId)))
                .andExpect(status().isOk());

        return jdbcTemplate.queryForObject(
                "SELECT CAST(c.id AS VARCHAR) FROM categories c " +
                "JOIN users u ON c.user_id = u.id " +
                "WHERE u.clerk_user_id = ? AND c.entry_type = ? AND c.is_default = TRUE LIMIT 1",
                String.class,
                clerkUserId, entryType
        );
    }

    private String setupUserWithFlowSheetAndEntry(String clerkUserId) throws Exception {
        mockMvc.perform(get("/api/v1/profile").with(clerkAuth(clerkUserId)))
                .andExpect(status().isOk());

        LocalDate start = LocalDate.now();
        LocalDate end = start.plusMonths(1).minusDays(1);
        String flowSheetBody = String.format("""
                {
                  "periodType": "monthly",
                  "startDate": "%s",
                  "endDate": "%s"
                }
                """, start, end);

        MvcResult fsResult = mockMvc.perform(post("/api/v1/flowsheets")
                        .with(clerkAuth(clerkUserId))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(flowSheetBody))
                .andExpect(status().isCreated())
                .andReturn();

        String flowSheetId = objectMapper
                .readTree(fsResult.getResponse().getContentAsString())
                .get("id").asText();

        String categoryId = findCategoryId(clerkUserId, "income");
        String entryBody = String.format("""
                {
                  "flowSheetId": "%s",
                  "entryType": "income",
                  "categoryId": "%s",
                  "amount": 1000.00,
                  "currency": "USD",
                  "entryDate": "%s"
                }
                """, flowSheetId, categoryId, start);

        mockMvc.perform(post("/api/v1/entries")
                        .with(clerkAuth(clerkUserId))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(entryBody))
                .andExpect(status().isCreated());

        return flowSheetId;
    }

    // ── Property 24: All endpoints require valid JWT ─────────────────────────

    @Test
    @DisplayName("GET /api/v1/profile without auth → 401")
    void profileRequiresAuth() throws Exception {
        mockMvc.perform(get("/api/v1/profile"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("GET /api/v1/flowsheets/active without auth → 401")
    void activeFlowSheetRequiresAuth() throws Exception {
        mockMvc.perform(get("/api/v1/flowsheets/active"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("GET /api/v1/flowsheets without auth → 401")
    void flowSheetsListRequiresAuth() throws Exception {
        mockMvc.perform(get("/api/v1/flowsheets"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("POST /api/v1/entries without auth → 401")
    void createEntryRequiresAuth() throws Exception {
        mockMvc.perform(post("/api/v1/entries")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"flowSheetId":"00000000-0000-0000-0000-000000000000",
                                 "entryType":"income","categoryId":"00000000-0000-0000-0000-000000000000",
                                 "amount":100,"currency":"USD","entryDate":"2025-01-01"}
                                """))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("GET /api/v1/categories without auth → 401")
    void categoriesRequiresAuth() throws Exception {
        mockMvc.perform(get("/api/v1/categories"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("GET /api/v1/recurring without auth → 401")
    void recurringRequiresAuth() throws Exception {
        mockMvc.perform(get("/api/v1/recurring"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("GET /api/v1/trends?view=monthly without auth → 401")
    void trendsRequiresAuth() throws Exception {
        mockMvc.perform(get("/api/v1/trends").param("view", "monthly"))
                .andExpect(status().isUnauthorized());
    }

    // ── Property 25: No cross-user data leakage ──────────────────────────────

    @Test
    @DisplayName("User A cannot access User B's FlowSheet by ID → 404")
    void crossUserFlowSheetAccessReturns404() throws Exception {
        setupUserWithFlowSheetAndEntry(USER_A_CLERK_ID);
        String userBFlowSheetId = setupUserWithFlowSheetAndEntry(USER_B_CLERK_ID);

        mockMvc.perform(get("/api/v1/flowsheets/" + userBFlowSheetId)
                        .with(clerkAuth(USER_A_CLERK_ID)))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("User A listing FlowSheets sees only their own")
    void flowSheetListIsolation() throws Exception {
        setupUserWithFlowSheetAndEntry(USER_A_CLERK_ID);
        setupUserWithFlowSheetAndEntry(USER_B_CLERK_ID);

        MvcResult result = mockMvc.perform(get("/api/v1/flowsheets")
                        .with(clerkAuth(USER_A_CLERK_ID)))
                .andExpect(status().isOk())
                .andReturn();

        JsonNode page = objectMapper.readTree(result.getResponse().getContentAsString());
        JsonNode content = page.get("content");
        assertThat(content.isArray()).isTrue();
        assertThat(content.size()).isEqualTo(1);
    }

    @Test
    @DisplayName("User A listing entries sees only their own")
    void entryListIsolation() throws Exception {
        String userAFlowSheetId = setupUserWithFlowSheetAndEntry(USER_A_CLERK_ID);
        setupUserWithFlowSheetAndEntry(USER_B_CLERK_ID);

        MvcResult result = mockMvc.perform(get("/api/v1/flowsheets/" + userAFlowSheetId + "/entries")
                        .with(clerkAuth(USER_A_CLERK_ID)))
                .andExpect(status().isOk())
                .andReturn();

        JsonNode entries = objectMapper.readTree(result.getResponse().getContentAsString());
        assertThat(entries.isArray()).isTrue();
        assertThat(entries.size()).isEqualTo(1);
        assertThat(entries.get(0).get("entryType").asText()).isEqualTo("income");
    }

    @Test
    @DisplayName("User A cannot list entries from User B's FlowSheet → 404")
    void crossUserEntryListReturns404() throws Exception {
        setupUserWithFlowSheetAndEntry(USER_A_CLERK_ID);
        String userBFlowSheetId = setupUserWithFlowSheetAndEntry(USER_B_CLERK_ID);

        mockMvc.perform(get("/api/v1/flowsheets/" + userBFlowSheetId + "/entries")
                        .with(clerkAuth(USER_A_CLERK_ID)))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("User A listing categories sees only their own")
    void categoryListIsolation() throws Exception {
        mockMvc.perform(get("/api/v1/profile").with(clerkAuth(USER_A_CLERK_ID)))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/v1/profile").with(clerkAuth(USER_B_CLERK_ID)))
                .andExpect(status().isOk());

        MvcResult resultA = mockMvc.perform(get("/api/v1/categories")
                        .with(clerkAuth(USER_A_CLERK_ID)))
                .andExpect(status().isOk())
                .andReturn();

        MvcResult resultB = mockMvc.perform(get("/api/v1/categories")
                        .with(clerkAuth(USER_B_CLERK_ID)))
                .andExpect(status().isOk())
                .andReturn();

        JsonNode categoriesA = objectMapper.readTree(resultA.getResponse().getContentAsString());
        JsonNode categoriesB = objectMapper.readTree(resultB.getResponse().getContentAsString());

        assertThat(categoriesA.size()).isEqualTo(3);
        assertThat(categoriesB.size()).isEqualTo(3);

        // No category ID overlap between users
        for (int i = 0; i < categoriesA.size(); i++) {
            String catIdA = categoriesA.get(i).get("id").asText();
            for (int j = 0; j < categoriesB.size(); j++) {
                String catIdB = categoriesB.get(j).get("id").asText();
                assertThat(catIdA).isNotEqualTo(catIdB);
            }
        }
    }

    // ── Audit log populated ──────────────────────────────────────────────────

    @Test
    @DisplayName("FlowSheet and entry creation produce audit_log records")
    void auditLogPopulatedAfterMutations() throws Exception {
        setupUserWithFlowSheetAndEntry(USER_A_CLERK_ID);

        // Allow async audit log writes to complete
        Thread.sleep(500);

        Integer flowSheetAuditCount = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM audit_log WHERE entity_type = 'flowsheet' AND action = 'CREATE'",
                Integer.class);
        assertThat(flowSheetAuditCount).isGreaterThanOrEqualTo(1);

        Integer entryAuditCount = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM audit_log WHERE entity_type = 'entry' AND action = 'CREATE'",
                Integer.class);
        assertThat(entryAuditCount).isGreaterThanOrEqualTo(1);
    }

    @Test
    @DisplayName("Audit log entries have correct user_id")
    void auditLogHasCorrectUserId() throws Exception {
        setupUserWithFlowSheetAndEntry(USER_A_CLERK_ID);

        // Allow async audit log writes to complete
        Thread.sleep(500);

        String userAId = jdbcTemplate.queryForObject(
                "SELECT CAST(id AS VARCHAR) FROM users WHERE clerk_user_id = ?",
                String.class,
                USER_A_CLERK_ID);

        Integer otherUserAuditCount = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM audit_log WHERE CAST(user_id AS VARCHAR) != ?",
                Integer.class,
                userAId);
        assertThat(otherUserAuditCount).isEqualTo(0);

        Integer totalAuditCount = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM audit_log",
                Integer.class);
        assertThat(totalAuditCount).isGreaterThanOrEqualTo(2);
    }
}
