package com.lunero.ai;

import com.lunero.category.CategoryRepository;
import com.lunero.entry.EntryEntity;
import com.lunero.entry.EntryRepository;
import com.lunero.entry.EntryService;
import com.lunero.flowsheet.FlowSheetEntity;
import com.lunero.flowsheet.FlowSheetRepository;
import com.lunero.recurring.RecurringEntryEntity;
import com.lunero.recurring.RecurringEntryRepository;
import com.lunero.user.UserEntity;
import com.lunero.user.UserRepository;
import net.jqwik.api.*;
import net.jqwik.api.constraints.IntRange;
import net.jqwik.api.constraints.Positive;
import org.springframework.ai.chat.client.ChatClient;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Property-based tests for the Mira AI domain.
 *
 * Property 20: Data Isolation — Mira only accesses data of the authenticated user
 * Property 21: Alert Trigger — overspend alert fires when projected balance < 0
 * Property 22: Dismissed Alert — dismissed alerts are not re-surfaced for the same period
 * Property 23: Alerts-Disabled Setting — when overspendAlerts=false, alert list is empty
 */
class MiraPropertyTest {

    private MiraService freshService(
            ChatClient chatClient,
            FlowSheetRepository flowSheetRepo,
            EntryRepository entryRepo,
            RecurringEntryRepository recurringRepo,
            UserRepository userRepo,
            DismissedAlertRepository dismissedRepo,
            EntryService entryService,
            CategoryRepository categoryRepo) {
        return new MiraService(chatClient, flowSheetRepo, entryRepo, recurringRepo,
                userRepo, dismissedRepo, entryService, categoryRepo,
                org.mockito.Mockito.mock(com.lunero.projection.ProjectionService.class));
    }

    // ── Property 20: Data Isolation ───────────────────────────────────────────

    /**
     * // Feature: lunero-budgeting-app, Property 20: Mira Data Isolation
     *
     * For any Mira query by user A, the context prompt injected into Gemini must
     * contain only data belonging to user A and must not reference any other user's
     * FlowSheet IDs or user IDs.
     *
     * Validates: Requirements 7.6
     */
    @Property(tries = 200)
    void property20_contextPrompt_containsOnlyAuthenticatedUserData(
            @ForAll @IntRange(min = 0, max = 5) int incomeCount,
            @ForAll @IntRange(min = 0, max = 5) int expenseCount,
            @ForAll @Positive int baseAmount) {

        UUID userA = UUID.randomUUID();
        UUID userB = UUID.randomUUID();
        UUID sheetA = UUID.randomUUID();
        UUID sheetB = UUID.randomUUID();

        BigDecimal amount = BigDecimal.valueOf(baseAmount);

        FlowSheetEntity sheet = FlowSheetEntity.builder()
                .id(sheetA).userId(userA).periodType("monthly")
                .startDate(LocalDate.of(2024, 1, 1))
                .endDate(LocalDate.of(2024, 1, 31))
                .status("active").editLocked(false).build();

        List<EntryEntity> userAEntries = buildEntries(userA, sheetA, incomeCount, expenseCount, amount);

        FlowSheetRepository flowSheetRepo = mock(FlowSheetRepository.class);
        EntryRepository entryRepo = mock(EntryRepository.class);

        when(flowSheetRepo.findByUserIdAndStatus(userA, "active")).thenReturn(Optional.of(sheet));
        when(entryRepo.findByFlowSheetIdAndIsDeletedFalse(sheetA)).thenReturn(userAEntries);

        MiraService service = freshService(mock(ChatClient.class), flowSheetRepo, entryRepo,
                mock(RecurringEntryRepository.class), mock(UserRepository.class),
                mock(DismissedAlertRepository.class), mock(EntryService.class),
                mock(CategoryRepository.class));

        String prompt = service.buildContextPrompt(userA, "test question");

        // Prompt must not contain user B's identifiers
        assertThat(prompt).doesNotContain(userB.toString());
        assertThat(prompt).doesNotContain(sheetB.toString());

        // Prompt must only query user A's data
        verify(flowSheetRepo).findByUserIdAndStatus(userA, "active");
        verify(flowSheetRepo, never()).findByUserIdAndStatus(eq(userB), any());
        verify(entryRepo, never()).findByFlowSheetIdAndIsDeletedFalse(sheetB);
    }

    // ── Property 21: Alert Trigger ────────────────────────────────────────────

    /**
     * // Feature: lunero-budgeting-app, Property 21: Proactive Balance Alert Trigger
     *
     * For any user whose projected balance (current balance minus recurring expenses)
     * is negative, checkProactiveAlerts must return at least one overspend alert.
     *
     * Validates: Requirements 7.3
     */
    @Property(tries = 300)
    void property21_alertFires_whenProjectedBalanceIsNegative(
            @ForAll @Positive int currentBalanceAmount,
            @ForAll @Positive int recurringExpenseAmount) {

        // Ensure recurring expense > current balance so projected balance < 0
        BigDecimal balance = BigDecimal.valueOf(currentBalanceAmount);
        BigDecimal recurringExpense = balance.add(BigDecimal.ONE); // always > balance

        UUID userId = UUID.randomUUID();
        UUID sheetId = UUID.randomUUID();

        UserEntity user = UserEntity.builder().id(userId).clerkUserId("c")
                .displayName("T").defaultCurrency("USD")
                .overspendAlerts(true).onboardingComplete(true).build();

        FlowSheetEntity sheet = FlowSheetEntity.builder()
                .id(sheetId).userId(userId).periodType("monthly")
                .startDate(LocalDate.of(2024, 1, 1))
                .endDate(LocalDate.of(2024, 1, 31))
                .status("active").editLocked(false).build();

        // Single income entry = currentBalance
        EntryEntity incomeEntry = EntryEntity.builder()
                .id(UUID.randomUUID()).flowSheetId(sheetId).userId(userId)
                .entryType("income").categoryId(UUID.randomUUID())
                .amount(balance).currency("USD")
                .entryDate(LocalDate.of(2024, 1, 5)).isDeleted(false).build();

        RecurringEntryEntity recurring = RecurringEntryEntity.builder()
                .id(UUID.randomUUID()).userId(userId)
                .entryType("expense").amount(recurringExpense)
                .currency("USD").cadence("monthly").isPaused(false).isDeleted(false).build();

        UserRepository userRepo = mock(UserRepository.class);
        FlowSheetRepository flowSheetRepo = mock(FlowSheetRepository.class);
        EntryRepository entryRepo = mock(EntryRepository.class);
        RecurringEntryRepository recurringRepo = mock(RecurringEntryRepository.class);
        DismissedAlertRepository dismissedRepo = mock(DismissedAlertRepository.class);

        when(userRepo.findById(userId)).thenReturn(Optional.of(user));
        when(flowSheetRepo.findByUserIdAndStatus(userId, "active")).thenReturn(Optional.of(sheet));
        when(entryRepo.findByFlowSheetIdAndIsDeletedFalse(sheetId)).thenReturn(List.of(incomeEntry));
        when(recurringRepo.findByUserIdAndIsPausedFalseAndIsDeletedFalse(userId)).thenReturn(List.of(recurring));
        when(dismissedRepo.existsByUserIdAndAlertTypeAndFlowSheetId(
                userId, MiraService.OVERSPEND_ALERT_TYPE, sheetId)).thenReturn(false);

        MiraService service = freshService(mock(ChatClient.class), flowSheetRepo, entryRepo,
                recurringRepo, userRepo, dismissedRepo, mock(EntryService.class),
                mock(CategoryRepository.class));

        List<AlertResponse> alerts = service.checkProactiveAlerts(userId);

        assertThat(alerts).isNotEmpty();
        assertThat(alerts.get(0).alertType()).isEqualTo(MiraService.OVERSPEND_ALERT_TYPE);
    }

    /**
     * // Feature: lunero-budgeting-app, Property 21: Proactive Balance Alert Trigger
     *
     * When projected balance >= 0, no overspend alert should be generated.
     *
     * Validates: Requirements 7.3
     */
    @Property(tries = 200)
    void property21_noAlert_whenProjectedBalanceIsNonNegative(
            @ForAll @Positive int incomeAmount,
            @ForAll @IntRange(min = 0, max = 100) int recurringExpenseAmount) {

        // Ensure income > recurring expense so projected balance >= 0
        BigDecimal income = BigDecimal.valueOf(incomeAmount).add(BigDecimal.valueOf(recurringExpenseAmount));
        BigDecimal recurringExpense = BigDecimal.valueOf(recurringExpenseAmount);

        UUID userId = UUID.randomUUID();
        UUID sheetId = UUID.randomUUID();

        UserEntity user = UserEntity.builder().id(userId).clerkUserId("c")
                .displayName("T").defaultCurrency("USD")
                .overspendAlerts(true).onboardingComplete(true).build();

        FlowSheetEntity sheet = FlowSheetEntity.builder()
                .id(sheetId).userId(userId).periodType("monthly")
                .startDate(LocalDate.of(2024, 1, 1))
                .endDate(LocalDate.of(2024, 1, 31))
                .status("active").editLocked(false).build();

        EntryEntity incomeEntry = EntryEntity.builder()
                .id(UUID.randomUUID()).flowSheetId(sheetId).userId(userId)
                .entryType("income").categoryId(UUID.randomUUID())
                .amount(income).currency("USD")
                .entryDate(LocalDate.of(2024, 1, 5)).isDeleted(false).build();

        UserRepository userRepo = mock(UserRepository.class);
        FlowSheetRepository flowSheetRepo = mock(FlowSheetRepository.class);
        EntryRepository entryRepo = mock(EntryRepository.class);
        RecurringEntryRepository recurringRepo = mock(RecurringEntryRepository.class);

        when(userRepo.findById(userId)).thenReturn(Optional.of(user));
        when(flowSheetRepo.findByUserIdAndStatus(userId, "active")).thenReturn(Optional.of(sheet));
        when(entryRepo.findByFlowSheetIdAndIsDeletedFalse(sheetId)).thenReturn(List.of(incomeEntry));

        List<RecurringEntryEntity> recurringList = new ArrayList<>();
        if (recurringExpenseAmount > 0) {
            recurringList.add(RecurringEntryEntity.builder()
                    .id(UUID.randomUUID()).userId(userId)
                    .entryType("expense").amount(recurringExpense)
                    .currency("USD").cadence("monthly").isPaused(false).isDeleted(false).build());
        }
        when(recurringRepo.findByUserIdAndIsPausedFalseAndIsDeletedFalse(userId)).thenReturn(recurringList);

        MiraService service = freshService(mock(ChatClient.class), flowSheetRepo, entryRepo,
                recurringRepo, userRepo, mock(DismissedAlertRepository.class),
                mock(EntryService.class), mock(CategoryRepository.class));

        List<AlertResponse> alerts = service.checkProactiveAlerts(userId);

        assertThat(alerts).isEmpty();
    }

    // ── Property 22: Dismissed Alert ─────────────────────────────────────────

    /**
     * // Feature: lunero-budgeting-app, Property 22: Dismissed Alert Not Re-Surfaced
     *
     * For any alert that has been dismissed for a given FlowSheet period,
     * checkProactiveAlerts must not return that alert for the same period.
     *
     * Validates: Requirements 7.5
     */
    @Property(tries = 200)
    void property22_dismissedAlert_notReturnedForSamePeriod(
            @ForAll @Positive int expenseAmount) {

        UUID userId = UUID.randomUUID();
        UUID sheetId = UUID.randomUUID();

        UserEntity user = UserEntity.builder().id(userId).clerkUserId("c")
                .displayName("T").defaultCurrency("USD")
                .overspendAlerts(true).onboardingComplete(true).build();

        FlowSheetEntity sheet = FlowSheetEntity.builder()
                .id(sheetId).userId(userId).periodType("monthly")
                .startDate(LocalDate.of(2024, 1, 1))
                .endDate(LocalDate.of(2024, 1, 31))
                .status("active").editLocked(false).build();

        // Negative balance scenario
        EntryEntity expenseEntry = EntryEntity.builder()
                .id(UUID.randomUUID()).flowSheetId(sheetId).userId(userId)
                .entryType("expense").categoryId(UUID.randomUUID())
                .amount(BigDecimal.valueOf(expenseAmount)).currency("USD")
                .entryDate(LocalDate.of(2024, 1, 5)).isDeleted(false).build();

        RecurringEntryEntity recurring = RecurringEntryEntity.builder()
                .id(UUID.randomUUID()).userId(userId)
                .entryType("expense").amount(BigDecimal.ONE)
                .currency("USD").cadence("monthly").isPaused(false).isDeleted(false).build();

        UserRepository userRepo = mock(UserRepository.class);
        FlowSheetRepository flowSheetRepo = mock(FlowSheetRepository.class);
        EntryRepository entryRepo = mock(EntryRepository.class);
        RecurringEntryRepository recurringRepo = mock(RecurringEntryRepository.class);
        DismissedAlertRepository dismissedRepo = mock(DismissedAlertRepository.class);

        when(userRepo.findById(userId)).thenReturn(Optional.of(user));
        when(flowSheetRepo.findByUserIdAndStatus(userId, "active")).thenReturn(Optional.of(sheet));
        when(entryRepo.findByFlowSheetIdAndIsDeletedFalse(sheetId)).thenReturn(List.of(expenseEntry));
        when(recurringRepo.findByUserIdAndIsPausedFalseAndIsDeletedFalse(userId)).thenReturn(List.of(recurring));
        // Alert is dismissed for this period
        when(dismissedRepo.existsByUserIdAndAlertTypeAndFlowSheetId(
                userId, MiraService.OVERSPEND_ALERT_TYPE, sheetId)).thenReturn(true);

        MiraService service = freshService(mock(ChatClient.class), flowSheetRepo, entryRepo,
                recurringRepo, userRepo, dismissedRepo, mock(EntryService.class),
                mock(CategoryRepository.class));

        List<AlertResponse> alerts = service.checkProactiveAlerts(userId);

        assertThat(alerts).isEmpty();
    }

    // ── Property 23: Alerts-Disabled Setting ─────────────────────────────────

    /**
     * // Feature: lunero-budgeting-app, Property 23: AI Alerts Disabled Respects Setting
     *
     * For any user with overspendAlerts=false, checkProactiveAlerts must always
     * return an empty list regardless of balance or recurring entries.
     *
     * Validates: Requirements 7.8
     */
    @Property(tries = 200)
    void property23_alertsDisabled_alwaysReturnsEmpty(
            @ForAll @Positive int incomeAmount,
            @ForAll @Positive int expenseAmount) {

        UUID userId = UUID.randomUUID();

        // overspendAlerts = false
        UserEntity user = UserEntity.builder().id(userId).clerkUserId("c")
                .displayName("T").defaultCurrency("USD")
                .overspendAlerts(false).onboardingComplete(true).build();

        UserRepository userRepo = mock(UserRepository.class);
        FlowSheetRepository flowSheetRepo = mock(FlowSheetRepository.class);

        when(userRepo.findById(userId)).thenReturn(Optional.of(user));

        MiraService service = freshService(mock(ChatClient.class), flowSheetRepo,
                mock(EntryRepository.class), mock(RecurringEntryRepository.class),
                userRepo, mock(DismissedAlertRepository.class),
                mock(EntryService.class), mock(CategoryRepository.class));

        List<AlertResponse> alerts = service.checkProactiveAlerts(userId);

        assertThat(alerts).isEmpty();
        // Must not even query the FlowSheet — short-circuit on setting
        verifyNoInteractions(flowSheetRepo);
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    private List<EntryEntity> buildEntries(UUID userId, UUID sheetId,
                                            int incomeCount, int expenseCount,
                                            BigDecimal amount) {
        List<EntryEntity> list = new ArrayList<>();
        for (int i = 0; i < incomeCount; i++) {
            list.add(EntryEntity.builder()
                    .id(UUID.randomUUID()).flowSheetId(sheetId).userId(userId)
                    .entryType("income").categoryId(UUID.randomUUID())
                    .amount(amount).currency("USD")
                    .entryDate(LocalDate.of(2024, 1, 5)).isDeleted(false).build());
        }
        for (int i = 0; i < expenseCount; i++) {
            list.add(EntryEntity.builder()
                    .id(UUID.randomUUID()).flowSheetId(sheetId).userId(userId)
                    .entryType("expense").categoryId(UUID.randomUUID())
                    .amount(amount).currency("USD")
                    .entryDate(LocalDate.of(2024, 1, 10)).isDeleted(false).build());
        }
        return list;
    }
}
