package com.lunero.trend;

import com.lunero.category.CategoryEntity;
import com.lunero.category.CategoryRepository;
import com.lunero.entry.EntryEntity;
import net.jqwik.api.*;
import net.jqwik.api.constraints.IntRange;
import net.jqwik.api.constraints.Positive;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * Property-based tests for the Trend domain.
 *
 * Property 17: Trend Aggregation Correctness
 *   For any view and date range, totalIncome/totalExpenses/totalSavings per bucket must equal
 *   the sum of convertedAmount (or amount) for entries within that bucket's date range.
 *
 * Property 18: Trend Breakdown Sums to Period Total
 *   For any trend period, the sum of all entries in its breakdown must equal the period totals.
 *
 * Property 19: Category Filter Isolation
 *   When a categoryId filter is applied, only entries belonging to that category contribute
 *   to the aggregated totals.
 */
class TrendPropertyTest {

    private TrendService freshService(TrendRepository repo) {
        CategoryRepository catRepo = mock(CategoryRepository.class);
        return new TrendService(repo, catRepo);
    }

    private TrendService freshService(TrendRepository repo, CategoryRepository catRepo) {
        return new TrendService(repo, catRepo);
    }

    // ── Property 17: Trend Aggregation Correctness ────────────────────────────

    /**
     * // Feature: lunero-budgeting-app, Property 17: Trend Aggregation Correctness
     *
     * For any set of entries within a monthly range, the sum of totalIncome across all
     * monthly buckets must equal the sum of all income entry amounts.
     *
     * Validates: Requirements 6.1, 6.2, 6.3
     */
    @Property(tries = 300)
    void property17_monthlyAggregation_totalsMustMatchEntrySum(
            @ForAll @IntRange(min = 0, max = 8) int incomeCount,
            @ForAll @IntRange(min = 0, max = 8) int expenseCount,
            @ForAll @IntRange(min = 0, max = 8) int savingsCount,
            @ForAll @Positive int baseAmount) {

        UUID userId = UUID.randomUUID();
        LocalDate from = LocalDate.of(2024, 1, 1);
        LocalDate to   = LocalDate.of(2024, 3, 31);

        BigDecimal amount = BigDecimal.valueOf(baseAmount);
        List<EntryEntity> entries = buildEntriesAcrossMonths(
                userId, incomeCount, expenseCount, savingsCount, amount, from, to);

        TrendRepository repo = mock(TrendRepository.class);
        when(repo.findByUserIdAndDateRange(userId, from, to)).thenReturn(entries);

        TrendData result = freshService(repo).getTrends(userId, "monthly", from, to, null);

        // Sum across all buckets must equal sum of all entries
        BigDecimal sumIncome   = result.periods().stream()
                .map(TrendPeriod::totalIncome).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal sumExpenses = result.periods().stream()
                .map(TrendPeriod::totalExpenses).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal sumSavings  = result.periods().stream()
                .map(TrendPeriod::totalSavings).reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal expectedIncome   = amount.multiply(BigDecimal.valueOf(incomeCount));
        BigDecimal expectedExpenses = amount.multiply(BigDecimal.valueOf(expenseCount));
        BigDecimal expectedSavings  = amount.multiply(BigDecimal.valueOf(savingsCount));

        assertThat(sumIncome).isEqualByComparingTo(expectedIncome);
        assertThat(sumExpenses).isEqualByComparingTo(expectedExpenses);
        assertThat(sumSavings).isEqualByComparingTo(expectedSavings);
    }

    /**
     * // Feature: lunero-budgeting-app, Property 17: Trend Aggregation Correctness
     *
     * For any set of entries, availableBalance per bucket must equal
     * totalIncome − (totalExpenses + totalSavings) for that bucket.
     *
     * Validates: Requirements 6.1, 6.2, 6.3
     */
    @Property(tries = 300)
    void property17_availableBalancePerBucketIsCorrect(
            @ForAll @IntRange(min = 0, max = 5) int incomeCount,
            @ForAll @IntRange(min = 0, max = 5) int expenseCount,
            @ForAll @IntRange(min = 0, max = 5) int savingsCount,
            @ForAll @Positive int baseAmount) {

        UUID userId = UUID.randomUUID();
        LocalDate from = LocalDate.of(2024, 1, 1);
        LocalDate to   = LocalDate.of(2024, 1, 31);

        BigDecimal amount = BigDecimal.valueOf(baseAmount);
        List<EntryEntity> entries = buildEntriesInMonth(
                userId, incomeCount, expenseCount, savingsCount, amount, 2024, 1);

        TrendRepository repo = mock(TrendRepository.class);
        when(repo.findByUserIdAndDateRange(userId, from, to)).thenReturn(entries);

        TrendData result = freshService(repo).getTrends(userId, "monthly", from, to, null);

        for (TrendPeriod period : result.periods()) {
            BigDecimal expected = period.totalIncome()
                    .subtract(period.totalExpenses().add(period.totalSavings()));
            assertThat(period.availableBalance()).isEqualByComparingTo(expected);
        }
    }

    /**
     * // Feature: lunero-budgeting-app, Property 17: Trend Aggregation Correctness
     *
     * When convertedAmount is present on an entry, it must be used instead of amount
     * in the aggregated totals.
     *
     * Validates: Requirements 6.1, 10.3
     */
    @Property(tries = 200)
    void property17_aggregationUsesConvertedAmountWhenPresent(
            @ForAll @Positive int originalAmount,
            @ForAll @Positive int convertedAmount) {

        UUID userId = UUID.randomUUID();
        LocalDate from = LocalDate.of(2024, 1, 1);
        LocalDate to   = LocalDate.of(2024, 1, 31);

        EntryEntity entry = EntryEntity.builder()
                .id(UUID.randomUUID()).flowSheetId(UUID.randomUUID()).userId(userId)
                .entryType("income").category("TestCategory")
                .amount(BigDecimal.valueOf(originalAmount))
                .convertedAmount(BigDecimal.valueOf(convertedAmount))
                .currency("EUR").entryDate(LocalDate.of(2024, 1, 15)).isDeleted(false)
                .build();

        TrendRepository repo = mock(TrendRepository.class);
        when(repo.findByUserIdAndDateRange(userId, from, to)).thenReturn(List.of(entry));

        TrendData result = freshService(repo).getTrends(userId, "monthly", from, to, null);

        BigDecimal totalIncome = result.periods().stream()
                .map(TrendPeriod::totalIncome).reduce(BigDecimal.ZERO, BigDecimal::add);

        assertThat(totalIncome).isEqualByComparingTo(BigDecimal.valueOf(convertedAmount));
    }

    // ── Property 18: Trend Breakdown Sums to Period Total ─────────────────────

    /**
     * // Feature: lunero-budgeting-app, Property 18: Trend Breakdown Sums to Period Total
     *
     * For any set of entries in a period, the sum of all breakdown entries must equal
     * the period's aggregated totals.
     *
     * Validates: Requirements 6.5
     */
    @Property(tries = 300)
    void property18_breakdownSumEqualsPeriodTotal(
            @ForAll @IntRange(min = 1, max = 10) int incomeCount,
            @ForAll @IntRange(min = 0, max = 10) int expenseCount,
            @ForAll @IntRange(min = 0, max = 10) int savingsCount,
            @ForAll @Positive int baseAmount) {

        UUID userId = UUID.randomUUID();
        LocalDate start = LocalDate.of(2024, 1, 1);
        LocalDate end   = LocalDate.of(2024, 1, 31);

        BigDecimal amount = BigDecimal.valueOf(baseAmount);
        List<EntryEntity> entries = buildEntriesInMonth(
                userId, incomeCount, expenseCount, savingsCount, amount, 2024, 1);

        TrendRepository repo = mock(TrendRepository.class);
        when(repo.findByUserIdAndDateRange(userId, start, end)).thenReturn(entries);
        when(repo.findByUserIdAndDateRange(eq(userId), any(), any())).thenReturn(entries);

        TrendData trendData = freshService(repo).getTrends(userId, "monthly", start, end, null);
        TrendPeriod period = trendData.periods().get(0);

        // Recompute from raw entries (simulating breakdown)
        BigDecimal breakdownIncome   = entries.stream()
                .filter(e -> "income".equals(e.getEntryType()))
                .map(TrendService::effectiveAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal breakdownExpenses = entries.stream()
                .filter(e -> "expense".equals(e.getEntryType()))
                .map(TrendService::effectiveAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal breakdownSavings  = entries.stream()
                .filter(e -> "savings".equals(e.getEntryType()))
                .map(TrendService::effectiveAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        assertThat(period.totalIncome()).isEqualByComparingTo(breakdownIncome);
        assertThat(period.totalExpenses()).isEqualByComparingTo(breakdownExpenses);
        assertThat(period.totalSavings()).isEqualByComparingTo(breakdownSavings);
    }

    /**
     * // Feature: lunero-budgeting-app, Property 18: Trend Breakdown Sums to Period Total
     *
     * getBreakdown must return exactly the entries whose entryDate falls within the
     * parsed start/end dates of the dataPointId.
     *
     * Validates: Requirements 6.5
     */
    @Property(tries = 200)
    void property18_breakdownReturnsEntriesForCorrectDateRange(
            @ForAll @IntRange(min = 1, max = 10) int entryCount,
            @ForAll @Positive int baseAmount) {

        UUID userId = UUID.randomUUID();
        LocalDate start = LocalDate.of(2024, 2, 1);
        LocalDate end   = LocalDate.of(2024, 2, 29);
        String dataPointId = "monthly_2024-02-01_2024-02-29";

        BigDecimal amount = BigDecimal.valueOf(baseAmount);
        List<EntryEntity> entries = new ArrayList<>();
        for (int i = 0; i < entryCount; i++) {
            entries.add(EntryEntity.builder()
                    .id(UUID.randomUUID()).flowSheetId(UUID.randomUUID()).userId(userId)
                    .entryType("expense").category("TestCategory")
                    .amount(amount).currency("USD")
                    .entryDate(start.plusDays(i % 28)).isDeleted(false)
                    .build());
        }

        TrendRepository repo = mock(TrendRepository.class);
        when(repo.findByUserIdAndDateRange(userId, start, end)).thenReturn(entries);

        List<EntryEntity> breakdown = freshService(repo).getBreakdown(userId, dataPointId, null);

        assertThat(breakdown).hasSize(entryCount);
        verify(repo).findByUserIdAndDateRange(userId, start, end);
    }

    // ── Property 19: Category Filter Isolation ────────────────────────────────

    /**
     * // Feature: lunero-budgeting-app, Property 19: Category Filter
     *
     * When a categoryId filter is applied to getTrends, the service must call the
     * category-filtered repository method and NOT the unfiltered one.
     *
     * Validates: Requirements 6.6
     */
    @Property(tries = 200)
    void property19_categoryFilter_callsFilteredRepositoryMethod(
            @ForAll @IntRange(min = 0, max = 5) int entryCount,
            @ForAll @Positive int baseAmount) {

        UUID userId     = UUID.randomUUID();
        UUID categoryId = UUID.randomUUID();
        String catName  = "FilteredCategory";
        LocalDate from  = LocalDate.of(2024, 1, 1);
        LocalDate to    = LocalDate.of(2024, 1, 31);

        BigDecimal amount = BigDecimal.valueOf(baseAmount);
        List<EntryEntity> filteredEntries = new ArrayList<>();
        for (int i = 0; i < entryCount; i++) {
            filteredEntries.add(EntryEntity.builder()
                    .id(UUID.randomUUID()).flowSheetId(UUID.randomUUID()).userId(userId)
                    .entryType("expense").category(catName)
                    .amount(amount).currency("USD")
                    .entryDate(from.plusDays(i % 30)).isDeleted(false)
                    .build());
        }

        TrendRepository repo = mock(TrendRepository.class);
        when(repo.findByUserIdAndDateRangeAndCategory(userId, from, to, catName))
                .thenReturn(filteredEntries);

        CategoryRepository catRepo = mock(CategoryRepository.class);
        when(catRepo.findById(categoryId)).thenReturn(Optional.of(
                CategoryEntity.builder().id(categoryId).name(catName).entryType("expense").build()));

        freshService(repo, catRepo).getTrends(userId, "monthly", from, to, categoryId);

        verify(repo).findByUserIdAndDateRangeAndCategory(userId, from, to, catName);
        verify(repo, never()).findByUserIdAndDateRange(any(), any(), any());
    }

    /**
     * // Feature: lunero-budgeting-app, Property 19: Category Filter
     *
     * When a categoryId filter is applied to getTrends (yearly), the service must call
     * the category-filtered repository method and NOT the unfiltered one.
     *
     * Validates: Requirements 6.6
     */
    @Property(tries = 100)
    void property19_categoryFilter_yearly_callsFilteredRepositoryMethod(
            @ForAll @IntRange(min = 0, max = 5) int entryCount,
            @ForAll @Positive int baseAmount) {

        UUID userId     = UUID.randomUUID();
        UUID categoryId = UUID.randomUUID();
        String catName  = "FilteredCategory";

        BigDecimal amount = BigDecimal.valueOf(baseAmount);
        List<EntryEntity> filteredEntries = new ArrayList<>();
        for (int i = 0; i < entryCount; i++) {
            filteredEntries.add(EntryEntity.builder()
                    .id(UUID.randomUUID()).flowSheetId(UUID.randomUUID()).userId(userId)
                    .entryType("income").category(catName)
                    .amount(amount).currency("USD")
                    .entryDate(LocalDate.of(2024, 1 + (i % 12), 1)).isDeleted(false)
                    .build());
        }

        TrendRepository repo = mock(TrendRepository.class);
        when(repo.findAllByUserIdAndCategory(userId, catName)).thenReturn(filteredEntries);

        CategoryRepository catRepo = mock(CategoryRepository.class);
        when(catRepo.findById(categoryId)).thenReturn(Optional.of(
                CategoryEntity.builder().id(categoryId).name(catName).entryType("income").build()));

        freshService(repo, catRepo).getTrends(userId, "yearly", null, null, categoryId);

        verify(repo).findAllByUserIdAndCategory(userId, catName);
        verify(repo, never()).findAllByUserId(any());
    }

    /**
     * // Feature: lunero-budgeting-app, Property 19: Category Filter
     *
     * When a categoryId filter is applied to getBreakdown, the service must call the
     * category-filtered repository method.
     *
     * Validates: Requirements 6.6
     */
    @Property(tries = 100)
    void property19_breakdownCategoryFilter_callsFilteredRepositoryMethod(
            @ForAll @Positive int baseAmount) {

        UUID userId     = UUID.randomUUID();
        UUID categoryId = UUID.randomUUID();
        String catName  = "FilteredCategory";
        LocalDate start = LocalDate.of(2024, 1, 1);
        LocalDate end   = LocalDate.of(2024, 1, 7);
        String dataPointId = "weekly_2024-01-01_2024-01-07";

        TrendRepository repo = mock(TrendRepository.class);
        when(repo.findByUserIdAndDateRangeAndCategory(userId, start, end, catName))
                .thenReturn(List.of());

        CategoryRepository catRepo = mock(CategoryRepository.class);
        when(catRepo.findById(categoryId)).thenReturn(Optional.of(
                CategoryEntity.builder().id(categoryId).name(catName).entryType("expense").build()));

        freshService(repo, catRepo).getBreakdown(userId, dataPointId, categoryId);

        verify(repo).findByUserIdAndDateRangeAndCategory(userId, start, end, catName);
        verify(repo, never()).findByUserIdAndDateRange(any(), any(), any());
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    private List<EntryEntity> buildEntriesInMonth(UUID userId, int income, int expense,
                                                   int savings, BigDecimal amount,
                                                   int year, int month) {
        List<EntryEntity> list = new ArrayList<>();
        LocalDate base = LocalDate.of(year, month, 1);
        for (int i = 0; i < income;   i++) list.add(entry(userId, "income",  amount, base.plusDays(i % 28)));
        for (int i = 0; i < expense;  i++) list.add(entry(userId, "expense", amount, base.plusDays(i % 28)));
        for (int i = 0; i < savings;  i++) list.add(entry(userId, "savings", amount, base.plusDays(i % 28)));
        return list;
    }

    private List<EntryEntity> buildEntriesAcrossMonths(UUID userId, int income, int expense,
                                                        int savings, BigDecimal amount,
                                                        LocalDate from, LocalDate to) {
        List<EntryEntity> list = new ArrayList<>();
        // Spread entries across the range
        long days = from.until(to).getDays();
        for (int i = 0; i < income;   i++) list.add(entry(userId, "income",  amount, from.plusDays((long) i * days / Math.max(income, 1))));
        for (int i = 0; i < expense;  i++) list.add(entry(userId, "expense", amount, from.plusDays((long) i * days / Math.max(expense, 1))));
        for (int i = 0; i < savings;  i++) list.add(entry(userId, "savings", amount, from.plusDays((long) i * days / Math.max(savings, 1))));
        return list;
    }

    private EntryEntity entry(UUID userId, String type, BigDecimal amount, LocalDate date) {
        return EntryEntity.builder()
                .id(UUID.randomUUID()).flowSheetId(UUID.randomUUID()).userId(userId)
                .entryType(type).category("TestCategory")
                .amount(amount).currency("USD")
                .entryDate(date).isDeleted(false)
                .build();
    }
}
