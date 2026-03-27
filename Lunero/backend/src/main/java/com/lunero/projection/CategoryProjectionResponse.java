package com.lunero.projection;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record CategoryProjectionResponse(
        UUID id,
        UUID flowSheetId,
        UUID userId,
        UUID categoryId,
        BigDecimal projectedAmount,
        String currency,
        Instant createdAt,
        Instant updatedAt
) {
    public static CategoryProjectionResponse from(CategoryProjectionEntity e) {
        return new CategoryProjectionResponse(
                e.getId(),
                e.getFlowSheetId(),
                e.getUserId(),
                e.getCategoryId(),
                e.getProjectedAmount(),
                e.getCurrency(),
                e.getCreatedAt(),
                e.getUpdatedAt()
        );
    }
}
