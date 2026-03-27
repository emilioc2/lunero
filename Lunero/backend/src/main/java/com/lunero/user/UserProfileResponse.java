package com.lunero.user;

import java.time.Instant;
import java.util.UUID;

public record UserProfileResponse(
        UUID id,
        String clerkUserId,
        String displayName,
        String defaultCurrency,
        String flowsheetPeriod,
        String themePreference,
        boolean overspendAlerts,
        boolean onboardingComplete,
        int onboardingStep,
        boolean tutorialComplete,
        Instant createdAt,
        Instant updatedAt
) {
    static UserProfileResponse from(UserEntity entity) {
        return new UserProfileResponse(
                entity.getId(),
                entity.getClerkUserId(),
                entity.getDisplayName(),
                entity.getDefaultCurrency(),
                entity.getFlowsheetPeriod(),
                entity.getThemePreference(),
                entity.isOverspendAlerts(),
                entity.isOnboardingComplete(),
                entity.getOnboardingStep(),
                entity.isTutorialComplete(),
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }
}
