package com.lunero.notification;

import jakarta.validation.constraints.NotBlank;

public record DeregisterTokenRequest(
        @NotBlank String token
) {}
