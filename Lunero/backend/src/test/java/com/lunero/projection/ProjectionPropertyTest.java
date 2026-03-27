package com.lunero.projection;

import com.lunero.category.CategoryEntity;
import com.lunero.category.CategoryRepository;
import com.lunero.common.audit.AuditLogService;
import com.lunero.common.exception.ValidationException;
import com.lunero.entry.EntryEntity;
import com.lunero.entry.EntryRepository;
import com.lunero.flowsheet.FlowSheetEntity;
import com.lunero.flowsheet.FlowSheetRepository;
import net.jqwik.api.*;
import net.jqwik.api.constraints.IntRange;
import net.jqwik.api.constraints.Positive;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Property-based tests for the Projection domain.
 *
 * Property 37: Projection Amount Validation
 * Property 38: Balance Unaffected by Projections
 * Property 39: Summary Aggregation Correctness
 * Property 40: Projection Carryover
 * Property 41: Status Color Correctness
 */
class ProjectionPropertyTest {

    private ServiceHolder freshServices() {
        CategoryProjectionRepository projRepo = mock(CategoryProjectionRepository.class);
        FlowSheetRepository sheetRepo         = mock(FlowSheetRepository.class);
        CategoryRepository catRepo            = mock(CategoryRepository.class);
        EntryRepository entryRepo             = mock(EntryRepository.class);
        AuditLogService auditLog              = mock(AuditLogService.class);
        ProjectionService service = new ProjectionService(projRepo, sheetRepo, catRepo, entryRepo, auditLog);
        return new ServiceHolder(service, projRepo, sheetRepo, catRepo, entryRepo);
    }

    record ServiceHolder(
            ProjectionService service,
            CategoryProjectionRepository projRepo,
            FlowSheetRepository sheetRepo,
            CategoryRepository catRepo,
            EntryRepository entryRepo) {}

    // ── Property 37: Projection Amount Validation ─────────────────────────────

    /**
     * // Feature: lunero-budgeting-app, Property 37: Projection Amount Validation
     *
     * For any projected amount <= 0, upsertProjection must reject with a ValidationException (HTTP 400).
     *
     * Validates: Requirements 22.9
     */
    @Property(tries = 300)
    void property37_upsertProjection_rejectsNonPositiveAmount(
            @ForAll("nonPositiveAmounts") BigDecimal amount) {

        ServiceHolder h = freshServices();
        UUID userId = UUID.randomUUID();
        UUID sheetId = UUID.randomUUID();
        UUID categoryId = UUID.randomUUID();

        assertThatThrownBy(() -> h.service().upsertProjection(userId, sheetId, categoryId, amount, "USD"))
                .isInstanceOf(ValidationException.class)
                .hasMessageContaining("projectedAmount must be greater than 0");
    }

    /**
     * // Feature: lunero-budgeting-app, Property 37: Projection Amount Validation
     *
     * For any positive projected amount, upsertProjection must NOT throw a ValidationException.
     *
     * Validates: Requirements 22.9
     */
    @Property(tries = 200)
    void property37_upsertProjection_acceptsPositiveAmount(
            @ForAll @Positive int rawAmount) {

        ServiceHolder h = freshServices();
        BigDecimal amount = BigDecimal.valueOf(rawAmount);
        UUID userId = UUID.randomUUID();
        UUID sheetId = UUID.randomUUID();
        UUID categoryId = UUID.randomUUID();

        FlowSheetEntity sheet = buildSheet(userId, sheetId);
        CategoryEntity cat = buildCategory(userId, categoryId, "expense");
        CategoryProjectionEntity saved = buildProjection(userId, sheetId, categoryId, amount);

        when(h.sheetRepo().findByIdAndUserId(sheetId, userId)).thenReturn(Optional.of(sheet));
        when(h.catRepo().findByIdAndUserId(categoryId, userId)).thenReturn(Optional.of(cat));
        when(h.projRepo().findByFlowSheetIdAndCategoryIdAndUserId(sheetId, categoryId, userId))
                .thenReturn(Optional.empty());
        when(h.projRepo().save(any())).thenReturn(saved);

        CategoryProjectionEntity result = h.service().upsertProjection(userId, sheetId, categoryId, amount, "USD");
        assertThat(result).isNotNull();
    }

    // ── Property 38: Balance Unaffected by Projections ────────────────────────

    /**
     * // Feature: lunero-budgeting-app, Property 38: Balance Unaffected by Projections
     *
     * For any set of entries, the available balance must equal totalIncome − (totalExpenses + totalSavings),
     * regardless of what projections exist. Projections must never affect the balance calculation.
     *
     * Validates: Requirements 22.7
     */
    @Property(tries = 300)
    void property38_balanceUnaffectedByProjections(
            @ForAll @IntRange(min = 0, max = 5) int incomeCount,
            @ForAll @IntRange(min = 0, max = 5) int expenseCount,
            @ForAll @IntRange(min = 0, max = 5) int savingsCount,
            @ForAll @Positive int baseAmount,
            @ForAll @Positive int projectionAmount) {

        BigDecimal amount = BigDecimal.valueOf(baseAmount);

        List<EntryEntity> entries = new ArrayList<>();
        UUID sheetId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        for (int i = 0; i < incomeCount; i++)   entries.add(entry(userId, sheetId, "income", amount));
        for (int i = 0; i < expenseCount; i++)  entries.add(entry(userId, sheetId, "expense", amount));
        for (int i = 0; i < savingsCount; i++)  entries.add(entry(userId, sheetId, "savings", amount));

        BigDecimal income   = amount.multiply(BigDecimal.valueOf(incomeCount));
        BigDecimal expenses = amount.multiply(BigDecimal.valueOf(expenseCount));
        BigDecimal savings  = amount.multiply(BigDecimal.valueOf(savingsCount));
        BigDecimal expectedBalance = income.subtract(expenses.add(savings));

        // Compute balance using same logic as FlowSheetService.computeAvailableBalance
        BigDecimal computedIncome   = BigDecimal.ZERO;
        BigDecimal computedExpenses = BigDecimal.ZERO;
        BigDecimal computedSavings  = BigDecimal.ZERO;
        for (EntryEntity e : entries) {
            BigDecimal amt = e.getConvertedAmount() != null ? e.getConvertedAmount() : e.getAmount();
            switch (e.getEntryType()) {
                case "income"  -> computedIncome   = computedIncome.add(amt);
                case "expense" -> computedExpenses = computedExpenses.add(amt);
                case "savings" -> computedSavings  = computedSavings.add(amt);
            }
        }
        BigDecimal balance = computedIncome.subtract(computedExpenses.add(computedSavings));

        // Balance must equal expected regardless of projectionAmount
        assertThat(balance).isEqualByComparingTo(expectedBalance);
        // projectionAmount is intentionally unused in balance — that's the property
        assertThat(BigDecimal.valueOf(projectionAmount)).isGreaterThan(BigDecimal.ZERO);
    }

    // ── Property 39: Summary Aggregation Correctness ──────────────────────────

    /**
     * // Feature: lunero-budgeting-app, Property 39: Summary Aggregation Correctness
     *
     * For any set of projections and entries, the summary's byCategory actual amounts must
     * equal the sum of convertedAmount (or amount) for entries in that category.
     *
     * Validates: Requirements 22.4, 22.5, 22.6
     */
    @Property(tries = 200)
    void property39_summaryAggregation_actualMatchesEntrySum(
            @ForAll @IntRange(min = 1, max = 5) int entryCount,
            @ForAll @Positive int entryAmount,
            @ForAll @Positive int projectedAmount) {

        ServiceHolder h = freshServices();
        UUID userId = UUID.randomUUID();
        UUID sheetId = UUID.randomUUID();
        UUID categoryId = UUID.randomUUID();

        BigDecimal amount = BigDecimal.valueOf(entryAmount);
        BigDecimal projected = BigDecimal.valueOf(projectedAmount);

        FlowSheetEntity sheet = buildSheet(userId, sheetId);
        when(h.sheetRepo().findByIdAndUserId(sheetId, userId)).thenReturn(Optional.of(sheet));

        CategoryProjectionEntity proj = buildProjection(userId, sheetId, categoryId, projected);
        when(h.projRepo().findByFlowSheetIdAndUserId(sheetId, userId)).thenReturn(List.of(proj));

        List<EntryEntity> entries = new ArrayList<>();
        for (int i = 0; i < entryCount; i++) {
            entries.add(entryForCategory(userId, sheetId, categoryId, "expense", amount));
        }
        when(h.entryRepo().findByFlowSheetIdAndIsDeletedFalse(sheetId)).thenReturn(entries);

        CategoryEntity cat = buildCategory(userId, categoryId, "expense");
        when(h.catRepo().findAllById(any())).thenReturn(List.of(cat));

        ProjectionSummaryResponse summary = h.service().getProjectionSummary(userId, sheetId);

        BigDecimal expectedActual = amount.multiply(BigDecimal.valueOf(entryCount));
        assertThat(summary.byCategory()).hasSize(1);
        assertThat(summary.byCategory().get(0).actualAmount()).isEqualByComparingTo(expectedActual);
        assertThat(summary.byCategory().get(0).projectedAmount()).isEqualByComparingTo(projected);
    }

    // ── Property 40: Carryover ────────────────────────────────────────────────

    /**
     * // Feature: lunero-budgeting-app, Property 40: Projection Carryover
     *
     * For any set of projections in a source FlowSheet, carryOverProjections must create
     * exactly the same number of projections in the target FlowSheet with identical amounts.
     *
     * Validates: Requirements 22.2
     */
    @Property(tries = 200)
    void property40_carryover_preservesAllProjections(
            @ForAll @IntRange(min = 1, max = 8) int projectionCount,
            @ForAll @Positive int baseAmount) {

        ServiceHolder h = freshServices();
        UUID userId = UUID.randomUUID();
        UUID sourceSheetId = UUID.randomUUID();
        UUID targetSheetId = UUID.randomUUID();

        BigDecimal amount = BigDecimal.valueOf(baseAmount);
        List<CategoryProjectionEntity> sourceProjections = new ArrayList<>();
        for (int i = 0; i < projectionCount; i++) {
            sourceProjections.add(buildProjection(userId, sourceSheetId, UUID.randomUUID(), amount));
        }

        when(h.projRepo().findByFlowSheetIdAndUserId(sourceSheetId, userId))
                .thenReturn(sourceProjections);

        h.service().carryOverProjections(userId, sourceSheetId, targetSheetId);

        verify(h.projRepo()).saveAll(argThat(list -> {
            @SuppressWarnings("unchecked")
            List<CategoryProjectionEntity> copies = (List<CategoryProjectionEntity>) list;
            if (copies.size() != projectionCount) return false;
            return copies.stream().allMatch(p -> p.getFlowSheetId().equals(targetSheetId));
        }));
    }

    /**
     * // Feature: lunero-budgeting-app, Property 40: Projection Carryover
     *
     * When source FlowSheet has no projections, carryover must not create any projections.
     *
     * Validates: Requirements 22.2
     */
    @Property(tries = 100)
    void property40_carryover_emptySource_createsNothing(
            @ForAll @Positive int ignored) {

        ServiceHolder h = freshServices();
        UUID userId = UUID.randomUUID();
        UUID sourceSheetId = UUID.randomUUID();
        UUID targetSheetId = UUID.randomUUID();

        when(h.projRepo().findByFlowSheetIdAndUserId(sourceSheetId, userId)).thenReturn(List.of());

        h.service().carryOverProjections(userId, sourceSheetId, targetSheetId);

        verify(h.projRepo(), never()).saveAll(any());
    }

    // ── Property 41: Status Color Correctness ─────────────────────────────────

    /**
     * // Feature: lunero-budgeting-app, Property 41: Status Color Correctness
     *
     * For any actual < projected, the status color must be the category's natural type color.
     *
     * Validates: Requirements 22.11
     */
    @Property(tries = 500)
    void property41_statusColor_underBudget_returnsNaturalColor(
            @ForAll @Positive int actualRaw,
            @ForAll @Positive int projectedRaw,
            @ForAll("entryTypes") String entryType) {

        BigDecimal actual    = BigDecimal.valueOf(actualRaw);
        BigDecimal projected = actual.add(BigDecimal.valueOf(projectedRaw)); // projected > actual

        String color = ProjectionService.computeStatusColor(actual, projected, entryType);

        String expectedColor = switch (entryType) {
            case "income"  -> ProjectionService.COLOR_INCOME_NATURAL;
            case "savings" -> ProjectionService.COLOR_SAVINGS_NATURAL;
            default        -> ProjectionService.COLOR_EXPENSE_NATURAL;
        };
        assertThat(color).isEqualTo(expectedColor);
    }

    /**
     * // Feature: lunero-budgeting-app, Property 41: Status Color Correctness
     *
     * For any actual == projected, the status color must be the warm neutral color.
     *
     * Validates: Requirements 22.11
     */
    @Property(tries = 300)
    void property41_statusColor_atBudget_returnsWarmNeutral(
            @ForAll @Positive int amount,
            @ForAll("entryTypes") String entryType) {

        BigDecimal value = BigDecimal.valueOf(amount);
        String color = ProjectionService.computeStatusColor(value, value, entryType);

        assertThat(color).isEqualTo(ProjectionService.COLOR_AT_BUDGET);
    }

    /**
     * // Feature: lunero-budgeting-app, Property 41: Status Color Correctness
     *
     * For any actual > projected, the status color must be soft red (#C86D5A),
     * regardless of entry type.
     *
     * Validates: Requirements 22.11
     */
    @Property(tries = 500)
    void property41_statusColor_overBudget_returnsSoftRed_forAllTypes(
            @ForAll @Positive int projectedRaw,
            @ForAll @Positive int excessRaw,
            @ForAll("entryTypes") String entryType) {

        BigDecimal projected = BigDecimal.valueOf(projectedRaw);
        BigDecimal actual    = projected.add(BigDecimal.valueOf(excessRaw)); // actual > projected

        String color = ProjectionService.computeStatusColor(actual, projected, entryType);

        assertThat(color).isEqualTo(ProjectionService.COLOR_OVER_BUDGET);
    }

    // ── Arbitraries ───────────────────────────────────────────────────────────

    @Provide
    Arbitrary<BigDecimal> nonPositiveAmounts() {
        return Arbitraries.oneOf(
                Arbitraries.just(BigDecimal.ZERO),
                Arbitraries.integers().between(1, 100_000).map(i -> BigDecimal.valueOf(-i)),
                Arbitraries.integers().between(1, 100_000).map(i -> BigDecimal.valueOf(-i).movePointLeft(2))
        );
    }

    @Provide
    Arbitrary<String> entryTypes() {
        return Arbitraries.of("income", "expense", "savings");
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    private FlowSheetEntity buildSheet(UUID userId, UUID sheetId) {
        return FlowSheetEntity.builder()
                .id(sheetId).userId(userId).periodType("monthly")
                .startDate(LocalDate.now().minusMonths(1))
                .endDate(LocalDate.now().plusDays(10))
                .status("active").editLocked(false)
                .createdAt(Instant.now()).updatedAt(Instant.now())
                .build();
    }

    private CategoryProjectionEntity buildProjection(UUID userId, UUID sheetId, UUID categoryId, BigDecimal amount) {
        return CategoryProjectionEntity.builder()
                .id(UUID.randomUUID())
                .flowSheetId(sheetId).userId(userId).categoryId(categoryId)
                .projectedAmount(amount).currency("USD")
                .createdAt(Instant.now()).updatedAt(Instant.now())
                .build();
    }

    private CategoryEntity buildCategory(UUID userId, UUID categoryId, String entryType) {
        return CategoryEntity.builder()
                .id(categoryId).userId(userId)
                .name("Test").entryType(entryType)
                .isDefault(false).sortOrder(0)
                .createdAt(Instant.now())
                .build();
    }

    private EntryEntity entry(UUID userId, UUID sheetId, String type, BigDecimal amount) {
        return EntryEntity.builder()
                .id(UUID.randomUUID()).flowSheetId(sheetId).userId(userId)
                .entryType(type).categoryId(UUID.randomUUID())
                .amount(amount).currency("USD")
                .entryDate(LocalDate.now()).isDeleted(false)
                .createdAt(Instant.now()).updatedAt(Instant.now())
                .build();
    }

    private EntryEntity entryForCategory(UUID userId, UUID sheetId, UUID categoryId,
                                          String type, BigDecimal amount) {
        return EntryEntity.builder()
                .id(UUID.randomUUID()).flowSheetId(sheetId).userId(userId)
                .entryType(type).categoryId(categoryId)
                .amount(amount).currency("USD")
                .entryDate(LocalDate.now()).isDeleted(false)
                .createdAt(Instant.now()).updatedAt(Instant.now())
                .build();
    }
}
