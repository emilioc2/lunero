package com.lunero.recurring;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.util.UUID;

public record CreateRecurringEntryRequest(

        @NotBlank(message = "entryType is required")
        String entryType,

        @NotNull(message = "categoryId is required")
        UUID categoryId,

        @NotNull(message = "amount is required")
        BigDecimal amount,

        @NotBlank(message = "currency is required")
        String currency,

        @NotBlank(message = "cadence is required")
        String cadence,

        String note
) {}
