package com.lunero.trend;

import com.lunero.common.SecurityUtils;
import com.lunero.entry.EntryEntity;
import com.lunero.entry.EntryResponse;
import com.lunero.user.UserEntity;
import com.lunero.user.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * REST controller for Trend endpoints.
 *
 * GET /api/v1/trends?view=weekly&from=&to=&categoryId=   → TrendData
 * GET /api/v1/trends/:dataPointId/breakdown?categoryId=  → Entry[]
 */
@RestController
@RequiredArgsConstructor
public class TrendController {

    private final TrendService trendService;
    private final UserService  userService;

    /**
     * Returns aggregated trend data for the authenticated user.
     *
     * @param view       "weekly" | "monthly" | "yearly"
     * @param from       inclusive start date (ISO, required for weekly/monthly)
     * @param to         inclusive end date (ISO, required for weekly/monthly)
     * @param categoryId optional category filter
     */
    @GetMapping("/api/v1/trends")
    public ResponseEntity<TrendData> getTrends(
            @RequestParam String view,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) UUID categoryId) {

        UUID userId = resolveUserId();
        TrendData data = trendService.getTrends(userId, view, from, to, categoryId);
        return ResponseEntity.ok(data);
    }

    /**
     * Returns all entries contributing to a specific trend period.
     *
     * @param dataPointId composite key: {@code <view>_<startDate>_<endDate>}
     * @param categoryId  optional category filter
     */
    @GetMapping("/api/v1/trends/{dataPointId}/breakdown")
    public ResponseEntity<List<EntryResponse>> getBreakdown(
            @PathVariable String dataPointId,
            @RequestParam(required = false) UUID categoryId) {

        UUID userId = resolveUserId();
        List<EntryEntity> entries = trendService.getBreakdown(userId, dataPointId, categoryId);
        List<EntryResponse> response = entries.stream()
                .map(e -> EntryResponse.from(e, null))
                .toList();
        return ResponseEntity.ok(response);
    }

    private UUID resolveUserId() {
        String clerkUserId = SecurityUtils.getCurrentUserId();
        UserEntity user = userService.getOrCreateUser(clerkUserId);
        return user.getId();
    }
}
