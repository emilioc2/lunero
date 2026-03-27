package com.lunero.ai;

import com.lunero.entry.EntryResponse;

import java.util.List;

/**
 * Returned by Mira when onboarding mode creates entries from a natural-language prompt.
 * The client should display this summary for user review before confirming.
 */
public record OnboardingSummaryResponse(
        String message,
        List<EntryResponse> createdEntries
) {}
