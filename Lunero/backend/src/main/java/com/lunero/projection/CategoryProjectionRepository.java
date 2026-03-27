package com.lunero.projection;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CategoryProjectionRepository extends JpaRepository<CategoryProjectionEntity, UUID> {

    List<CategoryProjectionEntity> findByFlowSheetIdAndUserId(UUID flowSheetId, UUID userId);

    Optional<CategoryProjectionEntity> findByFlowSheetIdAndCategoryIdAndUserId(
            UUID flowSheetId, UUID categoryId, UUID userId);

    Optional<CategoryProjectionEntity> findByFlowSheetIdAndCategoryId(UUID flowSheetId, UUID categoryId);

    List<CategoryProjectionEntity> findByFlowSheetId(UUID flowSheetId);

    @Modifying
    @Query("DELETE FROM CategoryProjectionEntity p WHERE p.categoryId = :categoryId")
    void deleteAllByCategoryId(@Param("categoryId") UUID categoryId);
}
