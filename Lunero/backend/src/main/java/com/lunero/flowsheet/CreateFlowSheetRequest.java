package com.lunero.flowsheet;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

import java.time.LocalDate;

public record CreateFlowSheetRequest(

        @NotBlank
        @Pattern(regexp = "weekly|monthly|custom", message = "periodType must be weekly, monthly, or custom")
        String periodType,

        LocalDate startDate,

        LocalDate endDate
) {}
