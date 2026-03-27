package com.lunero.recurring;

import com.lunero.common.audit.AuditLogService;
import com.lunero.common.exception.EntityNotFoundException;
import com.lunero.entry.EntryRepository;
import net.jqwik.api.*;
import net.jqwik.api.constraints.IntRange;
import net.jqwik.api.constraints.Positive;
import org.mockito.Mockito;

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
 * Property-based tests for the RecurringEntry domain.
 *
 * Property 11: Recurring Entry Auto-Population
 *   For any newly created FlowSheet, all non-paused, non-deleted recurring entries
 *   whose cadence fits the period should appear as entries in that FlowSheet.
 *
 * Property 12: Recurring Entry Edit Applies to Future Only
 *   Editing a recurring entry must not change entries in past FlowSheets.
 *
 * Property 13: Paused Recurring Entry Excluded from New Sheets
 *   A paused recurring entry must not appear in any FlowSheet created after the pause.
 */
class RecurringEntryPropertyTest {

    private final RecurringEntryRepository recurringEntryRepository =
            Mockito.mock(RecurringEntryRepository.class);
    private final EntryRepository entryRepository =
            Mockito.mock(EntryRepository.class);
    private final AuditLogService auditLogService =
            Mockito.mock(AuditLogService.class);

    private final RecurringEntryService service =
            new RecurringEntryService(recurringEntryRepository, entryRepository, auditLogService);

    // ── Property 11: Auto-Population ─────────────────────────────────────────

    /**
     * For any set of active (non-paused, non-deleted) recurring entries with a given cadence,
     * getForPeriod must return exactly those entries when the period is long enough.
     */
    @Property(tries = 300)
    void property11_activeEntriesIncludedInSufficientPeriod(
            @ForAll("activeCadenceAndPeriod") CadenceAndPeriod cap) {

        UUID userId = UUID.randomUUID();
        List<RecurringEntryEntity> active = buildActiveEntries(userId, cap.cadence(), 3);

        when(recurringEntryRepository.findByUserIdAndIsPausedFalseAndIsDeletedFalse(userId))
                .thenReturn(active);

        List<RecurringEntryEntity> result = service.getForPeriod(userId, cap.start(), cap.end());

        // All active entries with a fitting cadence must be included
        assertThat(result).hasSize(active.size());
        assertThat(result).allMatch(e -> !e.isPaused() && !e.isDeleted());
    }

    /**
     * For any period shorter than the cadence requirement, entries with that cadence
     * must NOT be included in the result.
     */
    @Property(tries = 300)
    void property11_entriesExcludedWhenPeriodTooShort(
            @ForAll("cadenceAndShortPeriod") CadenceAndPeriod cap) {

        UUID userId = UUID.randomUUID();
        List<RecurringEntryEntity> entries = buildActiveEntries(userId, cap.cadence(), 2);

        when(recurringEntryRepository.findByUserIdAndIsPausedFalseAndIsDeletedFalse(userId))
                .thenReturn(entries);

        List<RecurringEntryEntity> result = service.getForPeriod(userId, cap.start(), cap.end());

        assertThat(result).isEmpty();
    }

    /**
     * Daily entries must always be included regardless of period length.
     */
    @Property(tries = 200)
    void property11_dailyEntriesAlwaysIncluded(
            @ForAll @IntRange(min = 1, max = 365) int periodDays) {

        UUID userId = UUID.randomUUID();
        List<RecurringEntryEntity> daily = buildActiveEntries(userId, "daily", 2);

        when(recurringEntryRepository.findByUserIdAndIsPausedFalseAndIsDeletedFalse(userId))
                .thenReturn(daily);

        LocalDate start = LocalDate.now();
        LocalDate end = start.plusDays(periodDays - 1);

        List<RecurringEntryEntity> result = service.getForPeriod(userId, start, end);

        assertThat(result).hasSize(2);
    }

    /**
     * An empty list of recurring entries always produces an empty result.
     */
    @Property(tries = 100)
    void property11_noRecurringEntriesProducesEmptyResult(
            @ForAll @IntRange(min = 1, max = 365) int periodDays) {

        UUID userId = UUID.randomUUID();
        when(recurringEntryRepository.findByUserIdAndIsPausedFalseAndIsDeletedFalse(userId))
                .thenReturn(List.of());

        LocalDate start = LocalDate.now();
        List<RecurringEntryEntity> result = service.getForPeriod(userId, start, start.plusDays(periodDays - 1));

        assertThat(result).isEmpty();
    }

    // ── Property 12: Future-Only Edits ────────────────────────────────────────

    /**
     * Updating a recurring entry must not affect entries in past FlowSheets.
     * The service only mutates the RecurringEntryEntity itself; past EntryEntity rows
     * are untouched (they were created as snapshots at FlowSheet creation time).
     * This property verifies that update() does NOT call entryRepository.save() or
     * any bulk update on past entries.
     */
    @Property(tries = 200)
    void property12_updateDoesNotMutatePastEntries(
            @ForAll @Positive int newAmount) {

        UUID userId = UUID.randomUUID();
        UUID id = UUID.randomUUID();
        RecurringEntryEntity existing = buildEntity(userId, id, "monthly", false, false);

        when(recurringEntryRepository.findByIdAndUserIdAndIsDeletedFalse(id, userId))
                .thenReturn(Optional.of(existing));
        when(recurringEntryRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        UpdateRecurringEntryRequest req = new UpdateRecurringEntryRequest(
                BigDecimal.valueOf(newAmount), null, null, null);

        service.update(userId, id, req);

        // entryRepository must never be called during a recurring entry update
        verifyNoInteractions(entryRepository);
    }

    /**
     * After an update, the returned entity reflects the new values.
     * This confirms future FlowSheets will use the updated values.
     */
    @Property(tries = 200)
    void property12_updatedEntityReflectsNewValues(
            @ForAll @Positive int newAmount,
            @ForAll("validCadence") String newCadence) {

        UUID userId = UUID.randomUUID();
        UUID id = UUID.randomUUID();
        RecurringEntryEntity existing = buildEntity(userId, id, "monthly", false, false);

        when(recurringEntryRepository.findByIdAndUserIdAndIsDeletedFalse(id, userId))
                .thenReturn(Optional.of(existing));
        when(recurringEntryRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        UpdateRecurringEntryRequest req = new UpdateRecurringEntryRequest(
                BigDecimal.valueOf(newAmount), null, newCadence, null);

        RecurringEntryEntity result = service.update(userId, id, req);

        assertThat(result.getAmount()).isEqualByComparingTo(BigDecimal.valueOf(newAmount));
        assertThat(result.getCadence()).isEqualTo(newCadence);
    }

    // ── Property 13: Paused Exclusion ─────────────────────────────────────────

    /**
     * After pausing a recurring entry, getForPeriod must not include it.
     * The repository mock simulates the paused state being persisted.
     */
    @Property(tries = 200)
    void property13_pausedEntryExcludedFromNewPeriods(
            @ForAll @IntRange(min = 28, max = 365) int periodDays) {

        UUID userId = UUID.randomUUID();
        UUID id = UUID.randomUUID();
        RecurringEntryEntity entity = buildEntity(userId, id, "monthly", false, false);

        when(recurringEntryRepository.findByIdAndUserIdAndIsDeletedFalse(id, userId))
                .thenReturn(Optional.of(entity));
        when(recurringEntryRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        // Pause the entry
        service.pause(userId, id);
        assertThat(entity.isPaused()).isTrue();

        // Simulate repository returning no paused entries (as the real DB would)
        when(recurringEntryRepository.findByUserIdAndIsPausedFalseAndIsDeletedFalse(userId))
                .thenReturn(List.of());

        LocalDate start = LocalDate.now();
        List<RecurringEntryEntity> result = service.getForPeriod(userId, start, start.plusDays(periodDays - 1));

        assertThat(result).isEmpty();
    }

    /**
     * After resuming a paused entry, getForPeriod must include it again
     * when the period is long enough for its cadence.
     */
    @Property(tries = 200)
    void property13_resumedEntryIncludedInNewPeriods(
            @ForAll @IntRange(min = 28, max = 365) int periodDays) {

        UUID userId = UUID.randomUUID();
        UUID id = UUID.randomUUID();
        RecurringEntryEntity entity = buildEntity(userId, id, "monthly", true, false);

        when(recurringEntryRepository.findByIdAndUserIdAndIsDeletedFalse(id, userId))
                .thenReturn(Optional.of(entity));
        when(recurringEntryRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        // Resume the entry
        service.resume(userId, id);
        assertThat(entity.isPaused()).isFalse();

        // Simulate repository returning the resumed entry
        when(recurringEntryRepository.findByUserIdAndIsPausedFalseAndIsDeletedFalse(userId))
                .thenReturn(List.of(entity));

        LocalDate start = LocalDate.now();
        List<RecurringEntryEntity> result = service.getForPeriod(userId, start, start.plusDays(periodDays - 1));

        assertThat(result).hasSize(1);
    }

    /**
     * A deleted recurring entry must never appear in getForPeriod results.
     * The repository mock simulates the deleted state being persisted.
     */
    @Property(tries = 200)
    void property13_deletedEntryNeverIncluded(
            @ForAll @IntRange(min = 1, max = 365) int periodDays) {

        UUID userId = UUID.randomUUID();
        // Simulate repository returning no deleted entries (as the real DB would)
        when(recurringEntryRepository.findByUserIdAndIsPausedFalseAndIsDeletedFalse(userId))
                .thenReturn(List.of());

        LocalDate start = LocalDate.now();
        List<RecurringEntryEntity> result = service.getForPeriod(userId, start, start.plusDays(periodDays - 1));

        assertThat(result).isEmpty();
    }

    /**
     * Pause is idempotent — pausing an already-paused entry must not throw.
     */
    @Property(tries = 100)
    void property13_pauseIsIdempotent(@ForAll("validCadence") String cadence) {
        UUID userId = UUID.randomUUID();
        UUID id = UUID.randomUUID();
        RecurringEntryEntity entity = buildEntity(userId, id, cadence, true, false); // already paused

        when(recurringEntryRepository.findByIdAndUserIdAndIsDeletedFalse(id, userId))
                .thenReturn(Optional.of(entity));
        when(recurringEntryRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        RecurringEntryEntity result = service.pause(userId, id);

        assertThat(result.isPaused()).isTrue();
    }

    /**
     * Resume is idempotent — resuming an already-active entry must not throw.
     */
    @Property(tries = 100)
    void property13_resumeIsIdempotent(@ForAll("validCadence") String cadence) {
        UUID userId = UUID.randomUUID();
        UUID id = UUID.randomUUID();
        RecurringEntryEntity entity = buildEntity(userId, id, cadence, false, false); // already active

        when(recurringEntryRepository.findByIdAndUserIdAndIsDeletedFalse(id, userId))
                .thenReturn(Optional.of(entity));
        when(recurringEntryRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        RecurringEntryEntity result = service.resume(userId, id);

        assertThat(result.isPaused()).isFalse();
    }

    // ── Arbitraries ───────────────────────────────────────────────────────────

    record CadenceAndPeriod(String cadence, LocalDate start, LocalDate end) {}

    @Provide
    Arbitrary<CadenceAndPeriod> activeCadenceAndPeriod() {
        return Arbitraries.of(
                new CadenceAndPeriod("daily",     LocalDate.now(), LocalDate.now()),
                new CadenceAndPeriod("weekly",    LocalDate.now(), LocalDate.now().plusDays(6)),
                new CadenceAndPeriod("bi-weekly", LocalDate.now(), LocalDate.now().plusDays(13)),
                new CadenceAndPeriod("monthly",   LocalDate.now(), LocalDate.now().plusDays(30))
        );
    }

    @Provide
    Arbitrary<CadenceAndPeriod> cadenceAndShortPeriod() {
        // Periods that are too short for the cadence
        return Arbitraries.of(
                new CadenceAndPeriod("weekly",    LocalDate.now(), LocalDate.now().plusDays(5)),  // < 7
                new CadenceAndPeriod("bi-weekly", LocalDate.now(), LocalDate.now().plusDays(6)),  // < 14
                new CadenceAndPeriod("monthly",   LocalDate.now(), LocalDate.now().plusDays(13))  // < 28
        );
    }

    @Provide
    Arbitrary<String> validCadence() {
        return Arbitraries.of("daily", "weekly", "bi-weekly", "monthly");
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    private List<RecurringEntryEntity> buildActiveEntries(UUID userId, String cadence, int count) {
        List<RecurringEntryEntity> list = new ArrayList<>();
        for (int i = 0; i < count; i++) {
            list.add(buildEntity(userId, UUID.randomUUID(), cadence, false, false));
        }
        return list;
    }

    private RecurringEntryEntity buildEntity(UUID userId, UUID id, String cadence,
                                              boolean paused, boolean deleted) {
        return RecurringEntryEntity.builder()
                .id(id).userId(userId)
                .entryType("expense").categoryId(UUID.randomUUID())
                .amount(new BigDecimal("100")).currency("USD")
                .cadence(cadence).isPaused(paused).isDeleted(deleted)
                .createdAt(Instant.now()).updatedAt(Instant.now())
                .build();
    }
}
