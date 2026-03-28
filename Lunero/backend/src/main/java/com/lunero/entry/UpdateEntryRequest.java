package com.lunero.entry;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

public record UpdateEntryRequest(
        String entryType,
        String category,
        BigDecimal amount,
        String currency,
        LocalDate entryDate,
        String note,
        Instant clientUpdatedAt
) {}
