package com.lunero.recurring;

import com.lunero.common.SecurityUtils;
import com.lunero.user.UserEntity;
import com.lunero.user.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * REST controller for Recurring Entry endpoints.
 *
 * GET    /api/v1/recurring                  → list all recurring entries
 * POST   /api/v1/recurring                  → create recurring entry
 * PATCH  /api/v1/recurring/:id              → update recurring entry
 * DELETE /api/v1/recurring/:id              → soft-delete recurring entry
 * POST   /api/v1/recurring/:id/pause        → pause recurring entry
 * POST   /api/v1/recurring/:id/resume       → resume recurring entry
 * GET    /api/v1/recurring/suggestions      → get recurring entry suggestions
 */
@RestController
@RequestMapping("/api/v1/recurring")
@RequiredArgsConstructor
public class RecurringEntryController {

    private final RecurringEntryService recurringEntryService;
    private final UserService userService;

    @GetMapping
    public ResponseEntity<List<RecurringEntryResponse>> list() {
        UUID userId = resolveUserId();
        List<RecurringEntryResponse> result = recurringEntryService.list(userId)
                .stream()
                .map(RecurringEntryResponse::from)
                .toList();
        return ResponseEntity.ok(result);
    }

    @PostMapping
    public ResponseEntity<RecurringEntryResponse> create(
            @Valid @RequestBody CreateRecurringEntryRequest request) {
        UUID userId = resolveUserId();
        RecurringEntryEntity saved = recurringEntryService.create(userId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(RecurringEntryResponse.from(saved));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<RecurringEntryResponse> update(
            @PathVariable UUID id,
            @RequestBody UpdateRecurringEntryRequest request) {
        UUID userId = resolveUserId();
        RecurringEntryEntity updated = recurringEntryService.update(userId, id, request);
        return ResponseEntity.ok(RecurringEntryResponse.from(updated));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        UUID userId = resolveUserId();
        recurringEntryService.delete(userId, id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/pause")
    public ResponseEntity<RecurringEntryResponse> pause(@PathVariable UUID id) {
        UUID userId = resolveUserId();
        RecurringEntryEntity updated = recurringEntryService.pause(userId, id);
        return ResponseEntity.ok(RecurringEntryResponse.from(updated));
    }

    @PostMapping("/{id}/resume")
    public ResponseEntity<RecurringEntryResponse> resume(@PathVariable UUID id) {
        UUID userId = resolveUserId();
        RecurringEntryEntity updated = recurringEntryService.resume(userId, id);
        return ResponseEntity.ok(RecurringEntryResponse.from(updated));
    }

    @GetMapping("/suggestions")
    public ResponseEntity<List<RecurringSuggestion>> suggestions() {
        UUID userId = resolveUserId();
        return ResponseEntity.ok(recurringEntryService.getSuggestions(userId));
    }

    private UUID resolveUserId() {
        String clerkUserId = SecurityUtils.getCurrentUserId();
        UserEntity user = userService.getOrCreateUser(clerkUserId);
        return user.getId();
    }
}
