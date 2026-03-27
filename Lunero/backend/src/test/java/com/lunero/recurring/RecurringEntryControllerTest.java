package com.lunero.recurring;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.lunero.common.GlobalExceptionHandler;
import com.lunero.common.SecurityUtils;
import com.lunero.common.exception.EntityNotFoundException;
import com.lunero.common.exception.ValidationException;
import com.lunero.security.ClerkAuthentication;
import com.lunero.user.UserEntity;
import com.lunero.user.UserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
class RecurringEntryControllerTest {

    @Mock private RecurringEntryService recurringEntryService;
    @Mock private UserService userService;

    private MockMvc mockMvc;
    private final ObjectMapper objectMapper = new ObjectMapper();

    private final UUID userId = UUID.randomUUID();
    private final UUID entryId = UUID.randomUUID();
    private final UUID categoryId = UUID.randomUUID();
    private final String clerkId = "clerk_test_user";

    @BeforeEach
    void setUp() {
        RecurringEntryController controller = new RecurringEntryController(recurringEntryService, userService);
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();

        UserEntity user = UserEntity.builder().id(userId).clerkUserId(clerkId)
                .displayName("Test").defaultCurrency("USD").build();
        lenient().when(userService.getOrCreateUser(clerkId)).thenReturn(user);
    }

    @Test
    void list_returns200WithEntries() throws Exception {
        RecurringEntryEntity entity = buildEntity("monthly", false);
        when(recurringEntryService.list(userId)).thenReturn(List.of(entity));

        try (MockedStatic<SecurityUtils> su = mockStatic(SecurityUtils.class)) {
            su.when(SecurityUtils::getCurrentUserId).thenReturn(clerkId);

            mockMvc.perform(get("/api/v1/recurring"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$[0].cadence").value("monthly"));
        }
    }

    @Test
    void create_returns201() throws Exception {
        RecurringEntryEntity saved = buildEntity("weekly", false);
        when(recurringEntryService.create(eq(userId), any())).thenReturn(saved);

        String body = objectMapper.writeValueAsString(
                new CreateRecurringEntryRequest("expense", categoryId,
                        new BigDecimal("150"), "USD", "weekly", "groceries"));

        try (MockedStatic<SecurityUtils> su = mockStatic(SecurityUtils.class)) {
            su.when(SecurityUtils::getCurrentUserId).thenReturn(clerkId);

            mockMvc.perform(post("/api/v1/recurring")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.cadence").value("weekly"));
        }
    }

    @Test
    void create_returns400_whenValidationFails() throws Exception {
        when(recurringEntryService.create(eq(userId), any()))
                .thenThrow(new ValidationException("amount must be greater than 0"));

        String body = objectMapper.writeValueAsString(
                new CreateRecurringEntryRequest("expense", categoryId,
                        new BigDecimal("0"), "USD", "monthly", null));

        try (MockedStatic<SecurityUtils> su = mockStatic(SecurityUtils.class)) {
            su.when(SecurityUtils::getCurrentUserId).thenReturn(clerkId);

            mockMvc.perform(post("/api/v1/recurring")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isBadRequest());
        }
    }

    @Test
    void update_returns200() throws Exception {
        RecurringEntryEntity updated = buildEntity("daily", false);
        when(recurringEntryService.update(eq(userId), eq(entryId), any())).thenReturn(updated);

        String body = objectMapper.writeValueAsString(
                new UpdateRecurringEntryRequest(new BigDecimal("200"), null, "daily", null));

        try (MockedStatic<SecurityUtils> su = mockStatic(SecurityUtils.class)) {
            su.when(SecurityUtils::getCurrentUserId).thenReturn(clerkId);

            mockMvc.perform(patch("/api/v1/recurring/" + entryId)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.cadence").value("daily"));
        }
    }

    @Test
    void update_returns404_whenNotFound() throws Exception {
        when(recurringEntryService.update(eq(userId), eq(entryId), any()))
                .thenThrow(new EntityNotFoundException("RecurringEntry", entryId));

        String body = objectMapper.writeValueAsString(
                new UpdateRecurringEntryRequest(null, null, null, null));

        try (MockedStatic<SecurityUtils> su = mockStatic(SecurityUtils.class)) {
            su.when(SecurityUtils::getCurrentUserId).thenReturn(clerkId);

            mockMvc.perform(patch("/api/v1/recurring/" + entryId)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isNotFound());
        }
    }

    @Test
    void delete_returns204() throws Exception {
        doNothing().when(recurringEntryService).delete(userId, entryId);

        try (MockedStatic<SecurityUtils> su = mockStatic(SecurityUtils.class)) {
            su.when(SecurityUtils::getCurrentUserId).thenReturn(clerkId);

            mockMvc.perform(delete("/api/v1/recurring/" + entryId))
                    .andExpect(status().isNoContent());
        }
    }

    @Test
    void pause_returns200() throws Exception {
        RecurringEntryEntity paused = buildEntity("monthly", true);
        when(recurringEntryService.pause(userId, entryId)).thenReturn(paused);

        try (MockedStatic<SecurityUtils> su = mockStatic(SecurityUtils.class)) {
            su.when(SecurityUtils::getCurrentUserId).thenReturn(clerkId);

            mockMvc.perform(post("/api/v1/recurring/" + entryId + "/pause"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.isPaused").value(true));
        }
    }

    @Test
    void resume_returns200() throws Exception {
        RecurringEntryEntity resumed = buildEntity("monthly", false);
        when(recurringEntryService.resume(userId, entryId)).thenReturn(resumed);

        try (MockedStatic<SecurityUtils> su = mockStatic(SecurityUtils.class)) {
            su.when(SecurityUtils::getCurrentUserId).thenReturn(clerkId);

            mockMvc.perform(post("/api/v1/recurring/" + entryId + "/resume"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.isPaused").value(false));
        }
    }

    @Test
    void suggestions_returns200() throws Exception {
        RecurringSuggestion suggestion = new RecurringSuggestion(categoryId, new BigDecimal("500"), 3L);
        when(recurringEntryService.getSuggestions(userId)).thenReturn(List.of(suggestion));

        try (MockedStatic<SecurityUtils> su = mockStatic(SecurityUtils.class)) {
            su.when(SecurityUtils::getCurrentUserId).thenReturn(clerkId);

            mockMvc.perform(get("/api/v1/recurring/suggestions"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$[0].periodCount").value(3));
        }
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    private RecurringEntryEntity buildEntity(String cadence, boolean paused) {
        return RecurringEntryEntity.builder()
                .id(entryId).userId(userId)
                .entryType("expense").categoryId(categoryId)
                .amount(new BigDecimal("100")).currency("USD")
                .cadence(cadence).isPaused(paused).isDeleted(false)
                .createdAt(Instant.now()).updatedAt(Instant.now())
                .build();
    }
}
