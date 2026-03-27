package com.lunero.notification;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.lunero.common.audit.AuditAction;
import com.lunero.common.audit.AuditLogService;
import com.lunero.user.UserEntity;
import com.lunero.user.UserRepository;
import nl.martijndwars.webpush.PushService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class NotificationServiceTest {

    @Mock private NotificationTokenRepository notificationTokenRepository;
    @Mock private UserRepository userRepository;
    @Mock private AuditLogService auditLogService;
    @Mock private PushService pushService;

    private NotificationService notificationService;

    private final UUID userId = UUID.randomUUID();

    // A minimal valid-looking subscription JSON (keys are fake but structurally correct base64url)
    private static final String FAKE_P256DH =
            "BNcr8qBBMFqFODFPFMhFJFkFqFBMFqFODFPFMhFJFkFqFBMFqFODFPFMhFJFkFqFBMFqFODFPFMhFJFkFqFBM=";
    private static final String FAKE_AUTH = "dGVzdGF1dGhzZWNyZXQ="; // base64url of "testauthsecret"

    /**
     * Builds a subscription JSON string that the service can parse.
     * The actual crypto values are fake — PushService is mocked so no real encryption happens.
     */
    private static String subscriptionJson(String endpointSuffix) {
        return "{\"endpoint\":\"https://fcm.googleapis.com/fcm/send/" + endpointSuffix + "\","
                + "\"keys\":{\"p256dh\":\"" + FAKE_P256DH + "\","
                + "\"auth\":\"" + FAKE_AUTH + "\"}}";
    }

    @BeforeEach
    void setUp() {
        notificationService = new NotificationService(
                notificationTokenRepository, userRepository, auditLogService,
                pushService, new ObjectMapper());
    }

    // ── sendOverspendAlert — happy path ──────────────────────────────────────

    @Test
    void sendOverspendAlert_sendsToAllRegisteredTokens() throws Exception {
        when(userRepository.findById(userId)).thenReturn(Optional.of(userWithAlerts(true)));
        when(notificationTokenRepository.findByUserIdAndPlatform(userId, "web"))
                .thenReturn(List.of(
                        token(subscriptionJson("token-1")),
                        token(subscriptionJson("token-2"))
                ));

        notificationService.sendOverspendAlert(userId);

        verify(pushService, times(2)).send(any());
    }

    @Test
    void sendOverspendAlert_sendsToSingleToken() throws Exception {
        when(userRepository.findById(userId)).thenReturn(Optional.of(userWithAlerts(true)));
        when(notificationTokenRepository.findByUserIdAndPlatform(userId, "web"))
                .thenReturn(List.of(token(subscriptionJson("only-token"))));

        notificationService.sendOverspendAlert(userId);

        verify(pushService, times(1)).send(any());
    }

    // ── sendOverspendAlert — no tokens ───────────────────────────────────────

    @Test
    void sendOverspendAlert_doesNotSend_whenUserHasNoTokens() throws Exception {
        when(userRepository.findById(userId)).thenReturn(Optional.of(userWithAlerts(true)));
        when(notificationTokenRepository.findByUserIdAndPlatform(userId, "web"))
                .thenReturn(List.of());

        notificationService.sendOverspendAlert(userId);

        verify(pushService, never()).send(any());
    }

    // ── sendOverspendAlert — alerts disabled ─────────────────────────────────

    @Test
    void sendOverspendAlert_doesNotSend_whenOverspendAlertsDisabled() throws Exception {
        when(userRepository.findById(userId)).thenReturn(Optional.of(userWithAlerts(false)));

        notificationService.sendOverspendAlert(userId);

        verify(notificationTokenRepository, never()).findByUserIdAndPlatform(any(), any());
        verify(pushService, never()).send(any());
    }

    // ── sendOverspendAlert — user not found ──────────────────────────────────

    @Test
    void sendOverspendAlert_doesNotSend_whenUserNotFound() throws Exception {
        when(userRepository.findById(userId)).thenReturn(Optional.empty());

        notificationService.sendOverspendAlert(userId);

        verify(pushService, never()).send(any());
    }

    // ── failure logging and retry ────────────────────────────────────────────

    @Test
    void sendOverspendAlert_retriesOnce_thenLogsFailure_whenBothAttemptsFail() throws Exception {
        when(userRepository.findById(userId)).thenReturn(Optional.of(userWithAlerts(true)));
        NotificationTokenEntity t = token(subscriptionJson("fail-token"));
        when(notificationTokenRepository.findByUserIdAndPlatform(userId, "web"))
                .thenReturn(List.of(t));

        doThrow(new RuntimeException("push failed")).when(pushService).send(any());

        notificationService.sendOverspendAlert(userId);

        // Two delivery attempts (original + 1 retry)
        verify(pushService, times(2)).send(any());

        // Failure logged to audit log after second failure
        verify(auditLogService).log(
                eq(userId.toString()),
                eq("notification_token"),
                eq(t.getId().toString()),
                eq(AuditAction.NOTIFICATION_FAILED),
                any(Map.class)
        );
    }

    @Test
    void sendOverspendAlert_doesNotLogFailure_whenFirstAttemptSucceeds() throws Exception {
        when(userRepository.findById(userId)).thenReturn(Optional.of(userWithAlerts(true)));
        when(notificationTokenRepository.findByUserIdAndPlatform(userId, "web"))
                .thenReturn(List.of(token(subscriptionJson("ok-token"))));

        notificationService.sendOverspendAlert(userId);

        verify(auditLogService, never()).log(any(), any(), any(), eq(AuditAction.NOTIFICATION_FAILED), any());
    }

    @Test
    void sendOverspendAlert_doesNotLogFailure_whenRetrySucceeds() throws Exception {
        when(userRepository.findById(userId)).thenReturn(Optional.of(userWithAlerts(true)));
        when(notificationTokenRepository.findByUserIdAndPlatform(userId, "web"))
                .thenReturn(List.of(token(subscriptionJson("retry-ok-token"))));

        // First attempt fails, second succeeds
        doThrow(new RuntimeException("transient"))
                .doNothing()
                .when(pushService).send(any());

        notificationService.sendOverspendAlert(userId);

        verify(pushService, times(2)).send(any());
        verify(auditLogService, never()).log(any(), any(), any(), eq(AuditAction.NOTIFICATION_FAILED), any());
    }

    @Test
    void sendOverspendAlert_logsFailureForEachFailingToken_independently() throws Exception {
        when(userRepository.findById(userId)).thenReturn(Optional.of(userWithAlerts(true)));
        NotificationTokenEntity t1 = token(subscriptionJson("fail-1"));
        NotificationTokenEntity t2 = token(subscriptionJson("fail-2"));
        when(notificationTokenRepository.findByUserIdAndPlatform(userId, "web"))
                .thenReturn(List.of(t1, t2));

        doThrow(new RuntimeException("push failed")).when(pushService).send(any());

        notificationService.sendOverspendAlert(userId);

        // 2 tokens × 2 attempts each = 4 total push calls
        verify(pushService, times(4)).send(any());
        // One audit log entry per failing token
        verify(auditLogService, times(2)).log(
                eq(userId.toString()),
                eq("notification_token"),
                anyString(),
                eq(AuditAction.NOTIFICATION_FAILED),
                any(Map.class)
        );
    }

    // ── registerToken / deregisterToken ──────────────────────────────────────

    @Test
    void registerToken_savesNewToken_whenNotAlreadyPresent() {
        String sub = subscriptionJson("new-token");
        when(notificationTokenRepository.findByUserIdAndToken(userId, sub))
                .thenReturn(Optional.empty());

        notificationService.registerToken(userId, sub, "web");

        ArgumentCaptor<NotificationTokenEntity> captor =
                ArgumentCaptor.forClass(NotificationTokenEntity.class);
        verify(notificationTokenRepository).save(captor.capture());

        NotificationTokenEntity saved = captor.getValue();
        assertThat(saved.getUserId()).isEqualTo(userId);
        assertThat(saved.getToken()).isEqualTo(sub);
        assertThat(saved.getPlatform()).isEqualTo("web");
    }

    @Test
    void registerToken_doesNotSave_whenTokenAlreadyExists() {
        String sub = subscriptionJson("dup-token");
        when(notificationTokenRepository.findByUserIdAndToken(userId, sub))
                .thenReturn(Optional.of(token(sub)));

        notificationService.registerToken(userId, sub, "web");

        verify(notificationTokenRepository, never()).save(any());
    }

    @Test
    void deregisterToken_deletesToken() {
        String sub = subscriptionJson("remove-token");
        notificationService.deregisterToken(userId, sub);

        verify(notificationTokenRepository).deleteByUserIdAndToken(userId, sub);
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private UserEntity userWithAlerts(boolean overspendAlerts) {
        return UserEntity.builder()
                .id(userId)
                .clerkUserId("clerk_test")
                .displayName("Test User")
                .overspendAlerts(overspendAlerts)
                .build();
    }

    private NotificationTokenEntity token(String subscriptionJson) {
        return NotificationTokenEntity.builder()
                .id(UUID.randomUUID())
                .userId(userId)
                .platform("web")
                .token(subscriptionJson)
                .build();
    }
}
