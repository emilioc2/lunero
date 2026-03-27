package com.lunero.user;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UserRepository extends JpaRepository<UserEntity, UUID> {

    Optional<UserEntity> findByClerkUserId(String clerkUserId);

    boolean existsByClerkUserId(String clerkUserId);

    List<UserEntity> findAllByDeletedAtBefore(Instant cutoff);
}
