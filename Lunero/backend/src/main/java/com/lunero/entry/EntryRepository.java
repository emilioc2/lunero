package com.lunero.entry;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface EntryRepository extends JpaRepository<EntryEntity, UUID> {

    boolean existsByCategoryAndIsDeletedFalse(String category);

    List<EntryEntity> findByFlowSheetIdAndIsDeletedFalse(UUID flowSheetId);

    Optional<EntryEntity> findByIdAndUserIdAndIsDeletedFalse(UUID id, UUID userId);

    @Modifying
    @Query("UPDATE EntryEntity e SET e.category = :target WHERE e.category = :source AND e.userId = :userId AND e.isDeleted = false")
    int reassignEntries(@Param("userId") UUID userId,
                        @Param("source") String source,
                        @Param("target") String target);

    /**
     * Returns distinct (category, amount) pairs that appear in at least minPeriods
     * distinct FlowSheets for the given user — used for recurring suggestion detection.
     */
    @Query("""
            SELECT e.category, e.amount, COUNT(DISTINCT e.flowSheetId) AS periodCount
            FROM EntryEntity e
            WHERE e.userId = :userId AND e.isDeleted = false
            GROUP BY e.category, e.amount
            HAVING COUNT(DISTINCT e.flowSheetId) >= :minPeriods
            """)
    List<Object[]> findRepeatedAmountCategoryPairs(
            @Param("userId") UUID userId,
            @Param("minPeriods") long minPeriods);
}
