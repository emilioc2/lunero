package com.lunero.recurring;

import java.math.BigDecimal;
import java.util.UUID;

public record UpdateRecurringEntryRequest(
        BigDecimal amount,
        UUID categoryId,
        String cadence,
        String note
) {}
