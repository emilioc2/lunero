package com.lunero.user;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.lunero.common.GlobalExceptionHandler;
import com.lunero.common.SecurityUtils;
import com.lunero.common.exception.EntityNotFoundException;
import com.lunero.security.ClerkAuthentication;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
class UserControllerTest {

    @Mock
    private UserService userService;

    private MockMvc mockMvc;
    private ObjectMapper objectMapper;

    private final String clerkUserId = "clerk_test_abc";
    private final UUID userId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        UserController controller = new UserController(userService);
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
        objectMapper = new ObjectMapper();

        // Set up Clerk authentication in SecurityContext
        ClerkAuthentication auth = new ClerkAuthentication(clerkUserId, List.of());
        SecurityContextHolder.getContext().setAuthentication(auth);
    }

    // --- GET /api/v1/profile ---

    @Test
    void getProfile_returns200WithUserProfile() throws Exception {
        UserEntity user = buildUser();
        when(userService.getOrCreateUser(clerkUserId)).thenReturn(user);

        mockMvc.perform(get("/api/v1/profile"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(userId.toString()))
                .andExpect(jsonPath("$.clerkUserId").value(clerkUserId))
                .andExpect(jsonPath("$.displayName").value("Test User"))
                .andExpect(jsonPath("$.defaultCurrency").value("USD"))
                .andExpect(jsonPath("$.flowsheetPeriod").value("monthly"))
                .andExpect(jsonPath("$.themePreference").value("system"))
                .andExpect(jsonPath("$.overspendAlerts").value(true))
                .andExpect(jsonPath("$.onboardingComplete").value(false));
    }

    // --- PATCH /api/v1/profile ---

    @Test
    void updateProfile_returns200WithUpdatedProfile() throws Exception {
        UserEntity user = buildUser();
        UserEntity updated = buildUser();
        updated.setDisplayName("Alice");
        updated.setDefaultCurrency("EUR");

        when(userService.getOrCreateUser(clerkUserId)).thenReturn(user);
        when(userService.updateProfile(eq(userId), any(UpdateProfileRequest.class))).thenReturn(updated);

        String body = """
                {"displayName": "Alice", "defaultCurrency": "EUR"}
                """;

        mockMvc.perform(patch("/api/v1/profile")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.displayName").value("Alice"))
                .andExpect(jsonPath("$.defaultCurrency").value("EUR"));
    }

    @Test
    void updateProfile_returns400_whenDisplayNameBlank() throws Exception {
        String body = """
                {"displayName": ""}
                """;

        mockMvc.perform(patch("/api/v1/profile")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest());
    }

    @Test
    void updateProfile_returns400_whenFlowsheetPeriodInvalid() throws Exception {
        String body = """
                {"flowsheetPeriod": "quarterly"}
                """;

        mockMvc.perform(patch("/api/v1/profile")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest());
    }

    @Test
    void updateProfile_returns400_whenThemePreferenceInvalid() throws Exception {
        String body = """
                {"themePreference": "blue"}
                """;

        mockMvc.perform(patch("/api/v1/profile")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest());
    }

    // --- DELETE /api/v1/profile ---

    @Test
    void deleteProfile_returns204() throws Exception {
        UserEntity user = buildUser();
        when(userService.getOrCreateUser(clerkUserId)).thenReturn(user);
        doNothing().when(userService).deleteUser(userId);

        mockMvc.perform(delete("/api/v1/profile"))
                .andExpect(status().isNoContent());

        verify(userService).deleteUser(userId);
    }

    @Test
    void deleteProfile_returns404_whenUserNotFound() throws Exception {
        when(userService.getOrCreateUser(clerkUserId))
                .thenThrow(new EntityNotFoundException("User", userId));

        mockMvc.perform(delete("/api/v1/profile"))
                .andExpect(status().isNotFound());
    }

    // --- helpers ---

    private UserEntity buildUser() {
        return UserEntity.builder()
                .id(userId)
                .clerkUserId(clerkUserId)
                .displayName("Test User")
                .defaultCurrency("USD")
                .flowsheetPeriod("monthly")
                .themePreference("system")
                .overspendAlerts(true)
                .onboardingComplete(false)
                .onboardingStep(0)
                .tutorialComplete(false)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();
    }
}
