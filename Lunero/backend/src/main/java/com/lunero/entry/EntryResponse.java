package com.lunero.entry;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record EntryResponse(
        UUID id,
        UUID flowSheetId,
        UUID userId,
        String entryType,
        UUID categoryId,
        BigDecimal amount,
        String currency,
        BigDecimal convertedAmount,
        BigDecimal conversionRate,
        LocalDate entryDate,
        String note,
        boolean isDeleted,
        Instant clientUpdatedAt,
        Instant createdAt,
        Instant updatedAt,
        BigDecimal availableBalance
) {
    public static EntryResponse from(EntryEntity entity, BigDecimal availableBalance) {
        return new EntryResponse(
                entity.getId(),
                entity.getFlowSheetId(),
                entity.getUserId(),
                entity.getEntryType(),
                entity.getCategoryId(),
                entity.getAmount(),
                entity.getCurrency(),
                entity.getConvertedAmount(),
                entity.getConversionRate(),
                entity.getEntryDate(),
                entity.getNote(),
                entity.isDeleted(),
                entity.getClientUpdatedAt(),
                entity.getCreatedAt(),
                entity.getUpdatedAt(),
                availableBalance
        );
    }
}
