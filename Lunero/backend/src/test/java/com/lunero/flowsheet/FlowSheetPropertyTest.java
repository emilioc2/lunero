package com.lunero.flowsheet;

import com.lunero.common.audit.AuditLogService;
import com.lunero.common.exception.BusinessRuleException;
import com.lunero.common.exception.ValidationException;
import com.lunero.entry.EntryEntity;
import com.lunero.entry.EntryRepository;
import com.lunero.recurring.RecurringEntryRepository;
import com.lunero.recurring.RecurringEntryService;
import net.jqwik.api.*;
import net.jqwik.api.constraints.IntRange;
import net.jqwik.api.constraints.Positive;
import org.mockito.Mockito;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

/**
 * Property-based tests for the FlowSheet domain.
 *
 * Property 2: No Overlapping Active FlowSheets
 *   For any user, after any FlowSheet creation, no two active FlowSheets for that
 *   user should have overlapping date ranges.
 *
 * Property 3: Past FlowSheet Immutability
 *   For any archived FlowSheet, any attempt to mutate its entries without first
 *   calling the unlock endpoint should be rejected with a 422 error.
 */
class FlowSheetPropertyTest {

    private final FlowSheetRepository flowSheetRepository =
            Mockito.mock(FlowSheetRepository.class);
    private final EntryRepository entryRepository =
            Mockito.mock(EntryRepository.class);
    private final RecurringEntryRepository recurringEntryRepository =
            Mockito.mock(RecurringEntryRepository.class);
    private final RecurringEntryService recurringEntryService =
            Mockito.mock(RecurringEntryService.class);
    private final AuditLogService auditLogService =
            Mockito.mock(AuditLogService.class);

    private final FlowSheetService service = new FlowSheetService(
            flowSheetRepository, entryRepository, recurringEntryRepository,
            recurringEntryService, auditLogService,
            Mockito.mock(com.lunero.projection.ProjectionService.class));

    // ── Property 2: No Overlapping Active FlowSheets ─────────────────────────

    /**
     * For any date range where the repository reports an overlap, createFlowSheet
     * must reject the request with a ValidationException (→ HTTP 400).
     */
    @Property(tries = 200)
    void property2_overlappingCreationIsRejected(
            @ForAll("overlappingRanges") LocalDate[] range) {

        // Arrange: simulate an existing active sheet whose range overlaps
        when(flowSheetRepository.existsOverlappingActiveSheet(any(), any(), any(), any()))
                .thenReturn(true);

        UUID userId = UUID.randomUUID();
        CreateFlowSheetRequest request = new CreateFlowSheetRequest(
                "custom", range[0], range[1]);

        // Act + Assert: overlap must be rejected
        assertThatThrownBy(() -> service.createFlowSheet(userId, request))
                .isInstanceOf(ValidationException.class)
                .hasMessageContaining("Overlapping");
    }

    /**
     * For any non-overlapping date ranges, createFlowSheet must succeed.
     */
    @Property(tries = 200)
    void property2_nonOverlappingCreationSucceeds(
            @ForAll("nonOverlappingRange") LocalDate[] range) {

        when(flowSheetRepository.existsOverlappingActiveSheet(any(), any(), any(), any()))
                .thenReturn(false);
        when(flowSheetRepository.save(any(FlowSheetEntity.class))).thenAnswer(inv -> {
            FlowSheetEntity e = inv.getArgument(0, FlowSheetEntity.class);
            if (e == null) {
                return FlowSheetEntity.builder()
                        .id(UUID.randomUUID()).status("active").editLocked(false).build();
            }
            return FlowSheetEntity.builder()
                    .id(UUID.randomUUID()).userId(e.getUserId())
                    .periodType(e.getPeriodType())
                    .startDate(e.getStartDate()).endDate(e.getEndDate())
                    .status("active").editLocked(false).build();
        });
        when(recurringEntryService.getForPeriod(any(), any(), any())).thenReturn(List.of());

        UUID userId = UUID.randomUUID();
        CreateFlowSheetRequest request = new CreateFlowSheetRequest(
                "custom", range[0], range[1]);

        FlowSheetEntity result = service.createFlowSheet(userId, request);

        assertThat(result.getStatus()).isEqualTo("active");
        assertThat(result.getStartDate()).isEqualTo(range[0]);
        assertThat(result.getEndDate()).isEqualTo(range[1]);
    }

    /**
     * For any valid period type (weekly/monthly), the created sheet's end date
     * must always be strictly after its start date — no zero-length periods.
     */
    @Property(tries = 100)
    void property2_createdSheetHasValidDateRange(
            @ForAll("standardPeriodType") String periodType) {

        when(flowSheetRepository.existsOverlappingActiveSheet(any(), any(), any(), any()))
                .thenReturn(false);
        when(flowSheetRepository.save(any(FlowSheetEntity.class))).thenAnswer(inv -> {
            FlowSheetEntity e = inv.getArgument(0, FlowSheetEntity.class);
            if (e == null) {
                return FlowSheetEntity.builder()
                        .id(UUID.randomUUID()).status("active").editLocked(false).build();
            }
            return FlowSheetEntity.builder()
                    .id(UUID.randomUUID()).userId(e.getUserId())
                    .periodType(e.getPeriodType())
                    .startDate(e.getStartDate()).endDate(e.getEndDate())
                    .status(e.getStatus()).editLocked(e.isEditLocked()).build();
        });
        when(recurringEntryService.getForPeriod(any(), any(), any())).thenReturn(List.of());

        UUID userId = UUID.randomUUID();
        FlowSheetEntity result = service.createFlowSheet(userId,
                new CreateFlowSheetRequest(periodType, null, null));

        assertThat(result.getEndDate()).isAfter(result.getStartDate());
    }

    // ── Property 3: Past FlowSheet Immutability ───────────────────────────────

    /**
     * For any archived FlowSheet, unlockPastSheet must set editLocked=false.
     * The sheet must be unlockable regardless of how long it has been archived.
     */
    @Property(tries = 200)
    void property3_archivedSheetCanBeUnlocked(
            @ForAll("pastDate") LocalDate endDate) {

        UUID userId  = UUID.randomUUID();
        UUID sheetId = UUID.randomUUID();

        FlowSheetEntity archived = FlowSheetEntity.builder()
                .id(sheetId).userId(userId).periodType("monthly")
                .startDate(endDate.minusMonths(1)).endDate(endDate)
                .status("archived").editLocked(true).build();

        when(flowSheetRepository.findByIdAndUserId(sheetId, userId))
                .thenReturn(Optional.of(archived));
        when(flowSheetRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        FlowSheetEntity result = service.unlockPastSheet(userId, sheetId);

        assertThat(result.isEditLocked()).isFalse();
        assertThat(result.getStatus()).isEqualTo("archived");
    }

    /**
     * For any active FlowSheet, unlockPastSheet must throw BusinessRuleException (→ 422).
     * Active sheets are always editable; the unlock endpoint is only for archived sheets.
     */
    @Property(tries = 100)
    void property3_activeSheetCannotBeUnlocked(
            @ForAll("futureDate") LocalDate endDate) {

        UUID userId  = UUID.randomUUID();
        UUID sheetId = UUID.randomUUID();

        FlowSheetEntity active = FlowSheetEntity.builder()
                .id(sheetId).userId(userId).periodType("monthly")
                .startDate(endDate.minusMonths(1)).endDate(endDate)
                .status("active").editLocked(false).build();

        when(flowSheetRepository.findByIdAndUserId(sheetId, userId))
                .thenReturn(Optional.of(active));

        assertThatThrownBy(() -> service.unlockPastSheet(userId, sheetId))
                .isInstanceOf(BusinessRuleException.class);
    }

    /**
     * For any set of entries, computeAvailableBalance must equal
     * totalIncome − (totalExpenses + totalSavings) — the core formula invariant.
     * This also validates Property 1 at the service layer.
     */
    @Property(tries = 500)
    void property1_availableBalanceInvariant(
            @ForAll @IntRange(min = 0, max = 10) int incomeCount,
            @ForAll @IntRange(min = 0, max = 10) int expenseCount,
            @ForAll @IntRange(min = 0, max = 10) int savingsCount,
            @ForAll @Positive int baseAmount) {

        BigDecimal amount = BigDecimal.valueOf(baseAmount);
        List<EntryEntity> entries = buildEntries(incomeCount, expenseCount, savingsCount, amount);

        BigDecimal result = service.computeAvailableBalance(entries);

        BigDecimal expectedIncome   = amount.multiply(BigDecimal.valueOf(incomeCount));
        BigDecimal expectedExpenses = amount.multiply(BigDecimal.valueOf(expenseCount));
        BigDecimal expectedSavings  = amount.multiply(BigDecimal.valueOf(savingsCount));
        BigDecimal expected = expectedIncome.subtract(expectedExpenses.add(expectedSavings));

        assertThat(result).isEqualByComparingTo(expected);
    }

    /**
     * For any custom period where endDate <= startDate, creation must be rejected.
     */
    @Property(tries = 200)
    void property2_invalidDateRangeIsRejected(
            @ForAll("invalidRange") LocalDate[] range) {

        UUID userId = UUID.randomUUID();
        CreateFlowSheetRequest request = new CreateFlowSheetRequest(
                "custom", range[0], range[1]);

        assertThatThrownBy(() -> service.createFlowSheet(userId, request))
                .isInstanceOf(ValidationException.class);
    }

    /**
     * Property 3: After unlocking, the sheet status must remain "archived" —
     * unlocking only clears editLocked, it never reactivates the sheet.
     */
    @Property(tries = 200)
    void property3_unlockDoesNotReactivateArchivedSheet(
            @ForAll("pastDate") LocalDate endDate) {

        UUID userId  = UUID.randomUUID();
        UUID sheetId = UUID.randomUUID();

        FlowSheetEntity archived = FlowSheetEntity.builder()
                .id(sheetId).userId(userId).periodType("monthly")
                .startDate(endDate.minusMonths(1)).endDate(endDate)
                .status("archived").editLocked(true).build();

        when(flowSheetRepository.findByIdAndUserId(sheetId, userId))
                .thenReturn(Optional.of(archived));
        when(flowSheetRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        FlowSheetEntity result = service.unlockPastSheet(userId, sheetId);

        // Unlock must NOT change status back to active
        assertThat(result.getStatus()).isEqualTo("archived");
        assertThat(result.isEditLocked()).isFalse();
    }

    /**
     * Property 3: A sheet that is already unlocked (editLocked=false) can be
     * unlocked again idempotently — the operation must not throw.
     */
    @Property(tries = 100)
    void property3_unlockIsIdempotent(
            @ForAll("pastDate") LocalDate endDate) {

        UUID userId  = UUID.randomUUID();
        UUID sheetId = UUID.randomUUID();

        FlowSheetEntity alreadyUnlocked = FlowSheetEntity.builder()
                .id(sheetId).userId(userId).periodType("monthly")
                .startDate(endDate.minusMonths(1)).endDate(endDate)
                .status("archived").editLocked(false).build();

        when(flowSheetRepository.findByIdAndUserId(sheetId, userId))
                .thenReturn(Optional.of(alreadyUnlocked));
        when(flowSheetRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        FlowSheetEntity result = service.unlockPastSheet(userId, sheetId);

        assertThat(result.isEditLocked()).isFalse();
        assertThat(result.getStatus()).isEqualTo("archived");
    }

    // ── Arbitraries ───────────────────────────────────────────────────────────

    @Provide
    Arbitrary<LocalDate[]> overlappingRanges() {
        return Arbitraries.integers().between(1, 365).flatMap(offset ->
                Arbitraries.integers().between(1, 30).map(duration -> {
                    LocalDate start = LocalDate.now().plusDays(offset);
                    LocalDate end   = start.plusDays(duration);
                    return new LocalDate[]{start, end};
                }));
    }

    @Provide
    Arbitrary<LocalDate[]> nonOverlappingRange() {
        return Arbitraries.integers().between(1, 365).flatMap(offset ->
                Arbitraries.integers().between(1, 30).map(duration -> {
                    LocalDate start = LocalDate.now().plusDays(offset);
                    LocalDate end   = start.plusDays(duration);
                    return new LocalDate[]{start, end};
                }));
    }

    @Provide
    Arbitrary<LocalDate[]> invalidRange() {
        // endDate <= startDate
        return Arbitraries.integers().between(0, 365).flatMap(offset ->
                Arbitraries.integers().between(0, 30).map(back -> {
                    LocalDate start = LocalDate.now().plusDays(offset);
                    LocalDate end   = start.minusDays(back); // end <= start
                    return new LocalDate[]{start, end};
                }));
    }

    @Provide
    Arbitrary<String> standardPeriodType() {
        return Arbitraries.of("weekly", "monthly");
    }

    @Provide
    Arbitrary<LocalDate> pastDate() {
        return Arbitraries.integers().between(1, 730)
                .map(days -> LocalDate.now().minusDays(days));
    }

    @Provide
    Arbitrary<LocalDate> futureDate() {
        return Arbitraries.integers().between(1, 365)
                .map(days -> LocalDate.now().plusDays(days));
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    private List<EntryEntity> buildEntries(int income, int expense, int savings, BigDecimal amount) {
        var list = new java.util.ArrayList<EntryEntity>();
        for (int i = 0; i < income;   i++) list.add(entry("income",  amount));
        for (int i = 0; i < expense;  i++) list.add(entry("expense", amount));
        for (int i = 0; i < savings;  i++) list.add(entry("savings", amount));
        return list;
    }

    private EntryEntity entry(String type, BigDecimal amount) {
        return EntryEntity.builder()
                .id(UUID.randomUUID()).flowSheetId(UUID.randomUUID()).userId(UUID.randomUUID())
                .entryType(type).category("TestCategory")
                .amount(amount).currency("USD")
                .entryDate(LocalDate.now()).isDeleted(false).build();
    }
}
