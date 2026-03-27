package com.lunero.trend;

import java.math.BigDecimal;

/**
 * Represents a single aggregated period bucket in a trend view.
 * The {@code id} is a composite key encoding view + start + end dates,
 * e.g. {@code weekly_2024-01-01_2024-01-07}.
 */
public record TrendPeriod(
        String id,
        String label,
        String startDate,
        String endDate,
        BigDecimal totalIncome,
        BigDecimal totalExpenses,
        BigDecimal totalSavings,
        BigDecimal availableBalance
) {}
