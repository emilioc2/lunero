package com.lunero.entry;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface EntryRepository extends JpaRepository<EntryEntity, UUID> {

    boolean existsByCategoryIdAndIsDeletedFalse(UUID categoryId);

    List<EntryEntity> findByFlowSheetIdAndIsDeletedFalse(UUID flowSheetId);

    Optional<EntryEntity> findByIdAndUserIdAndIsDeletedFalse(UUID id, UUID userId);

    @Modifying
    @Query("UPDATE EntryEntity e SET e.categoryId = :targetId WHERE e.categoryId = :sourceId AND e.userId = :userId AND e.isDeleted = false")
    int reassignEntries(@Param("userId") UUID userId,
                        @Param("sourceId") UUID sourceId,
                        @Param("targetId") UUID targetId);

    /**
     * Returns distinct (categoryId, amount) pairs that appear in at least minPeriods
     * distinct FlowSheets for the given user — used for recurring suggestion detection (Req 4.7).
     */
    @Query("""
            SELECT e.categoryId, e.amount, COUNT(DISTINCT e.flowSheetId) AS periodCount
            FROM EntryEntity e
            WHERE e.userId = :userId AND e.isDeleted = false
            GROUP BY e.categoryId, e.amount
            HAVING COUNT(DISTINCT e.flowSheetId) >= :minPeriods
            """)
    List<Object[]> findRepeatedAmountCategoryPairs(
            @Param("userId") UUID userId,
            @Param("minPeriods") long minPeriods);
}
