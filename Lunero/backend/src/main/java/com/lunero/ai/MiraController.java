package com.lunero.ai;

import com.lunero.common.SecurityUtils;
import com.lunero.user.UserEntity;
import com.lunero.user.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * REST controller for Mira AI endpoints.
 *
 * POST   /api/v1/ai/query              → MiraQueryResponse | OnboardingSummaryResponse
 * GET    /api/v1/ai/alerts             → AlertResponse[]
 * POST   /api/v1/ai/alerts/:id/dismiss → 204
 */
@RestController
@RequiredArgsConstructor
public class MiraController {

    private final MiraService miraService;
    private final UserService userService;

    /**
     * Sends a natural-language message to Mira.
     * In onboarding mode returns an OnboardingSummaryResponse; otherwise MiraQueryResponse.
     */
    @PostMapping("/api/v1/ai/query")
    public ResponseEntity<Object> query(@Valid @RequestBody MiraQueryRequest request) {
        UUID userId = resolveUserId();
        Object response = miraService.query(userId, request.message());
        return ResponseEntity.ok(response);
    }

    /**
     * Returns proactive alerts for the authenticated user.
     * Respects overspendAlerts=false and dismissed alerts.
     */
    @GetMapping("/api/v1/ai/alerts")
    public ResponseEntity<List<AlertResponse>> getAlerts() {
        UUID userId = resolveUserId();
        List<AlertResponse> alerts = miraService.checkProactiveAlerts(userId);
        return ResponseEntity.ok(alerts);
    }

    /**
     * Dismisses an alert so it is not re-surfaced for the same period.
     */
    @PostMapping("/api/v1/ai/alerts/{id}/dismiss")
    public ResponseEntity<Void> dismissAlert(@PathVariable UUID id) {
        UUID userId = resolveUserId();
        miraService.dismissAlert(userId, id);
        return ResponseEntity.noContent().build();
    }

    private UUID resolveUserId() {
        String clerkUserId = SecurityUtils.getCurrentUserId();
        UserEntity user = userService.getOrCreateUser(clerkUserId);
        return user.getId();
    }
}
