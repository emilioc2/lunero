package com.lunero.user;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "users")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "clerk_user_id", unique = true, nullable = false, length = 255)
    private String clerkUserId;

    @Column(name = "display_name", nullable = false, length = 255)
    private String displayName;

    @Column(name = "default_currency", nullable = false, length = 10)
    @Builder.Default
    private String defaultCurrency = "USD";

    @Column(name = "flowsheet_period", nullable = false, length = 20)
    @Builder.Default
    private String flowsheetPeriod = "monthly";

    @Column(name = "theme_preference", nullable = false, length = 20)
    @Builder.Default
    private String themePreference = "system";

    @Column(name = "overspend_alerts", nullable = false)
    @Builder.Default
    private boolean overspendAlerts = true;

    @Column(name = "onboarding_complete", nullable = false)
    @Builder.Default
    private boolean onboardingComplete = false;

    @Column(name = "onboarding_step", nullable = false)
    @Builder.Default
    private int onboardingStep = 0;

    @Column(name = "tutorial_complete", nullable = false)
    @Builder.Default
    private boolean tutorialComplete = false;

    @Column(name = "deleted_at")
    private Instant deletedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    void prePersist() {
        Instant now = Instant.now();
        if (createdAt == null) createdAt = now;
        if (updatedAt == null) updatedAt = now;
    }

    @PreUpdate
    void preUpdate() {
        updatedAt = Instant.now();
    }
}
