package com.lunero.projection;

import com.lunero.category.CategoryEntity;
import com.lunero.category.CategoryRepository;
import com.lunero.common.audit.AuditLogService;
import com.lunero.common.exception.EntityNotFoundException;
import com.lunero.common.exception.ValidationException;
import com.lunero.entry.EntryEntity;
import com.lunero.entry.EntryRepository;
import com.lunero.flowsheet.FlowSheetEntity;
import com.lunero.flowsheet.FlowSheetRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ProjectionServiceTest {

    @Mock private CategoryProjectionRepository projectionRepository;
    @Mock private FlowSheetRepository flowSheetRepository;
    @Mock private CategoryRepository categoryRepository;
    @Mock private EntryRepository entryRepository;
    @Mock private AuditLogService auditLogService;

    private ProjectionService projectionService;

    private final UUID userId     = UUID.randomUUID();
    private final UUID sheetId    = UUID.randomUUID();
    private final UUID categoryId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        projectionService = new ProjectionService(
                projectionRepository, flowSheetRepository, categoryRepository,
                entryRepository, auditLogService);
    }

    // ── getProjections ────────────────────────────────────────────────────────

    @Test
    void getProjections_returnsProjectionsForSheet() {
        when(flowSheetRepository.findByIdAndUserId(sheetId, userId)).thenReturn(Optional.of(buildSheet()));
        CategoryProjectionEntity proj = buildProjection(new BigDecimal("500"));
        when(projectionRepository.findByFlowSheetIdAndUserId(sheetId, userId)).thenReturn(List.of(proj));

        List<CategoryProjectionEntity> result = projectionService.getProjections(userId, sheetId);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getProjectedAmount()).isEqualByComparingTo("500");
    }

    @Test
    void getProjections_throws404_whenSheetNotOwned() {
        when(flowSheetRepository.findByIdAndUserId(sheetId, userId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> projectionService.getProjections(userId, sheetId))
                .isInstanceOf(EntityNotFoundException.class);
    }

    // ── upsertProjection ──────────────────────────────────────────────────────

    @Test
    void upsertProjection_createsNewProjection() {
        when(flowSheetRepository.findByIdAndUserId(sheetId, userId)).thenReturn(Optional.of(buildSheet()));
        when(categoryRepository.findByIdAndUserId(categoryId, userId)).thenReturn(Optional.of(buildCategory("expense")));
        when(projectionRepository.findByFlowSheetIdAndCategoryIdAndUserId(sheetId, categoryId, userId))
                .thenReturn(Optional.empty());

        CategoryProjectionEntity saved = buildProjection(new BigDecimal("300"));
        when(projectionRepository.save(any())).thenReturn(saved);

        CategoryProjectionEntity result = projectionService.upsertProjection(
                userId, sheetId, categoryId, new BigDecimal("300"), "USD");

        assertThat(result.getProjectedAmount()).isEqualByComparingTo("300");
        verify(projectionRepository).save(any());
    }

    @Test
    void upsertProjection_updatesExistingProjection() {
        when(flowSheetRepository.findByIdAndUserId(sheetId, userId)).thenReturn(Optional.of(buildSheet()));
        when(categoryRepository.findByIdAndUserId(categoryId, userId)).thenReturn(Optional.of(buildCategory("expense")));

        CategoryProjectionEntity existing = buildProjection(new BigDecimal("200"));
        when(projectionRepository.findByFlowSheetIdAndCategoryIdAndUserId(sheetId, categoryId, userId))
                .thenReturn(Optional.of(existing));
        when(projectionRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        CategoryProjectionEntity result = projectionService.upsertProjection(
                userId, sheetId, categoryId, new BigDecimal("500"), "USD");

        assertThat(result.getProjectedAmount()).isEqualByComparingTo("500");
    }

    @Test
    void upsertProjection_throws400_whenAmountIsZero() {
        assertThatThrownBy(() -> projectionService.upsertProjection(
                userId, sheetId, categoryId, BigDecimal.ZERO, "USD"))
                .isInstanceOf(ValidationException.class)
                .hasMessageContaining("projectedAmount must be greater than 0");
    }

    @Test
    void upsertProjection_throws400_whenAmountIsNegative() {
        assertThatThrownBy(() -> projectionService.upsertProjection(
                userId, sheetId, categoryId, new BigDecimal("-100"), "USD"))
                .isInstanceOf(ValidationException.class)
                .hasMessageContaining("projectedAmount must be greater than 0");
    }

    @Test
    void upsertProjection_throws404_whenSheetNotOwned() {
        when(flowSheetRepository.findByIdAndUserId(sheetId, userId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> projectionService.upsertProjection(
                userId, sheetId, categoryId, new BigDecimal("100"), "USD"))
                .isInstanceOf(EntityNotFoundException.class);
    }

    @Test
    void upsertProjection_throws404_whenCategoryNotOwned() {
        when(flowSheetRepository.findByIdAndUserId(sheetId, userId)).thenReturn(Optional.of(buildSheet()));
        when(categoryRepository.findByIdAndUserId(categoryId, userId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> projectionService.upsertProjection(
                userId, sheetId, categoryId, new BigDecimal("100"), "USD"))
                .isInstanceOf(EntityNotFoundException.class);
    }

    // ── deleteProjection ──────────────────────────────────────────────────────

    @Test
    void deleteProjection_deletesExistingProjection() {
        when(flowSheetRepository.findByIdAndUserId(sheetId, userId)).thenReturn(Optional.of(buildSheet()));
        CategoryProjectionEntity proj = buildProjection(new BigDecimal("200"));
        when(projectionRepository.findByFlowSheetIdAndCategoryIdAndUserId(sheetId, categoryId, userId))
                .thenReturn(Optional.of(proj));

        projectionService.deleteProjection(userId, sheetId, categoryId);

        verify(projectionRepository).delete(proj);
    }

    @Test
    void deleteProjection_throws404_whenProjectionNotFound() {
        when(flowSheetRepository.findByIdAndUserId(sheetId, userId)).thenReturn(Optional.of(buildSheet()));
        when(projectionRepository.findByFlowSheetIdAndCategoryIdAndUserId(sheetId, categoryId, userId))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> projectionService.deleteProjection(userId, sheetId, categoryId))
                .isInstanceOf(EntityNotFoundException.class);
    }

    // ── getProjectionSummary ──────────────────────────────────────────────────

    @Test
    void getProjectionSummary_computesCorrectActualsAndColors() {
        when(flowSheetRepository.findByIdAndUserId(sheetId, userId)).thenReturn(Optional.of(buildSheet()));

        CategoryProjectionEntity proj = buildProjection(new BigDecimal("500"));
        when(projectionRepository.findByFlowSheetIdAndUserId(sheetId, userId)).thenReturn(List.of(proj));

        // Actual = 300 (under budget)
        EntryEntity entry = buildEntry("expense", new BigDecimal("300"), null);
        when(entryRepository.findByFlowSheetIdAndIsDeletedFalse(sheetId)).thenReturn(List.of(entry));

        CategoryEntity cat = buildCategory("expense");
        when(categoryRepository.findAllById(any())).thenReturn(List.of(cat));

        ProjectionSummaryResponse summary = projectionService.getProjectionSummary(userId, sheetId);

        assertThat(summary.flowSheetId()).isEqualTo(sheetId);
        assertThat(summary.byCategory()).hasSize(1);

        ProjectionSummaryResponse.CategoryRow row = summary.byCategory().get(0);
        assertThat(row.projectedAmount()).isEqualByComparingTo("500");
        assertThat(row.actualAmount()).isEqualByComparingTo("300");
        // Under budget → expense natural color
        assertThat(row.statusColor()).isEqualTo(ProjectionService.COLOR_EXPENSE_NATURAL);
    }

    @Test
    void getProjectionSummary_usesConvertedAmountForActuals() {
        when(flowSheetRepository.findByIdAndUserId(sheetId, userId)).thenReturn(Optional.of(buildSheet()));

        CategoryProjectionEntity proj = buildProjection(new BigDecimal("500"));
        when(projectionRepository.findByFlowSheetIdAndUserId(sheetId, userId)).thenReturn(List.of(proj));

        // Entry with convertedAmount — should use convertedAmount, not amount
        EntryEntity entry = buildEntry("expense", new BigDecimal("100"), new BigDecimal("450"));
        when(entryRepository.findByFlowSheetIdAndIsDeletedFalse(sheetId)).thenReturn(List.of(entry));

        CategoryEntity cat = buildCategory("expense");
        when(categoryRepository.findAllById(any())).thenReturn(List.of(cat));

        ProjectionSummaryResponse summary = projectionService.getProjectionSummary(userId, sheetId);

        assertThat(summary.byCategory().get(0).actualAmount()).isEqualByComparingTo("450");
    }

    @Test
    void getProjectionSummary_overBudget_returnsRedColor() {
        when(flowSheetRepository.findByIdAndUserId(sheetId, userId)).thenReturn(Optional.of(buildSheet()));

        CategoryProjectionEntity proj = buildProjection(new BigDecimal("200"));
        when(projectionRepository.findByFlowSheetIdAndUserId(sheetId, userId)).thenReturn(List.of(proj));

        EntryEntity entry = buildEntry("expense", new BigDecimal("300"), null);
        when(entryRepository.findByFlowSheetIdAndIsDeletedFalse(sheetId)).thenReturn(List.of(entry));

        CategoryEntity cat = buildCategory("expense");
        when(categoryRepository.findAllById(any())).thenReturn(List.of(cat));

        ProjectionSummaryResponse summary = projectionService.getProjectionSummary(userId, sheetId);

        assertThat(summary.byCategory().get(0).statusColor()).isEqualTo(ProjectionService.COLOR_OVER_BUDGET);
    }

    @Test
    void getProjectionSummary_atBudget_returnsNeutralColor() {
        when(flowSheetRepository.findByIdAndUserId(sheetId, userId)).thenReturn(Optional.of(buildSheet()));

        CategoryProjectionEntity proj = buildProjection(new BigDecimal("300"));
        when(projectionRepository.findByFlowSheetIdAndUserId(sheetId, userId)).thenReturn(List.of(proj));

        EntryEntity entry = buildEntry("expense", new BigDecimal("300"), null);
        when(entryRepository.findByFlowSheetIdAndIsDeletedFalse(sheetId)).thenReturn(List.of(entry));

        CategoryEntity cat = buildCategory("expense");
        when(categoryRepository.findAllById(any())).thenReturn(List.of(cat));

        ProjectionSummaryResponse summary = projectionService.getProjectionSummary(userId, sheetId);

        assertThat(summary.byCategory().get(0).statusColor()).isEqualTo(ProjectionService.COLOR_AT_BUDGET);
    }

    // ── carryOverProjections ──────────────────────────────────────────────────

    @Test
    void carryOverProjections_copiesProjectionsToNewSheet() {
        UUID newSheetId = UUID.randomUUID();
        CategoryProjectionEntity proj = buildProjection(new BigDecimal("400"));
        when(projectionRepository.findByFlowSheetIdAndUserId(sheetId, userId)).thenReturn(List.of(proj));

        projectionService.carryOverProjections(userId, sheetId, newSheetId);

        verify(projectionRepository).saveAll(argThat(list -> {
            @SuppressWarnings("unchecked")
            List<CategoryProjectionEntity> copies = (List<CategoryProjectionEntity>) list;
            return copies.size() == 1
                    && copies.get(0).getFlowSheetId().equals(newSheetId)
                    && copies.get(0).getProjectedAmount().compareTo(new BigDecimal("400")) == 0;
        }));
    }

    @Test
    void carryOverProjections_doesNothingWhenNoProjections() {
        UUID newSheetId = UUID.randomUUID();
        when(projectionRepository.findByFlowSheetIdAndUserId(sheetId, userId)).thenReturn(List.of());

        projectionService.carryOverProjections(userId, sheetId, newSheetId);

        verify(projectionRepository, never()).saveAll(any());
    }

    // ── computeStatusColor ────────────────────────────────────────────────────

    @Test
    void computeStatusColor_underBudget_returnsNaturalColor() {
        assertThat(ProjectionService.computeStatusColor(new BigDecimal("100"), new BigDecimal("200"), "income"))
                .isEqualTo(ProjectionService.COLOR_INCOME_NATURAL);
        assertThat(ProjectionService.computeStatusColor(new BigDecimal("100"), new BigDecimal("200"), "expense"))
                .isEqualTo(ProjectionService.COLOR_EXPENSE_NATURAL);
        assertThat(ProjectionService.computeStatusColor(new BigDecimal("100"), new BigDecimal("200"), "savings"))
                .isEqualTo(ProjectionService.COLOR_SAVINGS_NATURAL);
    }

    @Test
    void computeStatusColor_atBudget_returnsWarmNeutral() {
        assertThat(ProjectionService.computeStatusColor(new BigDecimal("300"), new BigDecimal("300"), "expense"))
                .isEqualTo(ProjectionService.COLOR_AT_BUDGET);
    }

    @Test
    void computeStatusColor_overBudget_returnsSoftRed_regardlessOfType() {
        assertThat(ProjectionService.computeStatusColor(new BigDecimal("400"), new BigDecimal("300"), "income"))
                .isEqualTo(ProjectionService.COLOR_OVER_BUDGET);
        assertThat(ProjectionService.computeStatusColor(new BigDecimal("400"), new BigDecimal("300"), "expense"))
                .isEqualTo(ProjectionService.COLOR_OVER_BUDGET);
        assertThat(ProjectionService.computeStatusColor(new BigDecimal("400"), new BigDecimal("300"), "savings"))
                .isEqualTo(ProjectionService.COLOR_OVER_BUDGET);
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    private FlowSheetEntity buildSheet() {
        return FlowSheetEntity.builder()
                .id(sheetId).userId(userId).periodType("monthly")
                .startDate(LocalDate.now().minusMonths(1))
                .endDate(LocalDate.now().plusDays(10))
                .status("active").editLocked(false)
                .createdAt(Instant.now()).updatedAt(Instant.now())
                .build();
    }

    private CategoryProjectionEntity buildProjection(BigDecimal amount) {
        return CategoryProjectionEntity.builder()
                .id(UUID.randomUUID())
                .flowSheetId(sheetId)
                .userId(userId)
                .categoryId(categoryId)
                .projectedAmount(amount)
                .currency("USD")
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();
    }

    private CategoryEntity buildCategory(String entryType) {
        return CategoryEntity.builder()
                .id(categoryId).userId(userId)
                .name("Test Category").entryType(entryType)
                .isDefault(false).sortOrder(0)
                .createdAt(Instant.now())
                .build();
    }

    private EntryEntity buildEntry(String type, BigDecimal amount, BigDecimal convertedAmount) {
        return EntryEntity.builder()
                .id(UUID.randomUUID()).flowSheetId(sheetId).userId(userId)
                .entryType(type).category(categoryId.toString())
                .amount(amount).convertedAmount(convertedAmount)
                .currency("USD").entryDate(LocalDate.now()).isDeleted(false)
                .createdAt(Instant.now()).updatedAt(Instant.now())
                .build();
    }
}
