package com.lunero.entry;

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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
class EntryControllerTest {

    @Mock private EntryService entryService;
    @Mock private UserService userService;

    private MockMvc mockMvc;
    private ObjectMapper objectMapper;

    private final String clerkUserId = "clerk_entry_test";
    private final UUID userId        = UUID.randomUUID();
    private final UUID sheetId       = UUID.randomUUID();
    private final UUID entryId       = UUID.randomUUID();
    private final UUID categoryId    = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        EntryController controller = new EntryController(entryService, userService);
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
        objectMapper = new ObjectMapper();
        objectMapper.registerModule(new JavaTimeModule());

        ClerkAuthentication auth = new ClerkAuthentication(clerkUserId, List.of());
        SecurityContextHolder.getContext().setAuthentication(auth);

        UserEntity user = UserEntity.builder().id(userId).clerkUserId(clerkUserId).displayName("Test").build();
        lenient().when(userService.getOrCreateUser(clerkUserId)).thenReturn(user);
    }

    // ── GET /api/v1/flowsheets/:id/entries ───────────────────────────────────

    @Test
    void listEntries_returns200() throws Exception {
        EntryEntity entry = buildEntry(entryId, "income", new BigDecimal("500"));
        when(entryService.listEntries(userId, sheetId)).thenReturn(List.of(entry));

        mockMvc.perform(get("/api/v1/flowsheets/" + sheetId + "/entries"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(entryId.toString()))
                .andExpect(jsonPath("$[0].entryType").value("income"));
    }

    @Test
    void listEntries_returns404_whenSheetNotOwned() throws Exception {
        when(entryService.listEntries(userId, sheetId))
                .thenThrow(new EntityNotFoundException("FlowSheet", sheetId));

        mockMvc.perform(get("/api/v1/flowsheets/" + sheetId + "/entries"))
                .andExpect(status().isNotFound());
    }

    // ── POST /api/v1/entries ─────────────────────────────────────────────────

    @Test
    void createEntry_returns201() throws Exception {
        EntryResponse response = buildResponse(entryId, "income", new BigDecimal("1000"), new BigDecimal("1000"));
        when(entryService.createEntry(eq(userId), any())).thenReturn(response);

        String body = String.format("""
                {
                  "flowSheetId": "%s",
                  "entryType": "income",
                  "category": "%s",
                  "amount": 1000,
                  "currency": "USD",
                  "entryDate": "2024-01-15"
                }
                """, sheetId, categoryId);

        mockMvc.perform(post("/api/v1/entries")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(entryId.toString()))
                .andExpect(jsonPath("$.availableBalance").value(1000.0));
    }

    @Test
    void createEntry_returns400_whenAmountMissing() throws Exception {
        String body = String.format("""
                {
                  "flowSheetId": "%s",
                  "entryType": "income",
                  "category": "%s",
                  "currency": "USD",
                  "entryDate": "2024-01-15"
                }
                """, sheetId, categoryId);

        mockMvc.perform(post("/api/v1/entries")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest());
    }

    @Test
    void createEntry_returns400_whenAmountIsZero() throws Exception {
        when(entryService.createEntry(eq(userId), any()))
                .thenThrow(new ValidationException("amount must be greater than 0"));

        String body = String.format("""
                {
                  "flowSheetId": "%s",
                  "entryType": "expense",
                  "category": "%s",
                  "amount": 0,
                  "currency": "USD",
                  "entryDate": "2024-01-15"
                }
                """, sheetId, categoryId);

        mockMvc.perform(post("/api/v1/entries")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest());
    }

    @Test
    void createEntry_returns422_whenSheetIsLocked() throws Exception {
        when(entryService.createEntry(eq(userId), any()))
                .thenThrow(new BusinessRuleException("FlowSheet is locked for editing."));

        String body = String.format("""
                {
                  "flowSheetId": "%s",
                  "entryType": "expense",
                  "category": "%s",
                  "amount": 100,
                  "currency": "USD",
                  "entryDate": "2024-01-15"
                }
                """, sheetId, categoryId);

        mockMvc.perform(post("/api/v1/entries")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isUnprocessableEntity());
    }

    // ── PATCH /api/v1/entries/:id ────────────────────────────────────────────

    @Test
    void updateEntry_returns200() throws Exception {
        EntryResponse response = buildResponse(entryId, "expense", new BigDecimal("300"), new BigDecimal("700"));
        when(entryService.updateEntry(eq(userId), eq(entryId), any())).thenReturn(response);

        String body = """
                {"amount": 300}
                """;

        mockMvc.perform(patch("/api/v1/entries/" + entryId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.amount").value(300.0))
                .andExpect(jsonPath("$.availableBalance").value(700.0));
    }

    @Test
    void updateEntry_returns400_whenAmountIsNegative() throws Exception {
        when(entryService.updateEntry(eq(userId), eq(entryId), any()))
                .thenThrow(new ValidationException("amount must be greater than 0"));

        String body = """
                {"amount": -50}
                """;

        mockMvc.perform(patch("/api/v1/entries/" + entryId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest());
    }

    @Test
    void updateEntry_returns422_whenSheetIsLocked() throws Exception {
        when(entryService.updateEntry(eq(userId), eq(entryId), any()))
                .thenThrow(new BusinessRuleException("FlowSheet is locked for editing."));

        String body = """
                {"amount": 100}
                """;

        mockMvc.perform(patch("/api/v1/entries/" + entryId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isUnprocessableEntity());
    }

    @Test
    void updateEntry_returns404_whenNotOwned() throws Exception {
        when(entryService.updateEntry(eq(userId), eq(entryId), any()))
                .thenThrow(new EntityNotFoundException("Entry", entryId));

        String body = """
                {"amount": 100}
                """;

        mockMvc.perform(patch("/api/v1/entries/" + entryId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isNotFound());
    }

    // ── DELETE /api/v1/entries/:id ───────────────────────────────────────────

    @Test
    void deleteEntry_returns200WithBalance() throws Exception {
        when(entryService.deleteEntry(userId, entryId)).thenReturn(new BigDecimal("800"));

        mockMvc.perform(delete("/api/v1/entries/" + entryId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.availableBalance").value(800.0));
    }

    @Test
    void deleteEntry_returns422_whenSheetIsLocked() throws Exception {
        when(entryService.deleteEntry(userId, entryId))
                .thenThrow(new BusinessRuleException("FlowSheet is locked for editing."));

        mockMvc.perform(delete("/api/v1/entries/" + entryId))
                .andExpect(status().isUnprocessableEntity());
    }

    @Test
    void deleteEntry_returns404_whenNotOwned() throws Exception {
        when(entryService.deleteEntry(userId, entryId))
                .thenThrow(new EntityNotFoundException("Entry", entryId));

        mockMvc.perform(delete("/api/v1/entries/" + entryId))
                .andExpect(status().isNotFound());
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private EntryEntity buildEntry(UUID id, String type, BigDecimal amount) {
        return EntryEntity.builder()
                .id(id).flowSheetId(sheetId).userId(userId)
                .entryType(type).category("TestCategory")
                .amount(amount).currency("USD")
                .entryDate(LocalDate.now()).isDeleted(false)
                .createdAt(Instant.now()).updatedAt(Instant.now())
                .build();
    }

    private EntryResponse buildResponse(UUID id, String type, BigDecimal amount, BigDecimal balance) {
        return new EntryResponse(
                id, sheetId, userId, type, categoryId.toString(),
                amount, "USD", null, null,
                LocalDate.now(), null, false, null,
                Instant.now(), Instant.now(), balance
        );
    }
}
