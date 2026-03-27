package com.lunero.projection;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;

public record UpsertProjectionRequest(
        @NotNull(message = "projectedAmount is required")
        @Positive(message = "projectedAmount must be greater than 0")
        BigDecimal projectedAmount,

        @NotBlank(message = "currency is required")
        String currency
) {}
