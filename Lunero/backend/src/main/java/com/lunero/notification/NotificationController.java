package com.lunero.notification;

import com.lunero.common.SecurityUtils;
import com.lunero.user.UserEntity;
import com.lunero.user.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;
    private final UserService userService;

    /**
     * Registers a push notification token for the authenticated user.
     * Upserts by (user, platform, token) — safe to call multiple times.
     */
    @PostMapping("/token")
    public ResponseEntity<Void> registerToken(@Valid @RequestBody RegisterTokenRequest request) {
        UUID userId = resolveUserId();
        notificationService.registerToken(userId, request.token(), request.platform());
        return ResponseEntity.noContent().build();
    }

    /**
     * Removes a push notification token for the authenticated user.
     */
    @DeleteMapping("/token")
    public ResponseEntity<Void> deregisterToken(@Valid @RequestBody DeregisterTokenRequest request) {
        UUID userId = resolveUserId();
        notificationService.deregisterToken(userId, request.token());
        return ResponseEntity.noContent().build();
    }

    private UUID resolveUserId() {
        String clerkUserId = SecurityUtils.getCurrentUserId();
        UserEntity user = userService.getOrCreateUser(clerkUserId);
        return user.getId();
    }
}
