package com.lunero.user;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserCleanupJobTest {

    @Mock
    private UserRepository userRepository;

    private UserCleanupJob cleanupJob;

    @BeforeEach
    void setUp() {
        cleanupJob = new UserCleanupJob(userRepository);
    }

    @Test
    void purgeDeletedUsers_deletesUsersOlderThan30Days() {
        UserEntity staleUser = UserEntity.builder()
                .id(UUID.randomUUID())
                .clerkUserId("clerk_stale")
                .displayName("Stale User")
                .deletedAt(Instant.now().minus(31, ChronoUnit.DAYS))
                .build();

        when(userRepository.findAllByDeletedAtBefore(any(Instant.class)))
                .thenReturn(List.of(staleUser));

        cleanupJob.purgeDeletedUsers();

        verify(userRepository).deleteAll(List.of(staleUser));
    }

    @Test
    void purgeDeletedUsers_doesNothing_whenNoStaleUsers() {
        when(userRepository.findAllByDeletedAtBefore(any(Instant.class)))
                .thenReturn(List.of());

        cleanupJob.purgeDeletedUsers();

        verify(userRepository, never()).deleteAll(any(Iterable.class));
    }

    @Test
    void purgeDeletedUsers_usesCutoffOf30DaysAgo() {
        when(userRepository.findAllByDeletedAtBefore(any(Instant.class)))
                .thenReturn(List.of());

        Instant before = Instant.now().minus(30, ChronoUnit.DAYS);
        cleanupJob.purgeDeletedUsers();
        Instant after = Instant.now().minus(30, ChronoUnit.DAYS);

        ArgumentCaptor<Instant> cutoffCaptor = ArgumentCaptor.forClass(Instant.class);
        verify(userRepository).findAllByDeletedAtBefore(cutoffCaptor.capture());

        Instant cutoff = cutoffCaptor.getValue();
        // cutoff should be within the 30-day window (allow 1 second tolerance)
        assertThat(cutoff).isBetween(before.minus(1, ChronoUnit.SECONDS), after.plus(1, ChronoUnit.SECONDS));
    }

    @Test
    void purgeDeletedUsers_deletesMultipleUsers() {
        List<UserEntity> staleUsers = List.of(
                UserEntity.builder().id(UUID.randomUUID()).clerkUserId("c1").displayName("U1")
                        .deletedAt(Instant.now().minus(35, ChronoUnit.DAYS)).build(),
                UserEntity.builder().id(UUID.randomUUID()).clerkUserId("c2").displayName("U2")
                        .deletedAt(Instant.now().minus(60, ChronoUnit.DAYS)).build()
        );

        when(userRepository.findAllByDeletedAtBefore(any(Instant.class))).thenReturn(staleUsers);

        cleanupJob.purgeDeletedUsers();

        verify(userRepository).deleteAll(staleUsers);
    }
}
