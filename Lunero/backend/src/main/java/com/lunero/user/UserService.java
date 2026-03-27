package com.lunero.user;

import com.lunero.category.CategoryService;
import com.lunero.common.audit.AuditAction;
import com.lunero.common.audit.AuditLogService;
import com.lunero.common.exception.EntityNotFoundException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
public class UserService {

    private final UserRepository userRepository;
    private final AuditLogService auditLogService;
    private final CategoryService categoryService;

    public UserService(UserRepository userRepository,
                       AuditLogService auditLogService,
                       @Lazy CategoryService categoryService) {
        this.userRepository = userRepository;
        this.auditLogService = auditLogService;
        this.categoryService = categoryService;
    }

    /**
     * Returns the existing user for the given Clerk user ID, or creates a new one
     * with default profile values if none exists. Safe to call on every authenticated request.
     */
    @Transactional
    public UserEntity getOrCreateUser(String clerkUserId) {
        return userRepository.findByClerkUserId(clerkUserId)
                .orElseGet(() -> {
                    UserEntity newUser = UserEntity.builder()
                            .clerkUserId(clerkUserId)
                            .displayName("New User")
                            .build();
                    UserEntity saved = userRepository.save(newUser);
                    log.info("Created new user profile for clerkUserId={}", clerkUserId);
                    auditLogService.log(saved.getId().toString(), "user", saved.getId().toString(),
                            AuditAction.CREATE, Map.of("clerkUserId", clerkUserId));
                    categoryService.seedDefaultCategories(saved.getId());
                    return saved;
                });
    }

    /**
     * Returns the user profile by internal UUID.
     */
    @Transactional(readOnly = true)
    public UserEntity getUser(UUID userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new EntityNotFoundException("User", userId));
    }

    /**
     * Applies partial profile updates. Only non-null fields in the request are applied.
     */
    @Transactional
    public UserEntity updateProfile(UUID userId, UpdateProfileRequest dto) {
        UserEntity user = getUser(userId);

        if (dto.displayName() != null) user.setDisplayName(dto.displayName());
        if (dto.defaultCurrency() != null) user.setDefaultCurrency(dto.defaultCurrency());
        if (dto.flowsheetPeriod() != null) user.setFlowsheetPeriod(dto.flowsheetPeriod());
        if (dto.themePreference() != null) user.setThemePreference(dto.themePreference());
        if (dto.overspendAlerts() != null) user.setOverspendAlerts(dto.overspendAlerts());
        if (dto.onboardingComplete() != null) user.setOnboardingComplete(dto.onboardingComplete());
        if (dto.onboardingStep() != null) user.setOnboardingStep(dto.onboardingStep());
        if (dto.tutorialComplete() != null) user.setTutorialComplete(dto.tutorialComplete());

        UserEntity saved = userRepository.save(user);
        auditLogService.log(userId.toString(), "user", userId.toString(), AuditAction.UPDATE);
        return saved;
    }

    /**
     * Soft-deletes the user by setting {@code deletedAt}. A scheduled cleanup job
     * will permanently remove the user and all associated data within 30 days.
     */
    @Transactional
    public void deleteUser(UUID userId) {
        UserEntity user = getUser(userId);
        user.setDeletedAt(Instant.now());
        userRepository.save(user);
        auditLogService.log(userId.toString(), "user", userId.toString(), AuditAction.DELETE);
        log.info("Soft-deleted user userId={}, scheduled for permanent removal within 30 days", userId);
    }
}
