package com.lunero.notification;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.lunero.common.audit.AuditAction;
import com.lunero.common.audit.AuditLogService;
import com.lunero.user.UserEntity;
import com.lunero.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import nl.martijndwars.webpush.Notification;
import nl.martijndwars.webpush.PushService;
import org.bouncycastle.jce.ECNamedCurveTable;
import org.bouncycastle.jce.spec.ECNamedCurveParameterSpec;
import org.bouncycastle.jce.spec.ECPublicKeySpec;
import org.bouncycastle.math.ec.ECPoint;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.KeyFactory;
import java.security.PublicKey;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Handles Web Push notification delivery for overspend alerts.
 *
 * <p>The {@code token} column in {@code notification_tokens} stores the full browser
 * push subscription as a JSON string, e.g.:
 * <pre>
 * {
 *   "endpoint": "https://fcm.googleapis.com/fcm/send/...",
 *   "keys": { "p256dh": "...", "auth": "..." }
 * }
 * </pre>
 * This matches the object returned by the browser's {@code pushManager.subscribe()} call.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationService {

    static final String OVERSPEND_PAYLOAD =
            "{\"title\":\"Overspend Alert\",\"body\":\"Your available balance has gone negative.\",\"url\":\"/\"}";

    private final NotificationTokenRepository notificationTokenRepository;
    private final UserRepository userRepository;
    private final AuditLogService auditLogService;
    private final PushService pushService;
    private final ObjectMapper objectMapper;

    /**
     * Dispatches a Web Push overspend alert to all registered web tokens for the user.
     * Skipped entirely if the user has {@code overspendAlerts = false} or has no tokens.
     * Each delivery is attempted once; on failure it retries once more.
     * If the retry also fails, the failure is logged to the audit log.
     * This method is {@code @Async} — callers do not block on it.
     */
    @Async
    @Transactional(readOnly = true)
    public void sendOverspendAlert(UUID userId) {
        UserEntity user = userRepository.findById(userId).orElse(null);
        if (user == null) {
            log.warn("sendOverspendAlert: user not found userId={}", userId);
            return;
        }
        if (!user.isOverspendAlerts()) {
            log.debug("sendOverspendAlert: overspendAlerts disabled for userId={}", userId);
            return;
        }

        List<NotificationTokenEntity> tokens =
                notificationTokenRepository.findByUserIdAndPlatform(userId, "web");

        if (tokens.isEmpty()) {
            log.debug("sendOverspendAlert: no web tokens for userId={}", userId);
            return;
        }

        for (NotificationTokenEntity tokenEntity : tokens) {
            sendWithRetry(userId, tokenEntity);
        }
    }

    /**
     * Upserts a notification token for the user (insert if not already present).
     * The {@code token} value must be the full subscription JSON string.
     */
    @Transactional
    public void registerToken(UUID userId, String token, String platform) {
        boolean exists = notificationTokenRepository
                .findByUserIdAndToken(userId, token).isPresent();
        if (!exists) {
            NotificationTokenEntity entity = NotificationTokenEntity.builder()
                    .userId(userId)
                    .platform(platform)
                    .token(token)
                    .build();
            notificationTokenRepository.save(entity);
            log.info("Registered notification token for userId={} platform={}", userId, platform);
        }
    }

    /**
     * Removes a notification token for the user.
     */
    @Transactional
    public void deregisterToken(UUID userId, String token) {
        notificationTokenRepository.deleteByUserIdAndToken(userId, token);
        log.info("Deregistered notification token for userId={}", userId);
    }

    // --- internal helpers ---

    private void sendWithRetry(UUID userId, NotificationTokenEntity tokenEntity) {
        try {
            deliver(tokenEntity);
        } catch (Exception firstEx) {
            log.warn("Web Push delivery failed (attempt 1) for userId={} token={}; retrying once",
                    userId, abbreviated(tokenEntity.getToken()), firstEx);
            try {
                deliver(tokenEntity);
            } catch (Exception secondEx) {
                log.error("Web Push delivery failed (attempt 2) for userId={} token={}; giving up",
                        userId, abbreviated(tokenEntity.getToken()), secondEx);
                auditLogService.log(
                        userId.toString(),
                        "notification_token",
                        tokenEntity.getId().toString(),
                        AuditAction.NOTIFICATION_FAILED,
                        Map.of("token", abbreviated(tokenEntity.getToken()),
                               "error", secondEx.getMessage() != null ? secondEx.getMessage() : "unknown")
                );
            }
        }
    }

    /**
     * Parses the stored subscription JSON and sends the push notification.
     * Expected JSON shape: {@code {"endpoint":"...","keys":{"p256dh":"...","auth":"..."}}}
     */
    private void deliver(NotificationTokenEntity tokenEntity) throws Exception {
        JsonNode sub = objectMapper.readTree(tokenEntity.getToken());
        String endpoint = sub.get("endpoint").asText();
        String p256dh   = sub.path("keys").get("p256dh").asText();
        String auth     = sub.path("keys").get("auth").asText();

        PublicKey userPublicKey = decodeP256dh(p256dh);
        byte[] authBytes = Base64.getUrlDecoder().decode(auth);

        Notification notification = new Notification(
                endpoint,
                userPublicKey,
                authBytes,
                OVERSPEND_PAYLOAD.getBytes()
        );
        pushService.send(notification);
    }

    private static PublicKey decodeP256dh(String base64url) throws Exception {
        byte[] keyBytes = Base64.getUrlDecoder().decode(base64url);
        ECNamedCurveParameterSpec ecSpec = ECNamedCurveTable.getParameterSpec("secp256r1");
        ECPoint point = ecSpec.getCurve().decodePoint(keyBytes);
        ECPublicKeySpec pubSpec = new ECPublicKeySpec(point, ecSpec);
        KeyFactory kf = KeyFactory.getInstance("ECDH", "BC");
        return kf.generatePublic(pubSpec);
    }

    private static String abbreviated(String token) {
        if (token == null || token.length() <= 12) return token;
        return token.substring(0, 8) + "…";
    }
}
