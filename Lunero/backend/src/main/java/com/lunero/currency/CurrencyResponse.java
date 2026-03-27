package com.lunero.currency;

import java.time.Instant;
import java.util.List;
import java.util.Map;

public record CurrencyResponse(
        List<String> currencies,
        Map<String, Double> rates,
        Instant updatedAt,
        boolean ratesStale
) {}
