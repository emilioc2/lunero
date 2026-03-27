package com.lunero.entry;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record UpdateEntryRequest(
        String entryType,
        UUID categoryId,
        BigDecimal amount,
        String currency,
        LocalDate entryDate,
        String note,
        Instant clientUpdatedAt
) {}
