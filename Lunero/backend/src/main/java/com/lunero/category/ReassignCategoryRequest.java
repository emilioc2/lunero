package com.lunero.category;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record ReassignCategoryRequest(

        @NotNull(message = "Target category ID is required")
        UUID targetCategoryId
) {}
