package com.lunero.notification;

import jakarta.validation.constraints.NotBlank;

/**
 * Request body for registering a Web Push subscription token.
 *
 * The {@code token} field must be the full subscription JSON as returned by the browser's
 * {@code pushManager.subscribe()} call, serialised to a string. It must contain at minimum:
 * {@code {"endpoint":"...","keys":{"p256dh":"...","auth":"..."}}}
 *
 * The {@code platform} field should be {@code "web"} for browser push subscriptions.
 */
public record RegisterTokenRequest(
        @NotBlank String token,
        @NotBlank String platform
) {}
