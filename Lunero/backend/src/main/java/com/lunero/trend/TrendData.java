package com.lunero.trend;

import java.util.List;

/**
 * Top-level response for GET /api/v1/trends.
 */
public record TrendData(
        String view,
        List<TrendPeriod> periods
) {}
