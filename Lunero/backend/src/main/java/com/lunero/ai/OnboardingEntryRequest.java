package com.lunero.ai;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Represents a single entry that Mira parsed from a natural-language onboarding prompt.
 */
public record OnboardingEntryRequest(
        String entryType,   // income | expense | savings
        BigDecimal amount,
        String currency,
        UUID categoryId,
        LocalDate entryDate,
        String note
) {}
