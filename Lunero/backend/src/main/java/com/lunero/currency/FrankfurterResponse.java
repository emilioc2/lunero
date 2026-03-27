package com.lunero.currency;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.Map;

@JsonIgnoreProperties(ignoreUnknown = true)
public record FrankfurterResponse(
        String base,
        String date,
        Map<String, Double> rates
) {}
