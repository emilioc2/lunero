package com.lunero.flowsheet;

import com.lunero.entry.EntryEntity;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record FlowSheetResponse(
        UUID id,
        UUID userId,
        String periodType,
        LocalDate startDate,
        LocalDate endDate,
        String status,
        boolean editLocked,
        BigDecimal availableBalance,
        BigDecimal totalIncome,
        BigDecimal totalExpenses,
        BigDecimal totalSavings,
        Instant createdAt,
        Instant updatedAt
) {
    public static FlowSheetResponse from(FlowSheetEntity entity, List<EntryEntity> entries) {
        BigDecimal income   = BigDecimal.ZERO;
        BigDecimal expenses = BigDecimal.ZERO;
        BigDecimal savings  = BigDecimal.ZERO;

        for (EntryEntity e : entries) {
            if (e.isDeleted()) continue;
            BigDecimal amount = e.getConvertedAmount() != null ? e.getConvertedAmount() : e.getAmount();
            switch (e.getEntryType()) {
                case "income"  -> income   = income.add(amount);
                case "expense" -> expenses = expenses.add(amount);
                case "savings" -> savings  = savings.add(amount);
            }
        }

        BigDecimal available = income.subtract(expenses.add(savings));

        return new FlowSheetResponse(
                entity.getId(),
                entity.getUserId(),
                entity.getPeriodType(),
                entity.getStartDate(),
                entity.getEndDate(),
                entity.getStatus(),
                entity.isEditLocked(),
                available,
                income,
                expenses,
                savings,
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }

    /** Convenience overload when no entries are loaded (e.g. list view). */
    public static FlowSheetResponse from(FlowSheetEntity entity) {
        return from(entity, List.of());
    }
}
