package com.lunero.category;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record CreateCategoryRequest(

        @NotBlank(message = "Category name is required")
        @Size(max = 100, message = "Category name must not exceed 100 characters")
        String name,

        @NotBlank(message = "Entry type is required")
        @Pattern(regexp = "income|expense|savings", message = "entryType must be income, expense, or savings")
        String entryType
) {}
