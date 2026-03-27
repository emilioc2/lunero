package com.lunero.entry;

import com.lunero.common.SecurityUtils;
import com.lunero.user.UserEntity;
import com.lunero.user.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * REST controller for Entry endpoints.
 *
 * GET    /api/v1/flowsheets/:id/entries  → list entries for a FlowSheet
 * POST   /api/v1/entries                 → create entry
 * PATCH  /api/v1/entries/:id             → update entry
 * DELETE /api/v1/entries/:id             → soft-delete entry
 */
@RestController
@RequiredArgsConstructor
public class EntryController {

    private final EntryService entryService;
    private final UserService userService;

    @GetMapping("/api/v1/flowsheets/{id}/entries")
    public ResponseEntity<List<EntryResponse>> listEntries(@PathVariable UUID id) {
        UUID userId = resolveUserId();
        List<EntryResponse> entries = entryService.listEntries(userId, id)
                .stream()
                .map(e -> EntryResponse.from(e, null))
                .toList();
        return ResponseEntity.ok(entries);
    }

    @PostMapping("/api/v1/entries")
    public ResponseEntity<EntryResponse> createEntry(@Valid @RequestBody CreateEntryRequest request) {
        UUID userId = resolveUserId();
        EntryResponse response = entryService.createEntry(userId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PatchMapping("/api/v1/entries/{id}")
    public ResponseEntity<EntryResponse> updateEntry(
            @PathVariable UUID id,
            @RequestBody UpdateEntryRequest request) {
        UUID userId = resolveUserId();
        EntryResponse response = entryService.updateEntry(userId, id, request);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/api/v1/entries/{id}")
    public ResponseEntity<Map<String, Object>> deleteEntry(@PathVariable UUID id) {
        UUID userId = resolveUserId();
        BigDecimal balance = entryService.deleteEntry(userId, id);
        return ResponseEntity.ok(Map.of("availableBalance", balance));
    }

    private UUID resolveUserId() {
        String clerkUserId = SecurityUtils.getCurrentUserId();
        UserEntity user = userService.getOrCreateUser(clerkUserId);
        return user.getId();
    }
}
