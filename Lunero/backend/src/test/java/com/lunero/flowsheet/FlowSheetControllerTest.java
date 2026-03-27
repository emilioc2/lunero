package com.lunero.flowsheet;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.lunero.common.GlobalExceptionHandler;
import com.lunero.common.exception.BusinessRuleException;
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
import org.springframework.data.domain.PageImpl;
import org.springframework.http.MediaType;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
class FlowSheetControllerTest {

    @Mock private FlowSheetService flowSheetService;
    @Mock private UserService userService;

    private MockMvc mockMvc;
    private ObjectMapper objectMapper;

    private final String clerkUserId = "clerk_fs_test";
    private final UUID userId  = UUID.randomUUID();
    private final UUID sheetId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        FlowSheetController controller = new FlowSheetController(flowSheetService, userService);
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

    // ── GET /api/v1/flowsheets/active ────────────────────────────────────────

    @Test
    void getActive_returns200() throws Exception {
        FlowSheetResponse response = buildResponse(sheetId, "active", false);
        when(flowSheetService.getActiveFlowSheet(userId)).thenReturn(response);

        mockMvc.perform(get("/api/v1/flowsheets/active"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(sheetId.toString()))
                .andExpect(jsonPath("$.status").value("active"))
                .andExpect(jsonPath("$.availableBalance").value(500.0));
    }

    @Test
    void getActive_returns404_whenNoneExists() throws Exception {
        when(flowSheetService.getActiveFlowSheet(userId))
                .thenThrow(new EntityNotFoundException("No active FlowSheet found for user"));

        mockMvc.perform(get("/api/v1/flowsheets/active"))
                .andExpect(status().isNotFound());
    }

    // ── GET /api/v1/flowsheets ───────────────────────────────────────────────

    @Test
    void getAll_returns200WithPage() throws Exception {
        FlowSheetResponse response = buildResponse(sheetId, "archived", true);
        when(flowSheetService.getAllFlowSheets(eq(userId), eq(0), eq(20)))
                .thenReturn(new PageImpl<>(List.of(response)));

        mockMvc.perform(get("/api/v1/flowsheets"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].id").value(sheetId.toString()));
    }

    @Test
    void getAll_acceptsPageParams() throws Exception {
        when(flowSheetService.getAllFlowSheets(eq(userId), eq(1), eq(10)))
                .thenReturn(new PageImpl<>(List.of()));

        mockMvc.perform(get("/api/v1/flowsheets?page=1&size=10"))
                .andExpect(status().isOk());

        verify(flowSheetService).getAllFlowSheets(userId, 1, 10);
    }

    // ── GET /api/v1/flowsheets/:id ───────────────────────────────────────────

    @Test
    void getById_returns200() throws Exception {
        FlowSheetResponse response = buildResponse(sheetId, "archived", true);
        when(flowSheetService.getFlowSheetById(userId, sheetId)).thenReturn(response);

        mockMvc.perform(get("/api/v1/flowsheets/" + sheetId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(sheetId.toString()));
    }

    @Test
    void getById_returns404_whenNotOwned() throws Exception {
        when(flowSheetService.getFlowSheetById(userId, sheetId))
                .thenThrow(new EntityNotFoundException("FlowSheet", sheetId));

        mockMvc.perform(get("/api/v1/flowsheets/" + sheetId))
                .andExpect(status().isNotFound());
    }

    // ── POST /api/v1/flowsheets ──────────────────────────────────────────────

    @Test
    void create_returns201() throws Exception {
        FlowSheetEntity entity = buildEntity(sheetId, "active", false);
        when(flowSheetService.createFlowSheet(eq(userId), any())).thenReturn(entity);

        String body = """
                {"periodType": "monthly"}
                """;

        mockMvc.perform(post("/api/v1/flowsheets")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(sheetId.toString()))
                .andExpect(jsonPath("$.status").value("active"));
    }

    @Test
    void create_returns400_whenPeriodTypeInvalid() throws Exception {
        String body = """
                {"periodType": "quarterly"}
                """;

        mockMvc.perform(post("/api/v1/flowsheets")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest());
    }

    @Test
    void create_returns400_whenPeriodTypeMissing() throws Exception {
        mockMvc.perform(post("/api/v1/flowsheets")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void create_returns400_whenOverlapDetected() throws Exception {
        when(flowSheetService.createFlowSheet(eq(userId), any()))
                .thenThrow(new ValidationException("Overlapping active FlowSheets are not allowed."));

        String body = """
                {"periodType": "monthly"}
                """;

        mockMvc.perform(post("/api/v1/flowsheets")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest());
    }

    // ── POST /api/v1/flowsheets/:id/unlock ───────────────────────────────────

    @Test
    void unlock_returns200() throws Exception {
        FlowSheetEntity entity = buildEntity(sheetId, "archived", false);
        when(flowSheetService.unlockPastSheet(userId, sheetId)).thenReturn(entity);

        mockMvc.perform(post("/api/v1/flowsheets/" + sheetId + "/unlock"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.editLocked").value(false));
    }

    @Test
    void unlock_returns422_whenActiveSheet() throws Exception {
        when(flowSheetService.unlockPastSheet(userId, sheetId))
                .thenThrow(new BusinessRuleException("Active FlowSheets are already editable."));

        mockMvc.perform(post("/api/v1/flowsheets/" + sheetId + "/unlock"))
                .andExpect(status().isUnprocessableEntity());
    }

    @Test
    void unlock_returns404_whenNotOwned() throws Exception {
        when(flowSheetService.unlockPastSheet(userId, sheetId))
                .thenThrow(new EntityNotFoundException("FlowSheet", sheetId));

        mockMvc.perform(post("/api/v1/flowsheets/" + sheetId + "/unlock"))
                .andExpect(status().isNotFound());
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private FlowSheetResponse buildResponse(UUID id, String status, boolean editLocked) {
        return new FlowSheetResponse(
                id, userId, "monthly",
                LocalDate.now().minusMonths(1), LocalDate.now().plusDays(10),
                status, editLocked,
                new BigDecimal("500"), new BigDecimal("1000"),
                new BigDecimal("300"), new BigDecimal("200"),
                Instant.now(), Instant.now()
        );
    }

    private FlowSheetEntity buildEntity(UUID id, String status, boolean editLocked) {
        return FlowSheetEntity.builder()
                .id(id).userId(userId).periodType("monthly")
                .startDate(LocalDate.now().minusMonths(1))
                .endDate(LocalDate.now().plusDays(10))
                .status(status).editLocked(editLocked)
                .createdAt(Instant.now()).updatedAt(Instant.now())
                .build();
    }
}
