package com.lunero.projection;

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
 * REST controller for Budget Projection endpoints.
 *
 * GET    /api/v1/flowsheets/:id/projections              → CategoryProjection[]
 * PUT    /api/v1/flowsheets/:id/projections/:categoryId  → CategoryProjection
 * DELETE /api/v1/flowsheets/:id/projections/:categoryId  → 204
 * GET    /api/v1/flowsheets/:id/projections/summary      → ProjectionSummary
 */
@RestController
@RequestMapping("/api/v1/flowsheets/{flowSheetId}/projections")
@RequiredArgsConstructor
public class ProjectionController {

    private final ProjectionService projectionService;
    private final UserService userService;

    @GetMapping
    public ResponseEntity<List<CategoryProjectionResponse>> getProjections(
            @PathVariable UUID flowSheetId) {
        UUID userId = resolveUserId();
        List<CategoryProjectionResponse> projections = projectionService
                .getProjections(userId, flowSheetId)
                .stream()
                .map(CategoryProjectionResponse::from)
                .toList();
        return ResponseEntity.ok(projections);
    }

    @PutMapping("/{categoryId}")
    public ResponseEntity<CategoryProjectionResponse> upsertProjection(
            @PathVariable UUID flowSheetId,
            @PathVariable UUID categoryId,
            @Valid @RequestBody UpsertProjectionRequest request) {
        UUID userId = resolveUserId();
        CategoryProjectionEntity saved = projectionService.upsertProjection(
                userId, flowSheetId, categoryId, request.projectedAmount(), request.currency());
        return ResponseEntity.ok(CategoryProjectionResponse.from(saved));
    }

    @DeleteMapping("/{categoryId}")
    public ResponseEntity<Void> deleteProjection(
            @PathVariable UUID flowSheetId,
            @PathVariable UUID categoryId) {
        UUID userId = resolveUserId();
        projectionService.deleteProjection(userId, flowSheetId, categoryId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/summary")
    public ResponseEntity<ProjectionSummaryResponse> getSummary(
            @PathVariable UUID flowSheetId) {
        UUID userId = resolveUserId();
        return ResponseEntity.ok(projectionService.getProjectionSummary(userId, flowSheetId));
    }

    private UUID resolveUserId() {
        String clerkUserId = SecurityUtils.getCurrentUserId();
        UserEntity user = userService.getOrCreateUser(clerkUserId);
        return user.getId();
    }
}
