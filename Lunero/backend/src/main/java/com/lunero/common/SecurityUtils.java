package com.lunero.common;

import com.lunero.security.ClerkAuthentication;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

/**
 * Utility methods for RBAC ownership checks.
 * All service methods that operate on user-owned resources should call
 * {@link #requireOwnership(String)} to enforce that the authenticated user
 * can only access their own data.
 */
public final class SecurityUtils {

    private SecurityUtils() {}

    /**
     * Returns the userId of the currently authenticated user.
     *
     * @throws IllegalStateException if no authenticated user is present
     */
    public static String getCurrentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth instanceof ClerkAuthentication clerkAuth) {
            return clerkAuth.getUserId();
        }
        throw new IllegalStateException("No authenticated user in SecurityContext");
    }

    /**
     * Verifies that {@code resourceOwnerId} matches the authenticated user.
     * Throws {@link AccessDeniedException} (→ HTTP 403) if they differ.
     *
     * @param resourceOwnerId the userId stored on the resource being accessed
     */
    public static void requireOwnership(String resourceOwnerId) {
        String currentUserId = getCurrentUserId();
        if (!currentUserId.equals(resourceOwnerId)) {
            throw new AccessDeniedException("Access denied: resource belongs to another user");
        }
    }
}
