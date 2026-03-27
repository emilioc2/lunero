package com.lunero.recurring;

import com.lunero.common.audit.AuditAction;
import com.lunero.common.audit.AuditLogService;
import com.lunero.common.exception.EntityNotFoundException;
import com.lunero.common.exception.ValidationException;
import com.lunero.entry.EntryRepository;
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
class RecurringEntryServiceTest {

    @Mock private RecurringEntryRepository recurringEntryRepository;
    @Mock private EntryRepository entryRepository;
    @Mock private AuditLogService auditLogService;

    private RecurringEntryService service;

    private final UUID userId = UUID.randomUUID();
    private final UUID entryId = UUID.randomUUID();
    private final UUID categoryId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        service = new RecurringEntryService(recurringEntryRepository, entryRepository, auditLogService);
    }

    // ── list ─────────────────────────────────────────────────────────────────

    @Test
    void list_returnsAllNonDeletedEntries() {
        RecurringEntryEntity e = buildEntity("monthly", false, false);
        when(recurringEntryRepository.findByUserIdAndIsDeletedFalse(userId)).thenReturn(List.of(e));

        List<RecurringEntryEntity> result = service.list(userId);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getCadence()).isEqualTo("monthly");
    }

    // ── create ────────────────────────────────────────────────────────────────

    @Test
    void create_persistsAndAudits() {
        RecurringEntryEntity saved = buildEntity("monthly", false, false);
        when(recurringEntryRepository.save(any())).thenReturn(saved);

        CreateRecurringEntryRequest req = new CreateRecurringEntryRequest(
                "expense", categoryId, new BigDecimal("100"), "USD", "monthly", "rent");

        RecurringEntryEntity result = service.create(userId, req);

        assertThat(result.getCadence()).isEqualTo("monthly");
        verify(auditLogService).log(any(), eq("recurring_entry"), any(), eq(AuditAction.CREATE));
    }

    @Test
    void create_throws400_whenAmountIsZero() {
        CreateRecurringEntryRequest req = new CreateRecurringEntryRequest(
                "expense", categoryId, BigDecimal.ZERO, "USD", "monthly", null);

        assertThatThrownBy(() -> service.create(userId, req))
                .isInstanceOf(ValidationException.class)
                .hasMessageContaining("amount must be greater than 0");
    }

    @Test
    void create_throws400_whenAmountIsNegative() {
        CreateRecurringEntryRequest req = new CreateRecurringEntryRequest(
                "expense", categoryId, new BigDecimal("-10"), "USD", "monthly", null);

        assertThatThrownBy(() -> service.create(userId, req))
                .isInstanceOf(ValidationException.class);
    }

    @Test
    void create_throws400_whenCadenceIsInvalid() {
        CreateRecurringEntryRequest req = new CreateRecurringEntryRequest(
                "expense", categoryId, new BigDecimal("50"), "USD", "yearly", null);

        assertThatThrownBy(() -> service.create(userId, req))
                .isInstanceOf(ValidationException.class)
                .hasMessageContaining("cadence must be one of");
    }

    @Test
    void create_throws400_whenEntryTypeIsInvalid() {
        CreateRecurringEntryRequest req = new CreateRecurringEntryRequest(
                "transfer", categoryId, new BigDecimal("50"), "USD", "monthly", null);

        assertThatThrownBy(() -> service.create(userId, req))
                .isInstanceOf(ValidationException.class)
                .hasMessageContaining("entryType must be one of");
    }

    @Test
    void create_acceptsAllValidCadences() {
        for (String cadence : List.of("daily", "weekly", "bi-weekly", "monthly")) {
            RecurringEntryEntity saved = buildEntity(cadence, false, false);
            when(recurringEntryRepository.save(any())).thenReturn(saved);

            CreateRecurringEntryRequest req = new CreateRecurringEntryRequest(
                    "expense", categoryId, new BigDecimal("50"), "USD", cadence, null);

            assertThatCode(() -> service.create(userId, req)).doesNotThrowAnyException();
        }
    }

    // ── update ────────────────────────────────────────────────────────────────

    @Test
    void update_changesAmountAndCadence() {
        RecurringEntryEntity existing = buildEntity("monthly", false, false);
        when(recurringEntryRepository.findByIdAndUserIdAndIsDeletedFalse(entryId, userId))
                .thenReturn(Optional.of(existing));
        when(recurringEntryRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        UpdateRecurringEntryRequest req = new UpdateRecurringEntryRequest(
                new BigDecimal("200"), null, "weekly", null);

        RecurringEntryEntity result = service.update(userId, entryId, req);

        assertThat(result.getAmount()).isEqualByComparingTo("200");
        assertThat(result.getCadence()).isEqualTo("weekly");
        verify(auditLogService).log(any(), eq("recurring_entry"), any(), eq(AuditAction.UPDATE));
    }

    @Test
    void update_ignoresNullFields() {
        RecurringEntryEntity existing = buildEntity("monthly", false, false);
        when(recurringEntryRepository.findByIdAndUserIdAndIsDeletedFalse(entryId, userId))
                .thenReturn(Optional.of(existing));
        when(recurringEntryRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        UpdateRecurringEntryRequest req = new UpdateRecurringEntryRequest(null, null, null, null);

        RecurringEntryEntity result = service.update(userId, entryId, req);

        assertThat(result.getCadence()).isEqualTo("monthly");
        assertThat(result.getAmount()).isEqualByComparingTo("100");
    }

    @Test
    void update_throws400_whenAmountIsZero() {
        RecurringEntryEntity existing = buildEntity("monthly", false, false);
        when(recurringEntryRepository.findByIdAndUserIdAndIsDeletedFalse(entryId, userId))
                .thenReturn(Optional.of(existing));

        UpdateRecurringEntryRequest req = new UpdateRecurringEntryRequest(BigDecimal.ZERO, null, null, null);

        assertThatThrownBy(() -> service.update(userId, entryId, req))
                .isInstanceOf(ValidationException.class);
    }

    @Test
    void update_throws404_whenNotOwned() {
        when(recurringEntryRepository.findByIdAndUserIdAndIsDeletedFalse(entryId, userId))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.update(userId, entryId,
                new UpdateRecurringEntryRequest(null, null, null, null)))
                .isInstanceOf(EntityNotFoundException.class);
    }

    // ── delete ────────────────────────────────────────────────────────────────

    @Test
    void delete_softDeletesAndAudits() {
        RecurringEntryEntity existing = buildEntity("monthly", false, false);
        when(recurringEntryRepository.findByIdAndUserIdAndIsDeletedFalse(entryId, userId))
                .thenReturn(Optional.of(existing));
        when(recurringEntryRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        service.delete(userId, entryId);

        assertThat(existing.isDeleted()).isTrue();
        verify(auditLogService).log(any(), eq("recurring_entry"), any(), eq(AuditAction.DELETE));
    }

    @Test
    void delete_throws404_whenNotOwned() {
        when(recurringEntryRepository.findByIdAndUserIdAndIsDeletedFalse(entryId, userId))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.delete(userId, entryId))
                .isInstanceOf(EntityNotFoundException.class);
    }

    // ── pause / resume ────────────────────────────────────────────────────────

    @Test
    void pause_setsPausedTrue() {
        RecurringEntryEntity existing = buildEntity("monthly", false, false);
        when(recurringEntryRepository.findByIdAndUserIdAndIsDeletedFalse(entryId, userId))
                .thenReturn(Optional.of(existing));
        when(recurringEntryRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        RecurringEntryEntity result = service.pause(userId, entryId);

        assertThat(result.isPaused()).isTrue();
        verify(auditLogService).log(any(), eq("recurring_entry"), any(), eq(AuditAction.UPDATE));
    }

    @Test
    void resume_setsPausedFalse() {
        RecurringEntryEntity existing = buildEntity("monthly", true, false);
        when(recurringEntryRepository.findByIdAndUserIdAndIsDeletedFalse(entryId, userId))
                .thenReturn(Optional.of(existing));
        when(recurringEntryRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        RecurringEntryEntity result = service.resume(userId, entryId);

        assertThat(result.isPaused()).isFalse();
    }

    @Test
    void pause_throws404_whenNotOwned() {
        when(recurringEntryRepository.findByIdAndUserIdAndIsDeletedFalse(entryId, userId))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.pause(userId, entryId))
                .isInstanceOf(EntityNotFoundException.class);
    }

    // ── getForPeriod ──────────────────────────────────────────────────────────

    @Test
    void getForPeriod_includesDailyInAnyPeriod() {
        RecurringEntryEntity daily = buildEntity("daily", false, false);
        when(recurringEntryRepository.findByUserIdAndIsPausedFalseAndIsDeletedFalse(userId))
                .thenReturn(List.of(daily));

        // 3-day period — daily should still be included
        List<RecurringEntryEntity> result = service.getForPeriod(
                userId, LocalDate.now(), LocalDate.now().plusDays(2));

        assertThat(result).hasSize(1);
    }

    @Test
    void getForPeriod_excludesWeeklyFromShortPeriod() {
        RecurringEntryEntity weekly = buildEntity("weekly", false, false);
        when(recurringEntryRepository.findByUserIdAndIsPausedFalseAndIsDeletedFalse(userId))
                .thenReturn(List.of(weekly));

        // 5-day period — weekly requires >= 7 days
        List<RecurringEntryEntity> result = service.getForPeriod(
                userId, LocalDate.now(), LocalDate.now().plusDays(4));

        assertThat(result).isEmpty();
    }

    @Test
    void getForPeriod_includesWeeklyInWeeklyPeriod() {
        RecurringEntryEntity weekly = buildEntity("weekly", false, false);
        when(recurringEntryRepository.findByUserIdAndIsPausedFalseAndIsDeletedFalse(userId))
                .thenReturn(List.of(weekly));

        List<RecurringEntryEntity> result = service.getForPeriod(
                userId, LocalDate.now(), LocalDate.now().plusDays(6));

        assertThat(result).hasSize(1);
    }

    @Test
    void getForPeriod_excludesBiWeeklyFromWeeklyPeriod() {
        RecurringEntryEntity biWeekly = buildEntity("bi-weekly", false, false);
        when(recurringEntryRepository.findByUserIdAndIsPausedFalseAndIsDeletedFalse(userId))
                .thenReturn(List.of(biWeekly));

        // 7-day period — bi-weekly requires >= 14 days
        List<RecurringEntryEntity> result = service.getForPeriod(
                userId, LocalDate.now(), LocalDate.now().plusDays(6));

        assertThat(result).isEmpty();
    }

    @Test
    void getForPeriod_includesMonthlyInMonthlyPeriod() {
        RecurringEntryEntity monthly = buildEntity("monthly", false, false);
        when(recurringEntryRepository.findByUserIdAndIsPausedFalseAndIsDeletedFalse(userId))
                .thenReturn(List.of(monthly));

        List<RecurringEntryEntity> result = service.getForPeriod(
                userId, LocalDate.now(), LocalDate.now().plusDays(30));

        assertThat(result).hasSize(1);
    }

    @Test
    void getForPeriod_excludesPausedEntries() {
        // The repository query already filters paused — verify service delegates correctly
        when(recurringEntryRepository.findByUserIdAndIsPausedFalseAndIsDeletedFalse(userId))
                .thenReturn(List.of()); // paused entries not returned by repo

        List<RecurringEntryEntity> result = service.getForPeriod(
                userId, LocalDate.now(), LocalDate.now().plusDays(30));

        assertThat(result).isEmpty();
    }

    // ── getSuggestions ────────────────────────────────────────────────────────

    @Test
    void getSuggestions_returnsSuggestionsAboveThreshold() {
        UUID catId = UUID.randomUUID();
        BigDecimal amount = new BigDecimal("500.00");
        Object[] row = new Object[]{catId, amount, 3L};
        when(entryRepository.findRepeatedAmountCategoryPairs(userId, 3L))
                .thenReturn(List.<Object[]>of(row));

        List<RecurringSuggestion> suggestions = service.getSuggestions(userId);

        assertThat(suggestions).hasSize(1);
        assertThat(suggestions.get(0).categoryId()).isEqualTo(catId);
        assertThat(suggestions.get(0).amount()).isEqualByComparingTo("500.00");
        assertThat(suggestions.get(0).periodCount()).isEqualTo(3L);
    }

    @Test
    void getSuggestions_returnsEmptyWhenNoneFound() {
        when(entryRepository.findRepeatedAmountCategoryPairs(userId, 3L))
                .thenReturn(List.of());

        assertThat(service.getSuggestions(userId)).isEmpty();
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    private RecurringEntryEntity buildEntity(String cadence, boolean paused, boolean deleted) {
        return RecurringEntryEntity.builder()
                .id(entryId).userId(userId)
                .entryType("expense").categoryId(categoryId)
                .amount(new BigDecimal("100")).currency("USD")
                .cadence(cadence).isPaused(paused).isDeleted(deleted)
                .createdAt(Instant.now()).updatedAt(Instant.now())
                .build();
    }
}
