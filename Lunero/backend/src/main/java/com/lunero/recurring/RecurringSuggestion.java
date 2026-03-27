package com.lunero.recurring;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Represents a suggestion to convert a manually-repeated entry into a RecurringEntry.
 * Surfaced when the same amount+category appears in 3+ consecutive FlowSheet periods (Req 4.7, Property 14).
 */
public record RecurringSuggestion(
        UUID categoryId,
        BigDecimal amount,
        long periodCount
) {}
