package com.lunero.projection;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.lunero.common.GlobalExceptionHandler;
import com.lunero.common.exception.EntityNotFoundException;
import com.lunero.common.exception.ValidationException;
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

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
class ProjectionControllerTest {

    @Mock private ProjectionService projectionService;
    @Mock private UserService userService;

    private MockMvc mockMvc;
    private ObjectMapper objectMapper;

    private final String clerkUserId = "clerk_proj_test";
    private final UUID userId     = UUID.randomUUID();
    private final UUID sheetId    = UUID.randomUUID();
    private final UUID categoryId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        ProjectionController controller = new ProjectionController(projectionService, userService);
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
        objectMapper = new ObjectMapper();
        objectMapper.registerModule(new JavaTimeModule());

        ClerkAuthentication auth = new ClerkAuthentication(clerkUserId, List.of());
        SecurityContextHolder.getContext().setAuthentication(auth);

        UserEntity user = UserEntity.builder().id(userId).clerkUserId(clerkUserId).displayName("Test").build();
        when(userService.getOrCreateUser(clerkUserId)).thenReturn(user);
    }

    // ── GET /api/v1/flowsheets/:id/projections ────────────────────────────────

    @Test
    void getProjections_returns200_withList() throws Exception {
        CategoryProjectionEntity proj = buildProjection(new BigDecimal("500"));
        when(projectionService.getProjections(userId, sheetId)).thenReturn(List.of(proj));

        mockMvc.perform(get("/api/v1/flowsheets/{sheetId}/projections", sheetId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].projectedAmount").value(500.0))
                .andExpect(jsonPath("$[0].currency").value("USD"));
    }

    @Test
    void getProjections_returns404_whenSheetNotOwned() throws Exception {
        when(projectionService.getProjections(userId, sheetId))
                .thenThrow(new EntityNotFoundException("FlowSheet", sheetId));

        mockMvc.perform(get("/api/v1/flowsheets/{sheetId}/projections", sheetId))
                .andExpect(status().isNotFound());
    }

    // ── PUT /api/v1/flowsheets/:id/projections/:categoryId ────────────────────

    @Test
    void upsertProjection_returns200_withSavedProjection() throws Exception {
        CategoryProjectionEntity saved = buildProjection(new BigDecimal("300"));
        when(projectionService.upsertProjection(eq(userId), eq(sheetId), eq(categoryId),
                any(BigDecimal.class), eq("USD"))).thenReturn(saved);

        String body = objectMapper.writeValueAsString(new UpsertProjectionRequest(new BigDecimal("300"), "USD"));

        mockMvc.perform(put("/api/v1/flowsheets/{sheetId}/projections/{categoryId}", sheetId, categoryId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.projectedAmount").value(300.0));
    }

    @Test
    void upsertProjection_returns400_whenAmountIsZero() throws Exception {
        String body = objectMapper.writeValueAsString(new UpsertProjectionRequest(BigDecimal.ZERO, "USD"));

        mockMvc.perform(put("/api/v1/flowsheets/{sheetId}/projections/{categoryId}", sheetId, categoryId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest());
    }

    @Test
    void upsertProjection_returns400_whenServiceThrowsValidation() throws Exception {
        when(projectionService.upsertProjection(any(), any(), any(), any(), any()))
                .thenThrow(new ValidationException("projectedAmount must be greater than 0"));

        String body = objectMapper.writeValueAsString(new UpsertProjectionRequest(new BigDecimal("100"), "USD"));

        mockMvc.perform(put("/api/v1/flowsheets/{sheetId}/projections/{categoryId}", sheetId, categoryId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest());
    }

    // ── DELETE /api/v1/flowsheets/:id/projections/:categoryId ─────────────────

    @Test
    void deleteProjection_returns204() throws Exception {
        doNothing().when(projectionService).deleteProjection(userId, sheetId, categoryId);

        mockMvc.perform(delete("/api/v1/flowsheets/{sheetId}/projections/{categoryId}", sheetId, categoryId))
                .andExpect(status().isNoContent());

        verify(projectionService).deleteProjection(userId, sheetId, categoryId);
    }

    @Test
    void deleteProjection_returns404_whenNotFound() throws Exception {
        doThrow(new EntityNotFoundException("Projection not found for category", categoryId))
                .when(projectionService).deleteProjection(userId, sheetId, categoryId);

        mockMvc.perform(delete("/api/v1/flowsheets/{sheetId}/projections/{categoryId}", sheetId, categoryId))
                .andExpect(status().isNotFound());
    }

    // ── GET /api/v1/flowsheets/:id/projections/summary ────────────────────────

    @Test
    void getSummary_returns200_withSummary() throws Exception {
        ProjectionSummaryResponse summary = new ProjectionSummaryResponse(
                sheetId,
                List.of(new ProjectionSummaryResponse.CategoryRow(
                        categoryId, "Groceries", "expense",
                        new BigDecimal("500"), new BigDecimal("300"), "#C86D5A")),
                Map.of("expense", new ProjectionSummaryResponse.EntryTypeRow(
                        new BigDecimal("500"), new BigDecimal("300"), "#C86D5A")),
                new ProjectionSummaryResponse.OverallRow(
                        new BigDecimal("500"), new BigDecimal("300"), "#C86D5A")
        );
        when(projectionService.getProjectionSummary(userId, sheetId)).thenReturn(summary);

        mockMvc.perform(get("/api/v1/flowsheets/{sheetId}/projections/summary", sheetId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.flowSheetId").value(sheetId.toString()))
                .andExpect(jsonPath("$.byCategory[0].categoryName").value("Groceries"))
                .andExpect(jsonPath("$.overall.projected").value(500.0));
    }

    @Test
    void getSummary_returns404_whenSheetNotOwned() throws Exception {
        when(projectionService.getProjectionSummary(userId, sheetId))
                .thenThrow(new EntityNotFoundException("FlowSheet", sheetId));

        mockMvc.perform(get("/api/v1/flowsheets/{sheetId}/projections/summary", sheetId))
                .andExpect(status().isNotFound());
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    private CategoryProjectionEntity buildProjection(BigDecimal amount) {
        return CategoryProjectionEntity.builder()
                .id(UUID.randomUUID())
                .flowSheetId(sheetId)
                .userId(userId)
                .categoryId(categoryId)
                .projectedAmount(amount)
                .currency("USD")
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();
    }
}
