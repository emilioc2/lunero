package com.lunero.common;

import com.lunero.security.ClerkAuthentication;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class SecurityUtilsTest {

    @AfterEach
    void clearContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void getCurrentUserId_returnsUserId_whenAuthenticated() {
        setAuth("user-123");

        assertThat(SecurityUtils.getCurrentUserId()).isEqualTo("user-123");
    }

    @Test
    void getCurrentUserId_throwsIllegalState_whenNoAuth() {
        // SecurityContext is empty (cleared in @AfterEach)
        assertThatThrownBy(SecurityUtils::getCurrentUserId)
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("No authenticated user");
    }

    @Test
    void requireOwnership_passes_whenOwnerMatchesCurrentUser() {
        setAuth("user-abc");

        // Should not throw
        SecurityUtils.requireOwnership("user-abc");
    }

    @Test
    void requireOwnership_throws403_whenOwnerDiffers() {
        setAuth("user-abc");

        assertThatThrownBy(() -> SecurityUtils.requireOwnership("user-xyz"))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("Access denied");
    }

    @Test
    void requireOwnership_throws403_whenOwnerIsNull() {
        setAuth("user-abc");

        assertThatThrownBy(() -> SecurityUtils.requireOwnership(null))
                .isInstanceOf(AccessDeniedException.class);
    }

    // --- helpers ---

    private void setAuth(String userId) {
        ClerkAuthentication auth = new ClerkAuthentication(userId, List.of());
        SecurityContextHolder.getContext().setAuthentication(auth);
    }
}
