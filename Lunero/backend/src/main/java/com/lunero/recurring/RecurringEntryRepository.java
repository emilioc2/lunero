package com.lunero.recurring;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface RecurringEntryRepository extends JpaRepository<RecurringEntryEntity, UUID> {

    List<RecurringEntryEntity> findByUserIdAndIsDeletedFalse(UUID userId);

    List<RecurringEntryEntity> findByUserIdAndIsPausedFalseAndIsDeletedFalse(UUID userId);

    Optional<RecurringEntryEntity> findByIdAndUserIdAndIsDeletedFalse(UUID id, UUID userId);
}
