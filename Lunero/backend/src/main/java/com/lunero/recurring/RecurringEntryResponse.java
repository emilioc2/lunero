package com.lunero.recurring;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record RecurringEntryResponse(
        UUID id,
        UUID userId,
        String entryType,
        UUID categoryId,
        BigDecimal amount,
        String currency,
        String cadence,
        String note,
        boolean isPaused,
        boolean isDeleted,
        Instant createdAt,
        Instant updatedAt
) {
    public static RecurringEntryResponse from(RecurringEntryEntity entity) {
        return new RecurringEntryResponse(
                entity.getId(),
                entity.getUserId(),
                entity.getEntryType(),
                entity.getCategoryId(),
                entity.getAmount(),
                entity.getCurrency(),
                entity.getCadence(),
                entity.getNote(),
                entity.isPaused(),
                entity.isDeleted(),
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }
}
