package com.lunero.trend;

import com.lunero.common.exception.EntityNotFoundException;
import com.lunero.entry.EntryEntity;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.temporal.TemporalAdjusters;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class TrendService {

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ISO_LOCAL_DATE;

    private final TrendRepository trendRepository;

    // ── Public API ────────────────────────────────────────────────────────────

    /**
     * Aggregates entries into weekly/monthly/yearly buckets.
     *
     * @param userId     the authenticated user
     * @param view       "weekly" | "monthly" | "yearly"
     * @param from       inclusive start date (optional for yearly)
     * @param to         inclusive end date (optional for yearly)
     * @param categoryId optional category filter
     */
    @Transactional(readOnly = true)
    public TrendData getTrends(UUID userId, String view, LocalDate from, LocalDate to, UUID categoryId) {
        List<EntryEntity> entries = fetchEntries(userId, view, from, to, categoryId);
        List<TrendPeriod> periods = switch (view) {
            case "weekly"  -> aggregateWeekly(entries, from, to);
            case "monthly" -> aggregateMonthly(entries, from, to);
            case "yearly"  -> aggregateYearly(entries);
            default        -> throw new IllegalArgumentException("Invalid view: " + view);
        };
        return new TrendData(view, periods);
    }

    /**
     * Returns all entries contributing to a trend period identified by {@code dataPointId}.
     * The dataPointId format is: {@code <view>_<startDate>_<endDate>}
     * e.g. {@code weekly_2024-01-01_2024-01-07}
     *
     * @param userId      the authenticated user
     * @param dataPointId composite key encoding view + period dates
     * @param categoryId  optional category filter
     */
    @Transactional(readOnly = true)
    public List<EntryEntity> getBreakdown(UUID userId, String dataPointId, UUID categoryId) {
        DataPointId parsed = parseDataPointId(dataPointId);
        List<EntryEntity> entries = categoryId != null
                ? trendRepository.findByUserIdAndDateRangeAndCategory(userId, parsed.start(), parsed.end(), categoryId)
                : trendRepository.findByUserIdAndDateRange(userId, parsed.start(), parsed.end());
        return entries;
    }

    // ── Aggregation helpers ───────────────────────────────────────────────────

    private List<TrendPeriod> aggregateWeekly(List<EntryEntity> entries, LocalDate from, LocalDate to) {
        // Build week buckets: each bucket starts on Sunday
        LocalDate bucketStart = from.with(TemporalAdjusters.previousOrSame(DayOfWeek.SUNDAY));
        LocalDate rangeEnd    = (to != null) ? to : (entries.isEmpty() ? from : entries.getLast().getEntryDate());

        List<TrendPeriod> periods = new ArrayList<>();
        while (!bucketStart.isAfter(rangeEnd)) {
            LocalDate bucketEnd = bucketStart.plusDays(6);
            List<EntryEntity> bucket = entriesInRange(entries, bucketStart, bucketEnd);
            periods.add(buildPeriod("weekly", bucketStart, bucketEnd, bucket));
            bucketStart = bucketStart.plusWeeks(1);
        }
        return periods;
    }

    private List<TrendPeriod> aggregateMonthly(List<EntryEntity> entries, LocalDate from, LocalDate to) {
        LocalDate bucketStart = from.withDayOfMonth(1);
        LocalDate rangeEnd    = (to != null) ? to : (entries.isEmpty() ? from : entries.getLast().getEntryDate());

        List<TrendPeriod> periods = new ArrayList<>();
        while (!bucketStart.isAfter(rangeEnd)) {
            LocalDate bucketEnd = bucketStart.with(TemporalAdjusters.lastDayOfMonth());
            List<EntryEntity> bucket = entriesInRange(entries, bucketStart, bucketEnd);
            periods.add(buildPeriod("monthly", bucketStart, bucketEnd, bucket));
            bucketStart = bucketStart.plusMonths(1);
        }
        return periods;
    }

    private List<TrendPeriod> aggregateYearly(List<EntryEntity> entries) {
        if (entries.isEmpty()) return List.of();

        // Group by year
        Map<Integer, List<EntryEntity>> byYear = entries.stream()
                .collect(Collectors.groupingBy(e -> e.getEntryDate().getYear()));

        return byYear.entrySet().stream()
                .sorted(Map.Entry.comparingByKey())
                .map(entry -> {
                    int year = entry.getKey();
                    LocalDate start = LocalDate.of(year, 1, 1);
                    LocalDate end   = LocalDate.of(year, 12, 31);
                    return buildPeriod("yearly", start, end, entry.getValue());
                })
                .toList();
    }

    // ── Period builder ────────────────────────────────────────────────────────

    private TrendPeriod buildPeriod(String view, LocalDate start, LocalDate end, List<EntryEntity> entries) {
        BigDecimal totalIncome   = BigDecimal.ZERO;
        BigDecimal totalExpenses = BigDecimal.ZERO;
        BigDecimal totalSavings  = BigDecimal.ZERO;

        for (EntryEntity e : entries) {
            BigDecimal amount = effectiveAmount(e);
            switch (e.getEntryType()) {
                case "income"  -> totalIncome   = totalIncome.add(amount);
                case "expense" -> totalExpenses = totalExpenses.add(amount);
                case "savings" -> totalSavings  = totalSavings.add(amount);
            }
        }

        BigDecimal availableBalance = totalIncome.subtract(totalExpenses.add(totalSavings));
        String id    = buildDataPointId(view, start, end);
        String label = buildLabel(view, start, end);

        return new TrendPeriod(id, label, start.format(DATE_FMT), end.format(DATE_FMT),
                totalIncome, totalExpenses, totalSavings, availableBalance);
    }

    // ── Utility helpers ───────────────────────────────────────────────────────

    /**
     * Uses convertedAmount when present, falls back to amount (same currency as user default).
     */
    static BigDecimal effectiveAmount(EntryEntity e) {
        return (e.getConvertedAmount() != null) ? e.getConvertedAmount() : e.getAmount();
    }

    private List<EntryEntity> entriesInRange(List<EntryEntity> entries, LocalDate start, LocalDate end) {
        return entries.stream()
                .filter(e -> !e.getEntryDate().isBefore(start) && !e.getEntryDate().isAfter(end))
                .toList();
    }

    private List<EntryEntity> fetchEntries(UUID userId, String view, LocalDate from, LocalDate to, UUID categoryId) {
        boolean isYearly = "yearly".equals(view);
        if (isYearly) {
            return categoryId != null
                    ? trendRepository.findAllByUserIdAndCategory(userId, categoryId)
                    : trendRepository.findAllByUserId(userId);
        }
        // weekly / monthly require from/to
        Objects.requireNonNull(from, "from date is required for " + view + " view");
        Objects.requireNonNull(to,   "to date is required for "   + view + " view");
        return categoryId != null
                ? trendRepository.findByUserIdAndDateRangeAndCategory(userId, from, to, categoryId)
                : trendRepository.findByUserIdAndDateRange(userId, from, to);
    }

    static String buildDataPointId(String view, LocalDate start, LocalDate end) {
        return view + "_" + start.format(DATE_FMT) + "_" + end.format(DATE_FMT);
    }

    private String buildLabel(String view, LocalDate start, LocalDate end) {
        return switch (view) {
            case "weekly"  -> start.format(DATE_FMT) + " – " + end.format(DATE_FMT);
            case "monthly" -> start.getMonth().name().charAt(0)
                    + start.getMonth().name().substring(1).toLowerCase()
                    + " " + start.getYear();
            case "yearly"  -> String.valueOf(start.getYear());
            default        -> start.format(DATE_FMT) + " – " + end.format(DATE_FMT);
        };
    }

    private record DataPointId(LocalDate start, LocalDate end) {}

    private DataPointId parseDataPointId(String dataPointId) {
        // format: <view>_<startDate>_<endDate>  e.g. weekly_2024-01-01_2024-01-07
        String[] parts = dataPointId.split("_", 2);
        if (parts.length < 2) {
            throw new EntityNotFoundException("TrendPeriod", dataPointId);
        }
        // remaining after stripping view prefix: "2024-01-01_2024-01-07"
        String datePart = parts[1];
        // ISO dates are 10 chars: YYYY-MM-DD
        if (datePart.length() < 21) {
            throw new EntityNotFoundException("TrendPeriod", dataPointId);
        }
        try {
            LocalDate start = LocalDate.parse(datePart.substring(0, 10), DATE_FMT);
            LocalDate end   = LocalDate.parse(datePart.substring(11, 21), DATE_FMT);
            return new DataPointId(start, end);
        } catch (Exception ex) {
            throw new EntityNotFoundException("TrendPeriod", dataPointId);
        }
    }
}
