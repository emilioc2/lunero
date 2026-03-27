package com.lunero.projection;

import com.lunero.category.CategoryEntity;
import com.lunero.category.CategoryRepository;
import com.lunero.common.audit.AuditAction;
import com.lunero.common.audit.AuditLogService;
import com.lunero.common.exception.EntityNotFoundException;
import com.lunero.common.exception.ValidationException;
import com.lunero.entry.EntryEntity;
import com.lunero.entry.EntryRepository;
import com.lunero.flowsheet.FlowSheetEntity;
import com.lunero.flowsheet.FlowSheetRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ProjectionService {

    // Status color constants (Req 22.11)
    static final String COLOR_INCOME_NATURAL  = "#6B6F69";
    static final String COLOR_EXPENSE_NATURAL = "#C86D5A";
    static final String COLOR_SAVINGS_NATURAL = "#C4A484";
    static final String COLOR_AT_BUDGET       = "#A89880"; // warm neutral
    static final String COLOR_OVER_BUDGET     = "#C86D5A"; // soft red

    private final CategoryProjectionRepository projectionRepository;
    private final FlowSheetRepository flowSheetRepository;
    private final CategoryRepository categoryRepository;
    private final EntryRepository entryRepository;
    private final AuditLogService auditLogService;

    // ── 29.2 getProjections ───────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<CategoryProjectionEntity> getProjections(UUID userId, UUID flowSheetId) {
        getOwnedSheet(userId, flowSheetId);
        return projectionRepository.findByFlowSheetIdAndUserId(flowSheetId, userId);
    }

    // ── 29.2 upsertProjection ─────────────────────────────────────────────────

    /**
     * Creates or updates the projection for a category in a FlowSheet.
     * Validates amount > 0 (Req 22.9).
     */
    @Transactional
    public CategoryProjectionEntity upsertProjection(
            UUID userId, UUID flowSheetId, UUID categoryId, BigDecimal amount, String currency) {

        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new ValidationException("projectedAmount must be greater than 0");
        }

        getOwnedSheet(userId, flowSheetId);
        getOwnedCategory(userId, categoryId);

        CategoryProjectionEntity projection = projectionRepository
                .findByFlowSheetIdAndCategoryIdAndUserId(flowSheetId, categoryId, userId)
                .orElseGet(() -> CategoryProjectionEntity.builder()
                        .flowSheetId(flowSheetId)
                        .userId(userId)
                        .categoryId(categoryId)
                        .build());

        projection.setProjectedAmount(amount);
        projection.setCurrency(currency);

        CategoryProjectionEntity saved = projectionRepository.save(projection);
        auditLogService.log(userId.toString(), "projection", saved.getId().toString(), AuditAction.UPDATE);

        log.info("Upserted projection flowSheetId={} categoryId={} amount={} for userId={}",
                flowSheetId, categoryId, amount, userId);
        return saved;
    }

    // ── 29.2 deleteProjection ─────────────────────────────────────────────────

    @Transactional
    public void deleteProjection(UUID userId, UUID flowSheetId, UUID categoryId) {
        getOwnedSheet(userId, flowSheetId);

        CategoryProjectionEntity projection = projectionRepository
                .findByFlowSheetIdAndCategoryIdAndUserId(flowSheetId, categoryId, userId)
                .orElseThrow(() -> new EntityNotFoundException("Projection not found for category", categoryId));

        projectionRepository.delete(projection);
        auditLogService.log(userId.toString(), "projection", projection.getId().toString(), AuditAction.DELETE);
        log.info("Deleted projection flowSheetId={} categoryId={} for userId={}", flowSheetId, categoryId, userId);
    }

    // ── 29.4 getProjectionSummary ─────────────────────────────────────────────

    /**
     * Aggregates projected vs actual at category, entry-type, and FlowSheet levels.
     * Uses convertedAmount for actuals (falls back to amount when convertedAmount is null).
     * Computes statusColor per row per Req 22.11.
     */
    @Transactional(readOnly = true)
    public ProjectionSummaryResponse getProjectionSummary(UUID userId, UUID flowSheetId) {
        getOwnedSheet(userId, flowSheetId);

        List<CategoryProjectionEntity> projections =
                projectionRepository.findByFlowSheetIdAndUserId(flowSheetId, userId);

        List<EntryEntity> entries =
                entryRepository.findByFlowSheetIdAndIsDeletedFalse(flowSheetId);

        // Build actual amounts per category
        Map<UUID, BigDecimal> actualByCategory = new HashMap<>();
        for (EntryEntity e : entries) {
            BigDecimal amt = e.getConvertedAmount() != null ? e.getConvertedAmount() : e.getAmount();
            actualByCategory.merge(e.getCategoryId(), amt, BigDecimal::add);
        }

        // Build category lookup
        List<UUID> categoryIds = projections.stream()
                .map(CategoryProjectionEntity::getCategoryId)
                .distinct()
                .toList();
        Map<UUID, CategoryEntity> categoryMap = categoryRepository.findAllById(categoryIds)
                .stream()
                .collect(Collectors.toMap(CategoryEntity::getId, c -> c));

        // Build byCategory rows
        List<ProjectionSummaryResponse.CategoryRow> byCategory = new ArrayList<>();
        Map<String, BigDecimal> projectedByType = new HashMap<>();
        Map<String, BigDecimal> actualByType    = new HashMap<>();

        for (CategoryProjectionEntity proj : projections) {
            CategoryEntity cat = categoryMap.get(proj.getCategoryId());
            String categoryName = cat != null ? cat.getName() : "Unknown";
            String entryType    = cat != null ? cat.getEntryType() : "expense";

            BigDecimal projected = proj.getProjectedAmount();
            BigDecimal actual    = actualByCategory.getOrDefault(proj.getCategoryId(), BigDecimal.ZERO);
            String statusColor   = computeStatusColor(actual, projected, entryType);

            byCategory.add(new ProjectionSummaryResponse.CategoryRow(
                    proj.getCategoryId(), categoryName, entryType, projected, actual, statusColor));

            projectedByType.merge(entryType, projected, BigDecimal::add);
            actualByType.merge(entryType, actual, BigDecimal::add);
        }

        // Build byEntryType rows
        Map<String, ProjectionSummaryResponse.EntryTypeRow> byEntryType = new LinkedHashMap<>();
        for (String type : List.of("income", "expense", "savings")) {
            BigDecimal projected = projectedByType.getOrDefault(type, BigDecimal.ZERO);
            BigDecimal actual    = actualByType.getOrDefault(type, BigDecimal.ZERO);
            byEntryType.put(type, new ProjectionSummaryResponse.EntryTypeRow(
                    projected, actual, computeStatusColor(actual, projected, type)));
        }

        // Build overall row
        BigDecimal totalProjected = projectedByType.values().stream().reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalActual    = actualByType.values().stream().reduce(BigDecimal.ZERO, BigDecimal::add);
        String overallColor = computeStatusColor(totalActual, totalProjected, "expense");

        return new ProjectionSummaryResponse(
                flowSheetId, byCategory, byEntryType,
                new ProjectionSummaryResponse.OverallRow(totalProjected, totalActual, overallColor));
    }

    // ── Carryover (called from FlowSheetService) ──────────────────────────────

    /**
     * Copies projections from {@code sourceFlowSheetId} to {@code targetFlowSheetId}.
     * Used during archiveExpiredSheets to carry over projections as defaults (Req 22.2).
     */
    @Transactional
    public void carryOverProjections(UUID userId, UUID sourceFlowSheetId, UUID targetFlowSheetId) {
        List<CategoryProjectionEntity> source =
                projectionRepository.findByFlowSheetIdAndUserId(sourceFlowSheetId, userId);

        if (source.isEmpty()) return;

        List<CategoryProjectionEntity> copies = source.stream()
                .map(p -> CategoryProjectionEntity.builder()
                        .flowSheetId(targetFlowSheetId)
                        .userId(userId)
                        .categoryId(p.getCategoryId())
                        .projectedAmount(p.getProjectedAmount())
                        .currency(p.getCurrency())
                        .build())
                .toList();

        projectionRepository.saveAll(copies);
        log.info("Carried over {} projections from flowSheetId={} to flowSheetId={}",
                copies.size(), sourceFlowSheetId, targetFlowSheetId);
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    /**
     * Determines the status color for a projection row (Req 22.11).
     * - actual < projected  → category natural color
     * - actual == projected → warm neutral
     * - actual > projected  → soft red (#C86D5A), regardless of type
     */
    static String computeStatusColor(BigDecimal actual, BigDecimal projected, String entryType) {
        int cmp = actual.compareTo(projected);
        if (cmp < 0) {
            return switch (entryType) {
                case "income"  -> COLOR_INCOME_NATURAL;
                case "savings" -> COLOR_SAVINGS_NATURAL;
                default        -> COLOR_EXPENSE_NATURAL;
            };
        } else if (cmp == 0) {
            return COLOR_AT_BUDGET;
        } else {
            return COLOR_OVER_BUDGET;
        }
    }

    private FlowSheetEntity getOwnedSheet(UUID userId, UUID sheetId) {
        return flowSheetRepository.findByIdAndUserId(sheetId, userId)
                .orElseThrow(() -> new EntityNotFoundException("FlowSheet", sheetId));
    }

    private CategoryEntity getOwnedCategory(UUID userId, UUID categoryId) {
        return categoryRepository.findByIdAndUserId(categoryId, userId)
                .orElseThrow(() -> new EntityNotFoundException("Category", categoryId));
    }
}
