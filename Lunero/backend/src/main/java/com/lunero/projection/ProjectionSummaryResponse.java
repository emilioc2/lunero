package com.lunero.projection;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Response DTO for GET /api/v1/flowsheets/:id/projections/summary.
 * Mirrors the TypeScript ProjectionSummary type in packages/core.
 */
public record ProjectionSummaryResponse(
        UUID flowSheetId,
        List<CategoryRow> byCategory,
        Map<String, EntryTypeRow> byEntryType,
        OverallRow overall
) {
    public record CategoryRow(
            UUID categoryId,
            String categoryName,
            String entryType,
            BigDecimal projectedAmount,
            BigDecimal actualAmount,
            String statusColor
    ) {}

    public record EntryTypeRow(
            BigDecimal projected,
            BigDecimal actual,
            String statusColor
    ) {}

    public record OverallRow(
            BigDecimal projected,
            BigDecimal actual,
            String statusColor
    ) {}
}
