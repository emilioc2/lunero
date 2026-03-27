package com.lunero.entry;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record CreateEntryRequest(

        @NotNull(message = "flowSheetId is required")
        UUID flowSheetId,

        @NotBlank(message = "entryType is required")
        String entryType,

        @NotNull(message = "categoryId is required")
        UUID categoryId,

        @NotNull(message = "amount is required")
        BigDecimal amount,

        @NotBlank(message = "currency is required")
        String currency,

        @NotNull(message = "entryDate is required")
        LocalDate entryDate,

        String note,

        Instant clientUpdatedAt
) {}
