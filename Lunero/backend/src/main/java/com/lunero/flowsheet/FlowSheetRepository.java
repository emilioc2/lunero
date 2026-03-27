package com.lunero.flowsheet;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface FlowSheetRepository extends JpaRepository<FlowSheetEntity, UUID> {

    Optional<FlowSheetEntity> findByUserIdAndStatus(UUID userId, String status);

    Optional<FlowSheetEntity> findByIdAndUserId(UUID id, UUID userId);

    Page<FlowSheetEntity> findAllByUserIdOrderByEndDateDesc(UUID userId, Pageable pageable);

    /**
     * Finds all active sheets whose end_date is before today — used by the archive scheduler.
     */
    @Query("SELECT f FROM FlowSheetEntity f WHERE f.status = 'active' AND f.endDate < :today")
    List<FlowSheetEntity> findExpiredActiveSheets(@Param("today") LocalDate today);

    /**
     * Checks for any active sheet whose date range overlaps [start, end] for the given user.
     * Used to enforce the no-overlap invariant (Property 2) before the DB constraint fires.
     */
    @Query("""
            SELECT COUNT(f) > 0 FROM FlowSheetEntity f
            WHERE f.userId = :userId
              AND f.status = 'active'
              AND f.id <> :excludeId
              AND f.startDate <= :endDate
              AND f.endDate >= :startDate
            """)
    boolean existsOverlappingActiveSheet(
            @Param("userId") UUID userId,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate,
            @Param("excludeId") UUID excludeId);
}
