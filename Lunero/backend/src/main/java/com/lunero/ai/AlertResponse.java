package com.lunero.ai;

import java.util.UUID;

public record AlertResponse(
        UUID id,
        String alertType,
        String message,
        UUID flowSheetId
) {}
