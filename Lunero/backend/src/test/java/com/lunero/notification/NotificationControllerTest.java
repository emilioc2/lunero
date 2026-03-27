package com.lunero.notification;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.lunero.common.GlobalExceptionHandler;
import com.lunero.security.ClerkAuthentication;
import com.lunero.user.UserEntity;
import com.lunero.user.UserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.List;
import java.util.UUID;

import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
class NotificationControllerTest {

    @Mock private NotificationService notificationService;
    @Mock private UserService userService;

    private MockMvc mockMvc;
    private ObjectMapper objectMapper;

    private final String clerkUserId = "clerk_notif_test";
    private final UUID userId = UUID.randomUUID();

    private static final String SUBSCRIPTION_JSON =
            "{\"endpoint\":\"https://fcm.googleapis.com/fcm/send/test\","
            + "\"keys\":{\"p256dh\":\"BAAAA\",\"auth\":\"AAAA\"}}";

    @BeforeEach
    void setUp() {
        NotificationController controller = new NotificationController(notificationService, userService);
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
        objectMapper = new ObjectMapper();

        ClerkAuthentication auth = new ClerkAuthentication(clerkUserId, List.of());
        SecurityContextHolder.getContext().setAuthentication(auth);

        UserEntity user = UserEntity.builder().id(userId).clerkUserId(clerkUserId).displayName("Test").build();
        when(userService.getOrCreateUser(clerkUserId)).thenReturn(user);
    }

    // ── POST /api/v1/notifications/token ─────────────────────────────────────

    @Test
    void registerToken_returns204_whenValid() throws Exception {
        String body = objectMapper.writeValueAsString(
                new RegisterTokenRequest(SUBSCRIPTION_JSON, "web"));

        mockMvc.perform(post("/api/v1/notifications/token")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isNoContent());

        verify(notificationService).registerToken(userId, SUBSCRIPTION_JSON, "web");
    }

    @Test
    void registerToken_returns400_whenTokenBlank() throws Exception {
        String body = "{\"token\":\"\",\"platform\":\"web\"}";

        mockMvc.perform(post("/api/v1/notifications/token")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest());

        verify(notificationService, never()).registerToken(any(), any(), any());
    }

    @Test
    void registerToken_returns400_whenPlatformBlank() throws Exception {
        String body = "{\"token\":\"" + SUBSCRIPTION_JSON + "\",\"platform\":\"\"}";

        mockMvc.perform(post("/api/v1/notifications/token")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest());

        verify(notificationService, never()).registerToken(any(), any(), any());
    }

    @Test
    void registerToken_returns400_whenBodyMissing() throws Exception {
        mockMvc.perform(post("/api/v1/notifications/token")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest());
    }

    // ── DELETE /api/v1/notifications/token ───────────────────────────────────

    @Test
    void deregisterToken_returns204_whenValid() throws Exception {
        String body = objectMapper.writeValueAsString(
                new DeregisterTokenRequest(SUBSCRIPTION_JSON));

        mockMvc.perform(delete("/api/v1/notifications/token")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isNoContent());

        verify(notificationService).deregisterToken(userId, SUBSCRIPTION_JSON);
    }

    @Test
    void deregisterToken_returns400_whenTokenBlank() throws Exception {
        String body = "{\"token\":\"\"}";

        mockMvc.perform(delete("/api/v1/notifications/token")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest());

        verify(notificationService, never()).deregisterToken(any(), any());
    }

    @Test
    void deregisterToken_returns400_whenBodyMissing() throws Exception {
        mockMvc.perform(delete("/api/v1/notifications/token")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest());
    }
}
