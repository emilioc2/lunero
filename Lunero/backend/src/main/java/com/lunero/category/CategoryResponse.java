package com.lunero.category;

import java.time.Instant;
import java.util.UUID;

public record CategoryResponse(
        UUID id,
        UUID userId,
        String name,
        String entryType,
        boolean isDefault,
        int sortOrder,
        Instant createdAt
) {
    public static CategoryResponse from(CategoryEntity entity) {
        return new CategoryResponse(
                entity.getId(),
                entity.getUserId(),
                entity.getName(),
                entity.getEntryType(),
                entity.isDefault(),
                entity.getSortOrder(),
                entity.getCreatedAt()
        );
    }
}
