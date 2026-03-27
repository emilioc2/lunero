package com.lunero.flowsheet;

import com.lunero.common.SecurityUtils;
import com.lunero.user.UserEntity;
import com.lunero.user.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/**
 * REST controller for FlowSheet endpoints.
 *
 * GET    /api/v1/flowsheets/active      → active FlowSheet with computed balances
 * GET    /api/v1/flowsheets             → paginated list, most recent first
 * GET    /api/v1/flowsheets/:id         → single FlowSheet with computed balances
 * POST   /api/v1/flowsheets             → create new FlowSheet
 * POST   /api/v1/flowsheets/:id/unlock  → unlock a past FlowSheet for editing
 */
@RestController
@RequestMapping("/api/v1/flowsheets")
@RequiredArgsConstructor
public class FlowSheetController {

    private final FlowSheetService flowSheetService;
    private final UserService userService;

    @GetMapping("/active")
    public ResponseEntity<FlowSheetResponse> getActive() {
        UUID userId = resolveUserId();
        return ResponseEntity.ok(flowSheetService.getActiveFlowSheet(userId));
    }

    @GetMapping
    public ResponseEntity<Page<FlowSheetResponse>> getAll(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        UUID userId = resolveUserId();
        return ResponseEntity.ok(flowSheetService.getAllFlowSheets(userId, page, size));
    }

    @GetMapping("/{id}")
    public ResponseEntity<FlowSheetResponse> getById(@PathVariable UUID id) {
        UUID userId = resolveUserId();
        return ResponseEntity.ok(flowSheetService.getFlowSheetById(userId, id));
    }

    @PostMapping
    public ResponseEntity<FlowSheetResponse> create(@Valid @RequestBody CreateFlowSheetRequest request) {
        UUID userId = resolveUserId();
        FlowSheetEntity created = flowSheetService.createFlowSheet(userId, request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(FlowSheetResponse.from(created));
    }

    @PostMapping("/{id}/unlock")
    public ResponseEntity<FlowSheetResponse> unlock(@PathVariable UUID id) {
        UUID userId = resolveUserId();
        FlowSheetEntity unlocked = flowSheetService.unlockPastSheet(userId, id);
        return ResponseEntity.ok(FlowSheetResponse.from(unlocked));
    }

    private UUID resolveUserId() {
        String clerkUserId = SecurityUtils.getCurrentUserId();
        UserEntity user = userService.getOrCreateUser(clerkUserId);
        return user.getId();
    }
}
