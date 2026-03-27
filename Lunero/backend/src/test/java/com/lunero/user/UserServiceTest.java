package com.lunero.user;

import com.lunero.category.CategoryService;
import com.lunero.common.audit.AuditAction;
import com.lunero.common.audit.AuditLogService;
import com.lunero.common.exception.EntityNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private AuditLogService auditLogService;

    @Mock
    private CategoryService categoryService;

    private UserService userService;

    private final String clerkUserId = "clerk_test_123";
    private final UUID userId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        userService = new UserService(userRepository, auditLogService, categoryService);
    }

    // --- getOrCreateUser ---

    @Test
    void getOrCreateUser_returnsExisting_whenUserFound() {
        UserEntity existing = buildUser(userId, clerkUserId);
        when(userRepository.findByClerkUserId(clerkUserId)).thenReturn(Optional.of(existing));

        UserEntity result = userService.getOrCreateUser(clerkUserId);

        assertThat(result).isSameAs(existing);
        verify(userRepository, never()).save(any());
    }

    @Test
    void getOrCreateUser_createsNew_whenUserNotFound() {
        UserEntity saved = buildUser(userId, clerkUserId);
        when(userRepository.findByClerkUserId(clerkUserId)).thenReturn(Optional.empty());
        when(userRepository.save(any())).thenReturn(saved);

        UserEntity result = userService.getOrCreateUser(clerkUserId);

        assertThat(result.getClerkUserId()).isEqualTo(clerkUserId);
        verify(userRepository).save(any(UserEntity.class));
        verify(auditLogService).log(any(), eq("user"), any(), eq(AuditAction.CREATE), any());
        verify(categoryService).seedDefaultCategories(saved.getId());
    }

    @Test
    void getOrCreateUser_newUser_hasDefaultValues() {
        when(userRepository.findByClerkUserId(clerkUserId)).thenReturn(Optional.empty());
        when(userRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        UserEntity result = userService.getOrCreateUser(clerkUserId);

        assertThat(result.getDefaultCurrency()).isEqualTo("USD");
        assertThat(result.getFlowsheetPeriod()).isEqualTo("monthly");
        assertThat(result.getThemePreference()).isEqualTo("system");
        assertThat(result.isOverspendAlerts()).isTrue();
        assertThat(result.isOnboardingComplete()).isFalse();
    }

    // --- getUser ---

    @Test
    void getUser_returnsUser_whenFound() {
        UserEntity user = buildUser(userId, clerkUserId);
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        UserEntity result = userService.getUser(userId);

        assertThat(result).isSameAs(user);
    }

    @Test
    void getUser_throws_whenNotFound() {
        when(userRepository.findById(userId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> userService.getUser(userId))
                .isInstanceOf(EntityNotFoundException.class)
                .hasMessageContaining("User");
    }

    // --- updateProfile ---

    @Test
    void updateProfile_appliesAllNonNullFields() {
        UserEntity user = buildUser(userId, clerkUserId);
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(userRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        UpdateProfileRequest dto = new UpdateProfileRequest(
                "Alice", "EUR", "weekly", "dark",
                false, true, 3, true
        );

        UserEntity result = userService.updateProfile(userId, dto);

        assertThat(result.getDisplayName()).isEqualTo("Alice");
        assertThat(result.getDefaultCurrency()).isEqualTo("EUR");
        assertThat(result.getFlowsheetPeriod()).isEqualTo("weekly");
        assertThat(result.getThemePreference()).isEqualTo("dark");
        assertThat(result.isOverspendAlerts()).isFalse();
        assertThat(result.isOnboardingComplete()).isTrue();
        assertThat(result.getOnboardingStep()).isEqualTo(3);
        assertThat(result.isTutorialComplete()).isTrue();
        verify(auditLogService).log(any(), eq("user"), any(), eq(AuditAction.UPDATE));
    }

    @Test
    void updateProfile_ignoresNullFields() {
        UserEntity user = buildUser(userId, clerkUserId);
        user.setDisplayName("Original");
        user.setDefaultCurrency("USD");
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(userRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        // Only update displayName; everything else null
        UpdateProfileRequest dto = new UpdateProfileRequest(
                "Updated", null, null, null, null, null, null, null
        );

        UserEntity result = userService.updateProfile(userId, dto);

        assertThat(result.getDisplayName()).isEqualTo("Updated");
        assertThat(result.getDefaultCurrency()).isEqualTo("USD"); // unchanged
    }

    @Test
    void updateProfile_throws_whenUserNotFound() {
        when(userRepository.findById(userId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> userService.updateProfile(userId,
                new UpdateProfileRequest(null, null, null, null, null, null, null, null)))
                .isInstanceOf(EntityNotFoundException.class);
    }

    // --- deleteUser ---

    @Test
    void deleteUser_setsDeletedAt() {
        UserEntity user = buildUser(userId, clerkUserId);
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(userRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        userService.deleteUser(userId);

        ArgumentCaptor<UserEntity> captor = ArgumentCaptor.forClass(UserEntity.class);
        verify(userRepository).save(captor.capture());
        assertThat(captor.getValue().getDeletedAt()).isNotNull();
        assertThat(captor.getValue().getDeletedAt()).isBeforeOrEqualTo(Instant.now());
        verify(auditLogService).log(any(), eq("user"), any(), eq(AuditAction.DELETE));
    }

    @Test
    void deleteUser_throws_whenUserNotFound() {
        when(userRepository.findById(userId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> userService.deleteUser(userId))
                .isInstanceOf(EntityNotFoundException.class);
    }

    // --- helpers ---

    private UserEntity buildUser(UUID id, String clerkId) {
        return UserEntity.builder()
                .id(id)
                .clerkUserId(clerkId)
                .displayName("Test User")
                .build();
    }
}
