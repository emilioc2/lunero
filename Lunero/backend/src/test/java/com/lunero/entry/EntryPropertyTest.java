package com.lunero.entry;

import com.lunero.common.audit.AuditLogService;
import com.lunero.common.exception.ValidationException;
import com.lunero.currency.CurrencyService;
import com.lunero.flowsheet.FlowSheetEntity;
import com.lunero.flowsheet.FlowSheetRepository;
import com.lunero.flowsheet.FlowSheetService;
import com.lunero.recurring.RecurringEntryRepository;
import com.lunero.user.UserEntity;
import com.lunero.user.UserRepository;
import net.jqwik.api.*;
import net.jqwik.api.constraints.IntRange;
import net.jqwik.api.constraints.Positive;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Property-based tests for the Entry domain.
 *
 * Property 1: Available Balance Invariant
 *   For any set of entries, availableBalance = totalIncome − (totalExpenses + totalSavings).
 *
 * Property 5: Entry Amount Validation
 *   For any amount <= 0, creation/update should be rejected with a 400 ValidationException.
 */
class EntryPropertyTest {

    // ── helpers: fresh service instances per test ─────────────────────────────

    /**
     * Creates a real FlowSheetService backed by fresh mocks.
     * Used for Property 1 tests that only call computeAvailableBalance (no repo interaction).
     */
    private FlowSheetService realFlowSheetService() {
        return new FlowSheetService(
                mock(FlowSheetRepository.class),
                mock(EntryRepository.class),
                mock(RecurringEntryRepository.class),
                mock(com.lunero.recurring.RecurringEntryService.class),
                mock(AuditLogService.class),
                mock(com.lunero.projection.ProjectionService.class));
    }

    /**
     * Creates a fresh EntryService with fresh mocks for each property try.
     * Returns a holder so callers can configure the mocks.
     */
    private ServiceHolder freshServices() {
        FlowSheetRepository flowSheetRepo = mock(FlowSheetRepository.class);
        EntryRepository entryRepo         = mock(EntryRepository.class);
        AuditLogService auditLog          = mock(AuditLogService.class);
        CurrencyService currencyService   = mock(CurrencyService.class);
        UserRepository userRepo           = mock(UserRepository.class);
        FlowSheetService flowSheetService = new FlowSheetService(
                flowSheetRepo, entryRepo, mock(RecurringEntryRepository.class),
                mock(com.lunero.recurring.RecurringEntryService.class), auditLog,
                mock(com.lunero.projection.ProjectionService.class));
        EntryService entryService = new EntryService(
                entryRepo, flowSheetRepo, flowSheetService, auditLog, currencyService, userRepo,
                mock(com.lunero.notification.NotificationService.class));
        return new ServiceHolder(entryService, entryRepo, flowSheetRepo, currencyService, userRepo);
    }

    record ServiceHolder(EntryService entryService,
                         EntryRepository entryRepo,
                         FlowSheetRepository flowSheetRepo,
                         CurrencyService currencyService,
                         UserRepository userRepo) {}

    // ── Property 1: Available Balance Invariant ───────────────────────────────

    /**
     * // Feature: lunero-budgeting-app, Property 1: Available Balance Invariant
     *
     * For any combination of income, expense, and savings entries with positive amounts,
     * computeAvailableBalance must always equal totalIncome − (totalExpenses + totalSavings).
     *
     * Validates: Requirements 1.2, 2.4, 2.7
     */
    @Property(tries = 500)
    void property1_availableBalanceInvariant(
            @ForAll @IntRange(min = 0, max = 10) int incomeCount,
            @ForAll @IntRange(min = 0, max = 10) int expenseCount,
            @ForAll @IntRange(min = 0, max = 10) int savingsCount,
            @ForAll @Positive int baseAmount) {

        BigDecimal amount = BigDecimal.valueOf(baseAmount);
        List<EntryEntity> entries = buildEntries(incomeCount, expenseCount, savingsCount, amount);

        BigDecimal result = realFlowSheetService().computeAvailableBalance(entries);

        BigDecimal expectedIncome   = amount.multiply(BigDecimal.valueOf(incomeCount));
        BigDecimal expectedExpenses = amount.multiply(BigDecimal.valueOf(expenseCount));
        BigDecimal expectedSavings  = amount.multiply(BigDecimal.valueOf(savingsCount));
        BigDecimal expected = expectedIncome.subtract(expectedExpenses.add(expectedSavings));

        assertThat(result).isEqualByComparingTo(expected);
    }

    /**
     * // Feature: lunero-budgeting-app, Property 1: Available Balance Invariant
     *
     * When convertedAmount is present, it must be used instead of amount in the balance calculation.
     *
     * Validates: Requirements 1.2, 2.10, 10.3
     */
    @Property(tries = 200)
    void property1_balanceUsesConvertedAmountWhenPresent(
            @ForAll @Positive int originalAmount,
            @ForAll @Positive int convertedAmount) {

        EntryEntity income = EntryEntity.builder()
                .id(UUID.randomUUID()).flowSheetId(UUID.randomUUID()).userId(UUID.randomUUID())
                .entryType("income").categoryId(UUID.randomUUID())
                .amount(BigDecimal.valueOf(originalAmount))
                .convertedAmount(BigDecimal.valueOf(convertedAmount))
                .currency("EUR").entryDate(LocalDate.now()).isDeleted(false)
                .build();

        BigDecimal balance = realFlowSheetService().computeAvailableBalance(List.of(income));

        assertThat(balance).isEqualByComparingTo(BigDecimal.valueOf(convertedAmount));
    }

    /**
     * // Feature: lunero-budgeting-app, Property 1: Available Balance Invariant
     *
     * Deleted entries must never contribute to the available balance.
     *
     * Validates: Requirements 2.7
     */
    @Property(tries = 200)
    void property1_deletedEntriesDoNotAffectBalance(
            @ForAll @IntRange(min = 1, max = 5) int deletedCount,
            @ForAll @Positive int amount) {

        List<EntryEntity> entries = new ArrayList<>();
        for (int i = 0; i < deletedCount; i++) {
            entries.add(EntryEntity.builder()
                    .id(UUID.randomUUID()).flowSheetId(UUID.randomUUID()).userId(UUID.randomUUID())
                    .entryType("income").categoryId(UUID.randomUUID())
                    .amount(BigDecimal.valueOf(amount))
                    .currency("USD").entryDate(LocalDate.now()).isDeleted(true)
                    .build());
        }

        BigDecimal balance = realFlowSheetService().computeAvailableBalance(entries);

        assertThat(balance).isEqualByComparingTo(BigDecimal.ZERO);
    }

    // ── Property 5: Entry Amount Validation ──────────────────────────────────

    /**
     * // Feature: lunero-budgeting-app, Property 5: Entry Amount Validation
     *
     * For any amount <= 0, createEntry must reject the request with a ValidationException (→ HTTP 400).
     * Amount validation fires before any repository call, so no mocking is needed.
     *
     * Validates: Requirements 2.8
     */
    @Property(tries = 300)
    void property5_createEntry_rejectsNonPositiveAmount(
            @ForAll("nonPositiveAmounts") BigDecimal amount) {

        // Amount validation is the very first thing EntryService.createEntry does —
        // no repository interaction occurs, so fresh mocks with no stubs are fine.
        ServiceHolder h = freshServices();

        UUID sheetId    = UUID.randomUUID();
        UUID categoryId = UUID.randomUUID();
        UUID userId     = UUID.randomUUID();

        CreateEntryRequest req = new CreateEntryRequest(
                sheetId, "expense", categoryId, amount,
                "USD", LocalDate.now(), null, null);

        assertThatThrownBy(() -> h.entryService().createEntry(userId, req))
                .isInstanceOf(ValidationException.class)
                .hasMessageContaining("amount must be greater than 0");
    }

    /**
     * // Feature: lunero-budgeting-app, Property 5: Entry Amount Validation
     *
     * For any amount <= 0, updateEntry must reject the request with a ValidationException (→ HTTP 400).
     *
     * Validates: Requirements 2.8
     */
    @Property(tries = 300)
    void property5_updateEntry_rejectsNonPositiveAmount(
            @ForAll("nonPositiveAmounts") BigDecimal amount) {

        ServiceHolder h = freshServices();

        UUID userId  = UUID.randomUUID();
        UUID entryId = UUID.randomUUID();
        UUID sheetId = UUID.randomUUID();

        EntryEntity existing = EntryEntity.builder()
                .id(entryId).flowSheetId(sheetId).userId(userId)
                .entryType("expense").categoryId(UUID.randomUUID())
                .amount(new BigDecimal("100")).currency("USD")
                .entryDate(LocalDate.now()).isDeleted(false)
                .build();

        FlowSheetEntity sheet = FlowSheetEntity.builder()
                .id(sheetId).userId(userId).periodType("monthly")
                .startDate(LocalDate.now().minusMonths(1))
                .endDate(LocalDate.now().plusDays(10))
                .status("active").editLocked(false)
                .build();

        when(h.entryRepo().findByIdAndUserIdAndIsDeletedFalse(entryId, userId))
                .thenReturn(Optional.of(existing));
        when(h.flowSheetRepo().findByIdAndUserId(sheetId, userId))
                .thenReturn(Optional.of(sheet));

        UpdateEntryRequest req = new UpdateEntryRequest(null, null, amount, null, null, null, null);

        assertThatThrownBy(() -> h.entryService().updateEntry(userId, entryId, req))
                .isInstanceOf(ValidationException.class)
                .hasMessageContaining("amount must be greater than 0");
    }

    /**
     * // Feature: lunero-budgeting-app, Property 5: Entry Amount Validation
     *
     * For any positive amount, createEntry must NOT throw a ValidationException.
     * This confirms the boundary: only amounts <= 0 are rejected.
     *
     * Validates: Requirements 2.8
     */
    @Property(tries = 200)
    void property5_createEntry_acceptsPositiveAmount(
            @ForAll @Positive int rawAmount) {

        ServiceHolder h = freshServices();

        BigDecimal amount = BigDecimal.valueOf(rawAmount);
        UUID userId     = UUID.randomUUID();
        UUID sheetId    = UUID.randomUUID();
        UUID categoryId = UUID.randomUUID();

        FlowSheetEntity sheet = FlowSheetEntity.builder()
                .id(sheetId).userId(userId).periodType("monthly")
                .startDate(LocalDate.now().minusMonths(1))
                .endDate(LocalDate.now().plusDays(10))
                .status("active").editLocked(false)
                .build();

        EntryEntity saved = EntryEntity.builder()
                .id(UUID.randomUUID()).flowSheetId(sheetId).userId(userId)
                .entryType("income").categoryId(categoryId)
                .amount(amount).currency("USD")
                .entryDate(LocalDate.now()).isDeleted(false)
                .build();

        com.lunero.user.UserEntity user = com.lunero.user.UserEntity.builder()
                .id(userId).clerkUserId("clerk_test").displayName("Test").defaultCurrency("USD").build();

        when(h.flowSheetRepo().findByIdAndUserId(sheetId, userId)).thenReturn(Optional.of(sheet));
        when(h.entryRepo().save(any())).thenReturn(saved);
        when(h.entryRepo().findByFlowSheetIdAndIsDeletedFalse(sheetId)).thenReturn(List.of(saved));
        when(h.userRepo().findById(userId)).thenReturn(Optional.of(user));

        CreateEntryRequest req = new CreateEntryRequest(
                sheetId, "income", categoryId, amount,
                "USD", LocalDate.now(), null, null);

        EntryResponse response = h.entryService().createEntry(userId, req);
        assertThat(response).isNotNull();
        assertThat(response.amount()).isEqualByComparingTo(amount);
    }

    // ── Arbitraries ───────────────────────────────────────────────────────────

    @Provide
    Arbitrary<BigDecimal> nonPositiveAmounts() {
        return Arbitraries.oneOf(
                Arbitraries.just(BigDecimal.ZERO),
                Arbitraries.integers().between(1, 100_000)
                        .map(i -> BigDecimal.valueOf(-i)),
                Arbitraries.integers().between(1, 100_000)
                        .map(i -> BigDecimal.valueOf(-i).movePointLeft(2))
        );
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    private List<EntryEntity> buildEntries(int income, int expense, int savings, BigDecimal amount) {
        List<EntryEntity> list = new ArrayList<>();
        for (int i = 0; i < income;   i++) list.add(entry("income",  amount));
        for (int i = 0; i < expense;  i++) list.add(entry("expense", amount));
        for (int i = 0; i < savings;  i++) list.add(entry("savings", amount));
        return list;
    }

    private EntryEntity entry(String type, BigDecimal amount) {
        return EntryEntity.builder()
                .id(UUID.randomUUID()).flowSheetId(UUID.randomUUID()).userId(UUID.randomUUID())
                .entryType(type).categoryId(UUID.randomUUID())
                .amount(amount).currency("USD")
                .entryDate(LocalDate.now()).isDeleted(false)
                .build();
    }
}
