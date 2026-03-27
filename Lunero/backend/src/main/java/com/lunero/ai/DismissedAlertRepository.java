package com.lunero.ai;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface DismissedAlertRepository extends JpaRepository<DismissedAlertEntity, UUID> {

    List<DismissedAlertEntity> findByUserId(UUID userId);

    boolean existsByUserIdAndAlertTypeAndFlowSheetId(UUID userId, String alertType, UUID flowSheetId);

    Optional<DismissedAlertEntity> findByIdAndUserId(UUID id, UUID userId);
}
