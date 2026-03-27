package com.lunero.ai;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.lunero.common.GlobalExceptionHandler;
import com.lunero.security.ClerkAuthentication;
import com.lunero.user.UserEntity;
import com.lunero.user.UserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
class MiraControllerTest {

    @Mock private MiraService miraService;
    @Mock private UserService userService;

    private MockMvc mockMvc;
    private final ObjectMapper objectMapper = new ObjectMapper();

    private final String clerkUserId = "clerk_mira_test";
    private final UUID userId = UUID.randomUUID();
    private final UUID sheetId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        MiraController controller = new MiraController(miraService, userService);
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();

        ClerkAuthentication auth = new ClerkAuthentication(clerkUserId, List.of());
        SecurityContextHolder.getContext().setAuthentication(auth);

        UserEntity user = UserEntity.builder().id(userId).clerkUserId(clerkUserId).displayName("Test").build();
        lenient().when(userService.getOrCreateUser(clerkUserId)).thenReturn(user);
    }

    // ── POST /api/v1/ai/query ─────────────────────────────────────────────────

    @Test
    void query_returns200WithResponse() throws Exception {
        when(miraService.query(eq(userId), eq("How am I doing?")))
                .thenReturn(new MiraQueryResponse("You're on track!"));

        mockMvc.perform(post("/api/v1/ai/query")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new MiraQueryRequest("How am I doing?"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.response").value("You're on track!"));
    }

    @Test
    void query_blankMessage_returns400() throws Exception {
        mockMvc.perform(post("/api/v1/ai/query")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"message\":\"\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void query_missingBody_returns400() throws Exception {
        mockMvc.perform(post("/api/v1/ai/query")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void query_onboardingMode_returnsOnboardingSummary() throws Exception {
        OnboardingSummaryResponse summary = new OnboardingSummaryResponse(
                "I've added 2 entries to your FlowSheet.", List.of()
        );
        when(miraService.query(eq(userId), anyString())).thenReturn(summary);

        mockMvc.perform(post("/api/v1/ai/query")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new MiraQueryRequest("I earn $3000"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("I've added 2 entries to your FlowSheet."));
    }

    // ── GET /api/v1/ai/alerts ─────────────────────────────────────────────────

    @Test
    void getAlerts_returns200WithAlerts() throws Exception {
        AlertResponse alert = new AlertResponse(
                sheetId, MiraService.OVERSPEND_ALERT_TYPE,
                "Your projected balance is negative.", sheetId
        );
        when(miraService.checkProactiveAlerts(userId)).thenReturn(List.of(alert));

        mockMvc.perform(get("/api/v1/ai/alerts"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].alertType").value(MiraService.OVERSPEND_ALERT_TYPE))
                .andExpect(jsonPath("$[0].message").value("Your projected balance is negative."));
    }

    @Test
    void getAlerts_noAlerts_returnsEmptyList() throws Exception {
        when(miraService.checkProactiveAlerts(userId)).thenReturn(List.of());

        mockMvc.perform(get("/api/v1/ai/alerts"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isEmpty());
    }

    // ── POST /api/v1/ai/alerts/:id/dismiss ───────────────────────────────────

    @Test
    void dismissAlert_returns204() throws Exception {
        doNothing().when(miraService).dismissAlert(userId, sheetId);

        mockMvc.perform(post("/api/v1/ai/alerts/{id}/dismiss", sheetId))
                .andExpect(status().isNoContent());

        verify(miraService).dismissAlert(userId, sheetId);
    }
}
