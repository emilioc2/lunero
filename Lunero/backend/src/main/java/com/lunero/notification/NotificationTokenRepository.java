package com.lunero.notification;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface NotificationTokenRepository extends JpaRepository<NotificationTokenEntity, UUID> {

    List<NotificationTokenEntity> findByUserIdAndPlatform(UUID userId, String platform);

    Optional<NotificationTokenEntity> findByUserIdAndToken(UUID userId, String token);

    void deleteByUserIdAndToken(UUID userId, String token);
}
