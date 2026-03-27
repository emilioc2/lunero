package com.lunero.trend;

import com.lunero.entry.EntryEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * Repository for trend queries — reads from the entries table.
 * All queries exclude soft-deleted entries and filter by userId so that
 * the trend view aggregates across ALL FlowSheets for the user.
 */
public interface TrendRepository extends JpaRepository<EntryEntity, UUID> {

    /**
     * Returns all non-deleted entries for a user within a date range.
     * Used for weekly and monthly trend views where from/to are provided.
     */
    @Query("""
            SELECT e FROM EntryEntity e
            WHERE e.userId = :userId
              AND e.isDeleted = false
              AND e.entryDate >= :from
              AND e.entryDate <= :to
            ORDER BY e.entryDate ASC
            """)
    List<EntryEntity> findByUserIdAndDateRange(
            @Param("userId") UUID userId,
            @Param("from") LocalDate from,
            @Param("to") LocalDate to);

    /**
     * Returns all non-deleted entries for a user (no date filter).
     * Used for yearly trend view where from/to are optional.
     */
    @Query("""
            SELECT e FROM EntryEntity e
            WHERE e.userId = :userId
              AND e.isDeleted = false
            ORDER BY e.entryDate ASC
            """)
    List<EntryEntity> findAllByUserId(@Param("userId") UUID userId);

    /**
     * Returns all non-deleted entries for a user within a date range, filtered by category.
     */
    @Query("""
            SELECT e FROM EntryEntity e
            WHERE e.userId = :userId
              AND e.isDeleted = false
              AND e.entryDate >= :from
              AND e.entryDate <= :to
              AND e.categoryId = :categoryId
            ORDER BY e.entryDate ASC
            """)
    List<EntryEntity> findByUserIdAndDateRangeAndCategory(
            @Param("userId") UUID userId,
            @Param("from") LocalDate from,
            @Param("to") LocalDate to,
            @Param("categoryId") UUID categoryId);

    /**
     * Returns all non-deleted entries for a user filtered by category (no date filter).
     */
    @Query("""
            SELECT e FROM EntryEntity e
            WHERE e.userId = :userId
              AND e.isDeleted = false
              AND e.categoryId = :categoryId
            ORDER BY e.entryDate ASC
            """)
    List<EntryEntity> findAllByUserIdAndCategory(
            @Param("userId") UUID userId,
            @Param("categoryId") UUID categoryId);
}
