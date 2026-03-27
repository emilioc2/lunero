package com.lunero.ai;

import jakarta.validation.constraints.NotBlank;

public record MiraQueryRequest(
        @NotBlank(message = "message must not be blank")
        String message
) {}
