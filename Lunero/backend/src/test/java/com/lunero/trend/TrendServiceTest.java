package com.lunero.trend;

import com.lunero.common.exception.EntityNotFoundException;
import com.lunero.entry.EntryEntity;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TrendServiceTest {

    @Mock private TrendRepository trendRepository;

    private TrendService trendService;

    private final UUID userId     = UUID.randomUUID();
    private final UUID categoryId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        trendService = new TrendService(trendRepository);
    }

    // ── getTrends — weekly ────────────────────────────────────────────────────

    @Test
    void getTrends_weekly_aggregatesIntoBuckets() {
        LocalDate from = LocalDate.of(2024, 1, 1);
        LocalDate to   = LocalDate.of(2024, 1, 14);

        List<EntryEntity> entries = List.of(
                entry("income",  new BigDecimal("1000"), LocalDate.of(2024, 1, 3)),
                entry("expense", new BigDecimal("400"),  LocalDate.of(2024, 1, 3)),
                entry("savings", new BigDecimal("200"),  LocalDate.of(2024, 1, 10))
        );
        when(trendRepository.findByUserIdAndDateRange(userId, from, to)).thenReturn(entries);

        TrendData result = trendService.getTrends(userId, "weekly", from, to, null);

        assertThat(result.view()).isEqualTo("weekly");
        assertThat(result.periods()).isNotEmpty();

        // First week bucket should contain income + expense
        TrendPeriod firstWeek = result.periods().stream()
                .filter(p -> p.totalIncome().compareTo(BigDecimal.ZERO) > 0)
                .findFirst().orElseThrow();
        assertThat(firstWeek.totalIncome()).isEqualByComparingTo("1000");
        assertThat(firstWeek.totalExpenses()).isEqualByComparingTo("400");
        assertThat(firstWeek.availableBalance()).isEqualByComparingTo("600");
    }

    @Test
    void getTrends_weekly_requiresFromDate() {
        assertThatThrownBy(() -> trendService.getTrends(userId, "weekly", null, LocalDate.now(), null))
                .isInstanceOf(NullPointerException.class);
    }

    @Test
    void getTrends_weekly_requiresToDate() {
        assertThatThrownBy(() -> trendService.getTrends(userId, "weekly", LocalDate.now(), null, null))
                .isInstanceOf(NullPointerException.class);
    }

    // ── getTrends — monthly ───────────────────────────────────────────────────

    @Test
    void getTrends_monthly_aggregatesIntoMonthBuckets() {
        LocalDate from = LocalDate.of(2024, 1, 1);
        LocalDate to   = LocalDate.of(2024, 2, 29);

        List<EntryEntity> entries = List.of(
                entry("income",  new BigDecimal("3000"), LocalDate.of(2024, 1, 15)),
                entry("expense", new BigDecimal("800"),  LocalDate.of(2024, 1, 20)),
                entry("income",  new BigDecimal("3000"), LocalDate.of(2024, 2, 15))
        );
        when(trendRepository.findByUserIdAndDateRange(userId, from, to)).thenReturn(entries);

        TrendData result = trendService.getTrends(userId, "monthly", from, to, null);

        assertThat(result.view()).isEqualTo("monthly");
        assertThat(result.periods()).hasSize(2);

        TrendPeriod jan = result.periods().get(0);
        assertThat(jan.totalIncome()).isEqualByComparingTo("3000");
        assertThat(jan.totalExpenses()).isEqualByComparingTo("800");
        assertThat(jan.availableBalance()).isEqualByComparingTo("2200");

        TrendPeriod feb = result.periods().get(1);
        assertThat(feb.totalIncome()).isEqualByComparingTo("3000");
        assertThat(feb.totalExpenses()).isEqualByComparingTo("0");
    }

    @Test
    void getTrends_monthly_labelFormat() {
        LocalDate from = LocalDate.of(2024, 3, 1);
        LocalDate to   = LocalDate.of(2024, 3, 31);
        when(trendRepository.findByUserIdAndDateRange(userId, from, to)).thenReturn(List.of());

        TrendData result = trendService.getTrends(userId, "monthly", from, to, null);

        assertThat(result.periods()).hasSize(1);
        assertThat(result.periods().get(0).label()).isEqualTo("March 2024");
    }

    // ── getTrends — yearly ────────────────────────────────────────────────────

    @Test
    void getTrends_yearly_groupsByYear() {
        List<EntryEntity> entries = List.of(
                entry("income",  new BigDecimal("10000"), LocalDate.of(2023, 6, 1)),
                entry("expense", new BigDecimal("4000"),  LocalDate.of(2023, 8, 1)),
                entry("income",  new BigDecimal("12000"), LocalDate.of(2024, 3, 1))
        );
        when(trendRepository.findAllByUserId(userId)).thenReturn(entries);

        TrendData result = trendService.getTrends(userId, "yearly", null, null, null);

        assertThat(result.view()).isEqualTo("yearly");
        assertThat(result.periods()).hasSize(2);
        assertThat(result.periods().get(0).label()).isEqualTo("2023");
        assertThat(result.periods().get(0).totalIncome()).isEqualByComparingTo("10000");
        assertThat(result.periods().get(0).totalExpenses()).isEqualByComparingTo("4000");
        assertThat(result.periods().get(1).label()).isEqualTo("2024");
        assertThat(result.periods().get(1).totalIncome()).isEqualByComparingTo("12000");
    }

    @Test
    void getTrends_yearly_returnsEmptyWhenNoEntries() {
        when(trendRepository.findAllByUserId(userId)).thenReturn(List.of());

        TrendData result = trendService.getTrends(userId, "yearly", null, null, null);

        assertThat(result.periods()).isEmpty();
    }

    @Test
    void getTrends_invalidView_throwsIllegalArgument() {
        assertThatThrownBy(() -> trendService.getTrends(userId, "daily", LocalDate.now(), LocalDate.now(), null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Invalid view");
    }

    // ── getTrends — convertedAmount ───────────────────────────────────────────

    @Test
    void getTrends_usesConvertedAmountWhenPresent() {
        LocalDate from = LocalDate.of(2024, 1, 1);
        LocalDate to   = LocalDate.of(2024, 1, 31);

        EntryEntity e = entry("income", new BigDecimal("100"), LocalDate.of(2024, 1, 10));
        e.setConvertedAmount(new BigDecimal("110")); // EUR → USD conversion

        when(trendRepository.findByUserIdAndDateRange(userId, from, to)).thenReturn(List.of(e));

        TrendData result = trendService.getTrends(userId, "monthly", from, to, null);

        assertThat(result.periods().get(0).totalIncome()).isEqualByComparingTo("110");
    }

    // ── getTrends — category filter ───────────────────────────────────────────

    @Test
    void getTrends_withCategoryFilter_callsFilteredQuery() {
        LocalDate from = LocalDate.of(2024, 1, 1);
        LocalDate to   = LocalDate.of(2024, 1, 31);

        when(trendRepository.findByUserIdAndDateRangeAndCategory(userId, from, to, categoryId))
                .thenReturn(List.of(entry("expense", new BigDecimal("200"), LocalDate.of(2024, 1, 5))));

        TrendData result = trendService.getTrends(userId, "monthly", from, to, categoryId);

        assertThat(result.periods().get(0).totalExpenses()).isEqualByComparingTo("200");
        verify(trendRepository).findByUserIdAndDateRangeAndCategory(userId, from, to, categoryId);
        verify(trendRepository, never()).findByUserIdAndDateRange(any(), any(), any());
    }

    @Test
    void getTrends_yearly_withCategoryFilter_callsFilteredQuery() {
        when(trendRepository.findAllByUserIdAndCategory(userId, categoryId)).thenReturn(List.of());

        trendService.getTrends(userId, "yearly", null, null, categoryId);

        verify(trendRepository).findAllByUserIdAndCategory(userId, categoryId);
        verify(trendRepository, never()).findAllByUserId(any());
    }

    // ── getBreakdown ──────────────────────────────────────────────────────────

    @Test
    void getBreakdown_returnsEntriesForParsedDateRange() {
        LocalDate start = LocalDate.of(2024, 1, 1);
        LocalDate end   = LocalDate.of(2024, 1, 7);
        String dataPointId = "weekly_2024-01-01_2024-01-07";

        List<EntryEntity> entries = List.of(entry("expense", new BigDecimal("50"), start));
        when(trendRepository.findByUserIdAndDateRange(userId, start, end)).thenReturn(entries);

        List<EntryEntity> result = trendService.getBreakdown(userId, dataPointId, null);

        assertThat(result).hasSize(1);
        verify(trendRepository).findByUserIdAndDateRange(userId, start, end);
    }

    @Test
    void getBreakdown_withCategoryFilter_callsFilteredQuery() {
        LocalDate start = LocalDate.of(2024, 1, 1);
        LocalDate end   = LocalDate.of(2024, 1, 31);
        String dataPointId = "monthly_2024-01-01_2024-01-31";

        when(trendRepository.findByUserIdAndDateRangeAndCategory(userId, start, end, categoryId))
                .thenReturn(List.of());

        trendService.getBreakdown(userId, dataPointId, categoryId);

        verify(trendRepository).findByUserIdAndDateRangeAndCategory(userId, start, end, categoryId);
    }

    @Test
    void getBreakdown_invalidDataPointId_throws404() {
        assertThatThrownBy(() -> trendService.getBreakdown(userId, "bad_id", null))
                .isInstanceOf(EntityNotFoundException.class);
    }

    @Test
    void getBreakdown_malformedDates_throws404() {
        assertThatThrownBy(() -> trendService.getBreakdown(userId, "weekly_notadate_notadate", null))
                .isInstanceOf(EntityNotFoundException.class);
    }

    // ── dataPointId format ────────────────────────────────────────────────────

    @Test
    void buildDataPointId_hasCorrectFormat() {
        String id = TrendService.buildDataPointId("weekly",
                LocalDate.of(2024, 1, 1), LocalDate.of(2024, 1, 7));
        assertThat(id).isEqualTo("weekly_2024-01-01_2024-01-07");
    }

    // ── effectiveAmount ───────────────────────────────────────────────────────

    @Test
    void effectiveAmount_usesConvertedAmountWhenSet() {
        EntryEntity e = entry("income", new BigDecimal("100"), LocalDate.now());
        e.setConvertedAmount(new BigDecimal("120"));
        assertThat(TrendService.effectiveAmount(e)).isEqualByComparingTo("120");
    }

    @Test
    void effectiveAmount_fallsBackToAmountWhenNoConversion() {
        EntryEntity e = entry("income", new BigDecimal("100"), LocalDate.now());
        assertThat(TrendService.effectiveAmount(e)).isEqualByComparingTo("100");
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    private EntryEntity entry(String type, BigDecimal amount, LocalDate date) {
        return EntryEntity.builder()
                .id(UUID.randomUUID())
                .flowSheetId(UUID.randomUUID())
                .userId(userId)
                .entryType(type)
                .categoryId(categoryId)
                .amount(amount)
                .currency("USD")
                .entryDate(date)
                .isDeleted(false)
                .build();
    }
}
