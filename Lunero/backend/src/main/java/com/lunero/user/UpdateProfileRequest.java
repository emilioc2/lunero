package com.lunero.user;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record UpdateProfileRequest(

        @Size(min = 1, max = 255, message = "Display name must be between 1 and 255 characters")
        String displayName,

        @Size(min = 3, max = 10, message = "Currency code must be between 3 and 10 characters")
        String defaultCurrency,

        @Pattern(regexp = "weekly|monthly|custom", message = "flowsheetPeriod must be weekly, monthly, or custom")
        String flowsheetPeriod,

        @Pattern(regexp = "light|dark|system", message = "themePreference must be light, dark, or system")
        String themePreference,

        Boolean overspendAlerts,

        Boolean onboardingComplete,

        Integer onboardingStep,

        Boolean tutorialComplete
) {}
