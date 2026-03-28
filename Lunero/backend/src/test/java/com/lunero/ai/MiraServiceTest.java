package com.lunero.ai;

import com.lunero.category.CategoryEntity;
import com.lunero.category.CategoryRepository;
import com.lunero.entry.EntryEntity;
import com.lunero.entry.EntryRepository;
import com.lunero.entry.EntryResponse;
import com.lunero.entry.EntryService;
import com.lunero.flowsheet.FlowSheetEntity;
import com.lunero.flowsheet.FlowSheetRepository;
import com.lunero.projection.CategoryProjectionEntity;
import com.lunero.projection.ProjectionService;
import com.lunero.recurring.RecurringEntryEntity;
import com.lunero.recurring.RecurringEntryRepository;
import com.lunero.user.UserEntity;
import com.lunero.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.ai.chat.client.ChatClient;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MiraServiceTest {

    // Spring AI ChatClient and its fluent-API chain mocks (prompt → user → call → content)
    @Mock private ChatClient chatClient;
    @Mock private ChatClient.Builder chatClientBuilder;
    @Mock private ChatClient.ChatClientRequestSpec requestSpec;
    @Mock private ChatClient.CallResponseSpec callResponseSpec;

    // Data-access mocks — each covers one domain aggregate
    @Mock private FlowSheetRepository flowSheetRepository;
    @Mock private EntryRepository entryRepository;
    @Mock private RecurringEntryRepository recurringEntryRepository;
    @Mock private UserRepository userRepository;
    @Mock private DismissedAlertRepository dismissedAlertRepository;
    @Mock private EntryService entryService;
    @Mock private CategoryRepository categoryRepository;
    // ProjectionService is used when Mira detects a "plan to spend/save" intent (req 29.5)
    @Mock private ProjectionService projectionService;

    private MiraService miraService;

    // Stable IDs reused across tests to keep assertions readable
    private final UUID userId = UUID.randomUUID();
    private final UUID sheetId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        // Construct MiraService directly (no Spring context) — all dependencies injected as mocks
        miraService = new MiraService(
                chatClient, flowSheetRepository, entryRepository,
                recurringEntryRepository, userRepository,
                dismissedAlertRepository, entryService, categoryRepository,
                projectionService
        );
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    /** User who has completed onboarding — Mira operates in normal query mode. */
    private UserEntity onboardedUser() {
        return UserEntity.builder()
                .id(userId).clerkUserId("clerk_test")
                .displayName("Test").defaultCurrency("USD")
                .overspendAlerts(true).onboardingComplete(true)
                .build();
    }

    /** User who has NOT completed onboarding — Mira operates in entry-extraction mode. */
    private UserEntity newUser() {
        return UserEntity.builder()
                .id(userId).clerkUserId("clerk_test")
                .displayName("Test").defaultCurrency("USD")
                .overspendAlerts(true).onboardingComplete(false)
                .build();
    }

    private FlowSheetEntity activeSheet() {
        return FlowSheetEntity.builder()
                .id(sheetId).userId(userId)
                .periodType("monthly")
                .startDate(LocalDate.now().withDayOfMonth(1))
                .endDate(LocalDate.now().withDayOfMonth(28))
                .status("active").editLocked(false)
                .build();
    }

    /** Builds a minimal non-deleted entry for the active sheet. */
    private EntryEntity entry(String type, BigDecimal amount) {
        return EntryEntity.builder()
                .id(UUID.randomUUID()).flowSheetId(sheetId).userId(userId)
                .entryType(type).category("TestCategory")
                .amount(amount).currency("USD")
                .entryDate(LocalDate.now()).isDeleted(false)
                .build();
    }

    /**
     * Stubs the full Spring AI ChatClient fluent chain so that calling
     * chatClient.prompt().user(…).call().content() returns {@code response}.
     */
    private void stubGemini(String response) {
        when(chatClient.prompt()).thenReturn(requestSpec);
        when(requestSpec.user(anyString())).thenReturn(requestSpec);
        when(requestSpec.call()).thenReturn(callResponseSpec);
        when(callResponseSpec.content()).thenReturn(response);
    }

    // ── 12.1 query ────────────────────────────────────────────────────────────

    @Test
    void query_onboardedUser_callsGeminiAndReturnsResponse() {
        when(userRepository.findById(userId)).thenReturn(Optional.of(onboardedUser()));
        when(flowSheetRepository.findByUserIdAndStatus(userId, "active"))
                .thenReturn(Optional.of(activeSheet()));
        // Empty entries list — Mira still builds a context prompt and calls Gemini
        when(entryRepository.findByFlowSheetIdAndIsDeletedFalse(sheetId)).thenReturn(List.of());
        stubGemini("You're doing great with your budget!");

        Object result = miraService.query(userId, "How am I doing?");

        assertThat(result).isInstanceOf(MiraQueryResponse.class);
        assertThat(((MiraQueryResponse) result).response()).isEqualTo("You're doing great with your budget!");
    }

    @Test
    void query_onboardedUser_noActiveSheet_stillCallsGemini() {
        // Mira should gracefully handle a missing FlowSheet and still respond
        when(userRepository.findById(userId)).thenReturn(Optional.of(onboardedUser()));
        when(flowSheetRepository.findByUserIdAndStatus(userId, "active")).thenReturn(Optional.empty());
        stubGemini("No active FlowSheet found.");

        Object result = miraService.query(userId, "What's my balance?");

        assertThat(result).isInstanceOf(MiraQueryResponse.class);
    }

    // ── 12.5 Gemini unavailability ────────────────────────────────────────────

    @Test
    void query_geminiUnavailable_returnsFallbackMessage() {
        // When Gemini throws (network error, quota exceeded, etc.), Mira must return
        // a graceful fallback rather than propagating a 500 to the client
        when(userRepository.findById(userId)).thenReturn(Optional.of(onboardedUser()));
        when(flowSheetRepository.findByUserIdAndStatus(userId, "active")).thenReturn(Optional.empty());
        when(chatClient.prompt()).thenThrow(new RuntimeException("Gemini down"));

        Object result = miraService.query(userId, "Hello?");

        assertThat(result).isInstanceOf(MiraQueryResponse.class);
        assertThat(((MiraQueryResponse) result).response()).isEqualTo(MiraService.MIRA_UNAVAILABLE_MSG);
    }

    // ── 12.2 checkProactiveAlerts ─────────────────────────────────────────────

    @Test
    void checkProactiveAlerts_projectedBalanceNegative_returnsAlert() {
        when(userRepository.findById(userId)).thenReturn(Optional.of(onboardedUser()));
        when(flowSheetRepository.findByUserIdAndStatus(userId, "active"))
                .thenReturn(Optional.of(activeSheet()));
        // Current balance: income 100 - expense 50 = +50
        when(entryRepository.findByFlowSheetIdAndIsDeletedFalse(sheetId)).thenReturn(List.of(
                entry("income", new BigDecimal("100")),
                entry("expense", new BigDecimal("50"))
        ));
        // Upcoming recurring expense of 200 → projected balance = 50 - 200 = -150 → triggers alert
        RecurringEntryEntity recurring = RecurringEntryEntity.builder()
                .id(UUID.randomUUID()).userId(userId)
                .entryType("expense").amount(new BigDecimal("200"))
                .currency("USD").cadence("monthly").isPaused(false).isDeleted(false)
                .build();
        when(recurringEntryRepository.findByUserIdAndIsPausedFalseAndIsDeletedFalse(userId))
                .thenReturn(List.of(recurring));
        when(dismissedAlertRepository.existsByUserIdAndAlertTypeAndFlowSheetId(
                userId, MiraService.OVERSPEND_ALERT_TYPE, sheetId)).thenReturn(false);

        List<AlertResponse> alerts = miraService.checkProactiveAlerts(userId);

        assertThat(alerts).hasSize(1);
        assertThat(alerts.get(0).alertType()).isEqualTo(MiraService.OVERSPEND_ALERT_TYPE);
    }

    @Test
    void checkProactiveAlerts_projectedBalancePositive_returnsEmpty() {
        when(userRepository.findById(userId)).thenReturn(Optional.of(onboardedUser()));
        when(flowSheetRepository.findByUserIdAndStatus(userId, "active"))
                .thenReturn(Optional.of(activeSheet()));
        when(entryRepository.findByFlowSheetIdAndIsDeletedFalse(sheetId)).thenReturn(List.of(
                entry("income", new BigDecimal("5000"))
        ));
        when(recurringEntryRepository.findByUserIdAndIsPausedFalseAndIsDeletedFalse(userId))
                .thenReturn(List.of());

        List<AlertResponse> alerts = miraService.checkProactiveAlerts(userId);

        assertThat(alerts).isEmpty();
    }

    @Test
    void checkProactiveAlerts_noActiveSheet_returnsEmpty() {
        when(userRepository.findById(userId)).thenReturn(Optional.of(onboardedUser()));
        when(flowSheetRepository.findByUserIdAndStatus(userId, "active")).thenReturn(Optional.empty());

        List<AlertResponse> alerts = miraService.checkProactiveAlerts(userId);

        assertThat(alerts).isEmpty();
    }

    // ── 12.4 overspendAlerts=false ────────────────────────────────────────────

    @Test
    void checkProactiveAlerts_alertsDisabled_returnsEmpty() {
        // When the user has opted out of overspend alerts, no repository calls should be made
        UserEntity user = UserEntity.builder()
                .id(userId).clerkUserId("clerk_test").displayName("Test")
                .defaultCurrency("USD").overspendAlerts(false).onboardingComplete(true)
                .build();
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        List<AlertResponse> alerts = miraService.checkProactiveAlerts(userId);

        assertThat(alerts).isEmpty();
        // Short-circuit: FlowSheet lookup must be skipped entirely
        verifyNoInteractions(flowSheetRepository);
    }

    // ── 12.3 dismissAlert ─────────────────────────────────────────────────────

    @Test
    void dismissAlert_savesToDismissedAlerts() {
        when(flowSheetRepository.findByIdAndUserId(sheetId, userId))
                .thenReturn(Optional.of(activeSheet()));
        when(dismissedAlertRepository.existsByUserIdAndAlertTypeAndFlowSheetId(
                userId, MiraService.OVERSPEND_ALERT_TYPE, sheetId)).thenReturn(false);

        miraService.dismissAlert(userId, sheetId);

        // Verify the saved entity carries the correct user, alert type, and sheet reference
        verify(dismissedAlertRepository).save(argThat(d ->
                d.getUserId().equals(userId) &&
                d.getAlertType().equals(MiraService.OVERSPEND_ALERT_TYPE) &&
                d.getFlowSheetId().equals(sheetId)
        ));
    }

    @Test
    void dismissAlert_alreadyDismissed_doesNotSaveAgain() {
        // Idempotency guard: dismissing the same alert twice must not create duplicate rows
        when(flowSheetRepository.findByIdAndUserId(sheetId, userId))
                .thenReturn(Optional.of(activeSheet()));
        when(dismissedAlertRepository.existsByUserIdAndAlertTypeAndFlowSheetId(
                userId, MiraService.OVERSPEND_ALERT_TYPE, sheetId)).thenReturn(true);

        miraService.dismissAlert(userId, sheetId);

        verify(dismissedAlertRepository, never()).save(any());
    }

    @Test
    void checkProactiveAlerts_dismissedAlert_notReturned() {
        when(userRepository.findById(userId)).thenReturn(Optional.of(onboardedUser()));
        when(flowSheetRepository.findByUserIdAndStatus(userId, "active"))
                .thenReturn(Optional.of(activeSheet()));
        // Heavily negative balance to ensure the alert would fire if not dismissed
        when(entryRepository.findByFlowSheetIdAndIsDeletedFalse(sheetId)).thenReturn(List.of(
                entry("expense", new BigDecimal("9999"))
        ));
        RecurringEntryEntity recurring = RecurringEntryEntity.builder()
                .id(UUID.randomUUID()).userId(userId)
                .entryType("expense").amount(new BigDecimal("1"))
                .currency("USD").cadence("monthly").isPaused(false).isDeleted(false)
                .build();
        when(recurringEntryRepository.findByUserIdAndIsPausedFalseAndIsDeletedFalse(userId))
                .thenReturn(List.of(recurring));
        // User already dismissed this alert for the current FlowSheet
        when(dismissedAlertRepository.existsByUserIdAndAlertTypeAndFlowSheetId(
                userId, MiraService.OVERSPEND_ALERT_TYPE, sheetId)).thenReturn(true);

        List<AlertResponse> alerts = miraService.checkProactiveAlerts(userId);

        assertThat(alerts).isEmpty();
    }

    // ── 12.6 onboarding mode ──────────────────────────────────────────────────

    @Test
    void query_onboardingMode_returnsOnboardingSummary() {
        // For new users, Mira parses natural-language income/expense descriptions
        // and auto-creates entries — returning an OnboardingSummaryResponse instead of MiraQueryResponse
        when(userRepository.findById(userId)).thenReturn(Optional.of(newUser()));
        when(flowSheetRepository.findByUserIdAndStatus(userId, "active"))
                .thenReturn(Optional.of(activeSheet()));
        when(categoryRepository.findAllByUserIdOrderBySortOrderAsc(userId))
                .thenReturn(List.of(
                        CategoryEntity.builder().id(UUID.randomUUID()).userId(userId)
                                .entryType("income").name("Salary").build(),
                        CategoryEntity.builder().id(UUID.randomUUID()).userId(userId)
                                .entryType("expense").name("Rent").build()
                ));
        // Gemini returns pipe-delimited lines: type|amount|currency|note
        stubGemini("income|3000|USD|Salary\nexpense|800|USD|Rent");

        EntryResponse fakeEntry = new EntryResponse(
                UUID.randomUUID(), sheetId, userId, "income", "TestCategory",
                new BigDecimal("3000"), "USD", null, null,
                LocalDate.now(), "Salary", false, null, Instant.now(), Instant.now(), null
        );
        when(entryService.createEntry(eq(userId), any())).thenReturn(fakeEntry);

        Object result = miraService.query(userId, "I earn $3000 and spend $800 on rent");

        assertThat(result).isInstanceOf(OnboardingSummaryResponse.class);
        OnboardingSummaryResponse summary = (OnboardingSummaryResponse) result;
        assertThat(summary.createdEntries()).isNotEmpty();
    }

    @Test
    void query_onboardingMode_geminiUnavailable_returnsFallback() {
        // Onboarding fallback must also return OnboardingSummaryResponse (not MiraQueryResponse)
        // so the frontend can handle both cases with the same type check
        when(userRepository.findById(userId)).thenReturn(Optional.of(newUser()));
        when(chatClient.prompt()).thenThrow(new RuntimeException("Gemini down"));

        Object result = miraService.query(userId, "I earn $3000");

        assertThat(result).isInstanceOf(OnboardingSummaryResponse.class);
        assertThat(((OnboardingSummaryResponse) result).message()).isEqualTo(MiraService.MIRA_UNAVAILABLE_MSG);
    }

    // ── buildContextPrompt data isolation ─────────────────────────────────────

    @Test
    void buildContextPrompt_onlyContainsAuthenticatedUserData() {
        // Security property: the prompt sent to Gemini must never include another user's data
        UUID otherUserId = UUID.randomUUID();
        UUID otherSheetId = UUID.randomUUID();

        when(flowSheetRepository.findByUserIdAndStatus(userId, "active"))
                .thenReturn(Optional.of(activeSheet()));
        when(entryRepository.findByFlowSheetIdAndIsDeletedFalse(sheetId)).thenReturn(List.of(
                entry("income", new BigDecimal("1000"))
        ));

        String prompt = miraService.buildContextPrompt(userId, "test");

        assertThat(prompt).doesNotContain(otherUserId.toString());
        assertThat(prompt).doesNotContain(otherSheetId.toString());
        assertThat(prompt).contains("1000");
    }

    // ── parseOnboardingEntries ────────────────────────────────────────────────

    @Test
    void parseOnboardingEntries_validLines_parsedCorrectly() {
        // Gemini returns pipe-delimited lines: type|amount|currency|note
        // Empty currency field falls back to the user's default currency
        String geminiOutput = "income|3000|USD|Salary\nexpense|800|EUR|Rent\nsavings|500||Emergency fund";

        List<OnboardingEntryRequest> entries = miraService.parseOnboardingEntries(geminiOutput, "USD");

        assertThat(entries).hasSize(3);
        assertThat(entries.get(0).entryType()).isEqualTo("income");
        assertThat(entries.get(0).amount()).isEqualByComparingTo("3000");
        assertThat(entries.get(1).currency()).isEqualTo("EUR");
        assertThat(entries.get(2).currency()).isEqualTo("USD"); // defaults to user currency
        assertThat(entries.get(2).note()).isEqualTo("Emergency fund");
    }

    @Test
    void parseOnboardingEntries_invalidType_skipped() {
        // Only income/expense/savings are valid — unknown types must be silently dropped
        String geminiOutput = "transfer|100|USD|Bad\nincome|500|USD|Good";

        List<OnboardingEntryRequest> entries = miraService.parseOnboardingEntries(geminiOutput, "USD");

        assertThat(entries).hasSize(1);
        assertThat(entries.get(0).entryType()).isEqualTo("income");
    }

    @Test
    void parseOnboardingEntries_negativeAmount_skipped() {
        // Negative amounts are invalid per the DB constraint (amount > 0)
        String geminiOutput = "expense|-100|USD|Bad\nexpense|200|USD|Good";

        List<OnboardingEntryRequest> entries = miraService.parseOnboardingEntries(geminiOutput, "USD");

        assertThat(entries).hasSize(1);
        assertThat(entries.get(0).amount()).isEqualByComparingTo("200");
    }

    @Test
    void parseOnboardingEntries_emptyResponse_returnsEmpty() {
        // Null/empty Gemini response must not throw — return empty list instead
        assertThat(miraService.parseOnboardingEntries("", "USD")).isEmpty();
        assertThat(miraService.parseOnboardingEntries(null, "USD")).isEmpty();
    }

    // ── 29.5 Projection intent ────────────────────────────────────────────────

    @Test
    void isProjectionIntent_detectsPlanToSpend() {
        // "plan to spend" phrasing signals the user wants to set a budget projection
        assertThat(miraService.isProjectionIntent("I plan to spend $500 on groceries")).isTrue();
    }

    @Test
    void isProjectionIntent_detectsBudgetFor() {
        assertThat(miraService.isProjectionIntent("Set my budget for rent to $1200")).isTrue();
    }

    @Test
    void isProjectionIntent_detectsPlanToSave() {
        assertThat(miraService.isProjectionIntent("I plan to save $300 this month")).isTrue();
    }

    @Test
    void isProjectionIntent_returnsFalse_forRegularQuery() {
        // Regular queries and null input must not be misclassified as projection intents
        assertThat(miraService.isProjectionIntent("How much did I spend last week?")).isFalse();
        assertThat(miraService.isProjectionIntent(null)).isFalse();
    }

    @Test
    void parseProjectionItems_validLines_parsedCorrectly() {
        // Same pipe-delimited format as onboarding entries; empty currency defaults to user's
        String geminiOutput = "expense|500|USD|groceries\nincome|3000|EUR|salary\nsavings|200||emergency";

        List<MiraService.ProjectionIntentItem> items = miraService.parseProjectionItems(geminiOutput, "USD");

        assertThat(items).hasSize(3);
        assertThat(items.get(0).entryType()).isEqualTo("expense");
        assertThat(items.get(0).amount()).isEqualByComparingTo("500");
        assertThat(items.get(1).currency()).isEqualTo("EUR");
        assertThat(items.get(2).currency()).isEqualTo("USD"); // defaults to user currency
        assertThat(items.get(2).note()).isEqualTo("emergency");
    }

    @Test
    void parseProjectionItems_invalidType_skipped() {
        String geminiOutput = "transfer|100|USD|bad\nexpense|400|USD|good";

        List<MiraService.ProjectionIntentItem> items = miraService.parseProjectionItems(geminiOutput, "USD");

        assertThat(items).hasSize(1);
        assertThat(items.get(0).entryType()).isEqualTo("expense");
    }

    @Test
    void parseProjectionItems_nonPositiveAmount_skipped() {
        // Zero and negative projected amounts are invalid — CategoryProjection requires amount > 0
        String geminiOutput = "expense|0|USD|zero\nexpense|-50|USD|negative\nexpense|300|USD|valid";

        List<MiraService.ProjectionIntentItem> items = miraService.parseProjectionItems(geminiOutput, "USD");

        assertThat(items).hasSize(1);
        assertThat(items.get(0).amount()).isEqualByComparingTo("300");
    }

    @Test
    void parseProjectionItems_emptyResponse_returnsEmpty() {
        assertThat(miraService.parseProjectionItems("", "USD")).isEmpty();
        assertThat(miraService.parseProjectionItems(null, "USD")).isEmpty();
    }
}
