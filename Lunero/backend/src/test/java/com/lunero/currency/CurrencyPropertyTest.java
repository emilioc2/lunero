package com.lunero.currency;

import com.lunero.common.audit.AuditLogService;
import com.lunero.entry.CreateEntryRequest;
import com.lunero.entry.EntryEntity;
import com.lunero.entry.EntryRepository;
import com.lunero.entry.EntryResponse;
import com.lunero.entry.EntryService;
import com.lunero.flowsheet.FlowSheetEntity;
import com.lunero.flowsheet.FlowSheetRepository;
import com.lunero.flowsheet.FlowSheetService;
import com.lunero.recurring.RecurringEntryRepository;
import com.lunero.user.UserEntity;
import com.lunero.user.UserRepository;
import net.jqwik.api.*;
import net.jqwik.api.constraints.Positive;
import org.assertj.core.data.Offset;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * Property-based tests for the Currency domain.
 *
 * Property 6: Default Currency Pre-Population
 *   When an entry is created with the same currency as the user's defaultCurrency,
 *   no conversion is applied (convertedAmount is null, conversionRate is null).
 *
 * Property 7: Server-Side Currency Conversion Round-Trip
 *   For any entry whose currency differs from the user's defaultCurrency,
 *   convertedAmount == amount × conversionRate (within floating-point tolerance).
 */
class CurrencyPropertyTest {

    private static final String[] CURRENCIES = {
            "USD", "EUR", "GBP", "JPY", "CAD", "AUD", "CHF", "CNY"
    };

    // ── Property 6: Default Currency Pre-Population ───────────────────────────

    /**
     * // Feature: lunero-budgeting-app, Property 6: Default Currency Pre-Population
     *
     * For any new entry created with the same currency as the user's defaultCurrency,
     * no conversion is applied: convertedAmount and conversionRate must both be null.
     *
     * Validates: Requirements 10.1
     */
    @Property(tries = 300)
    void property6_noConversionWhenCurrencyMatchesDefault(
            @ForAll("anyCurrency") String currency,
            @ForAll @Positive int rawAmount) {

        BigDecimal amount = BigDecimal.valueOf(rawAmount);
        // defaultCurrency == entryCurrency → no conversion
        Fixture fixture = buildFixture(currency, currency, buildRates());

        CreateEntryRequest req = new CreateEntryRequest(
                fixture.sheetId(), "income", "TestCategory",
                amount, currency, LocalDate.now(), null, null);

        stubCreate(fixture, amount, currency);

        EntryResponse response = fixture.entryService().createEntry(fixture.userId(), req);

        assertThat(response.convertedAmount()).isNull();
        assertThat(response.conversionRate()).isNull();
    }

    // ── Property 7: Conversion Round-Trip ────────────────────────────────────

    /**
     * // Feature: lunero-budgeting-app, Property 7: Server-Side Currency Conversion Round-Trip
     *
     * For any entry whose currency differs from the user's defaultCurrency,
     * the stored convertedAmount must equal amount × conversionRate (within 4 decimal places).
     * Both the original amount/currency and the converted amount must be present in the response.
     *
     * Validates: Requirements 10.2, 10.3
     */
    @Property(tries = 300)
    void property7_convertedAmountEqualsAmountTimesRate(
            @ForAll("differentCurrencyPairs") String[] pair,
            @ForAll @Positive int rawAmount) {

        String entryCurrency   = pair[0];
        String defaultCurrency = pair[1];
        BigDecimal amount = BigDecimal.valueOf(rawAmount);

        Fixture fixture = buildFixture(defaultCurrency, entryCurrency, buildRates());

        CreateEntryRequest req = new CreateEntryRequest(
                fixture.sheetId(), "income", "TestCategory",
                amount, entryCurrency, LocalDate.now(), null, null);

        stubCreate(fixture, amount, entryCurrency);

        EntryResponse response = fixture.entryService().createEntry(fixture.userId(), req);

        // Original amount and currency must be preserved
        assertThat(response.amount()).isEqualByComparingTo(amount);
        assertThat(response.currency()).isEqualTo(entryCurrency);

        // convertedAmount and conversionRate must both be present
        assertThat(response.convertedAmount()).isNotNull();
        assertThat(response.conversionRate()).isNotNull();

        // convertedAmount == amount * conversionRate (within 4dp tolerance)
        BigDecimal expected = amount.multiply(response.conversionRate())
                .setScale(4, RoundingMode.HALF_UP);
        assertThat(response.convertedAmount())
                .isCloseTo(expected, Offset.offset(new BigDecimal("0.0001")));
    }

    /**
     * // Feature: lunero-budgeting-app, Property 7: Server-Side Currency Conversion Round-Trip
     *
     * When FX rates are unavailable (empty), convertedAmount must be null
     * so the entry is excluded from balance calculations until rates are restored.
     *
     * Validates: Requirements 10.4
     */
    @Property(tries = 100)
    void property7_convertedAmountIsNullWhenRatesUnavailable(
            @ForAll("differentCurrencyPairs") String[] pair,
            @ForAll @Positive int rawAmount) {

        String entryCurrency   = pair[0];
        String defaultCurrency = pair[1];
        BigDecimal amount = BigDecimal.valueOf(rawAmount);

        // No rates loaded
        Fixture fixture = buildFixture(defaultCurrency, entryCurrency, Map.of());

        CreateEntryRequest req = new CreateEntryRequest(
                fixture.sheetId(), "income", "TestCategory",
                amount, entryCurrency, LocalDate.now(), null, null);

        stubCreate(fixture, amount, entryCurrency);

        EntryResponse response = fixture.entryService().createEntry(fixture.userId(), req);

        assertThat(response.convertedAmount()).isNull();
        assertThat(response.conversionRate()).isNull();
    }

    // ── Arbitraries ───────────────────────────────────────────────────────────

    @Provide
    Arbitrary<String> anyCurrency() {
        return Arbitraries.of(CURRENCIES);
    }

    @Provide
    Arbitrary<String[]> differentCurrencyPairs() {
        return Arbitraries.of(CURRENCIES).flatMap(from ->
                Arbitraries.of(CURRENCIES)
                        .filter(to -> !to.equals(from))
                        .map(to -> new String[]{from, to})
        );
    }

    // ── Fixture / helpers ─────────────────────────────────────────────────────

    private record Fixture(
            EntryService entryService,
            EntryRepository entryRepo,
            FlowSheetRepository flowSheetRepo,
            UserRepository userRepo,
            UUID userId,
            UUID sheetId,
            String defaultCurrency) {}

    private Fixture buildFixture(String defaultCurrency, String entryCurrency,
                                  Map<String, Double> rates) {
        FlowSheetRepository flowSheetRepo = mock(FlowSheetRepository.class);
        EntryRepository entryRepo         = mock(EntryRepository.class);
        AuditLogService auditLog          = mock(AuditLogService.class);
        UserRepository userRepo           = mock(UserRepository.class);

        RestTemplate restTemplate = mock(RestTemplate.class);
        CurrencyService currencyService = new CurrencyService(restTemplate);

        if (!rates.isEmpty()) {
            FrankfurterResponse fxResponse = new FrankfurterResponse("EUR", "2024-01-15", rates);
            when(restTemplate.getForObject(any(String.class), eq(FrankfurterResponse.class)))
                    .thenReturn(fxResponse);
            currencyService.refreshRates();
        }

        FlowSheetService flowSheetService = new FlowSheetService(
                flowSheetRepo, entryRepo, mock(RecurringEntryRepository.class),
                mock(com.lunero.recurring.RecurringEntryService.class), auditLog,
                mock(com.lunero.projection.ProjectionService.class));
        EntryService entryService = new EntryService(
                entryRepo, flowSheetRepo, flowSheetService, auditLog, currencyService, userRepo,
                mock(com.lunero.notification.NotificationService.class));

        UUID userId  = UUID.randomUUID();
        UUID sheetId = UUID.randomUUID();

        // Stub user with the given defaultCurrency
        UserEntity user = UserEntity.builder()
                .id(userId).clerkUserId("clerk_test").displayName("Test")
                .defaultCurrency(defaultCurrency)
                .build();
        when(userRepo.findById(userId)).thenReturn(Optional.of(user));

        // Stub sheet
        FlowSheetEntity sheet = FlowSheetEntity.builder()
                .id(sheetId).userId(userId).periodType("monthly")
                .startDate(LocalDate.now().minusMonths(1))
                .endDate(LocalDate.now().plusDays(10))
                .status("active").editLocked(false)
                .build();
        when(flowSheetRepo.findByIdAndUserId(sheetId, userId)).thenReturn(Optional.of(sheet));

        return new Fixture(entryService, entryRepo, flowSheetRepo, userRepo,
                userId, sheetId, defaultCurrency);
    }

    /**
     * Stubs entryRepo.save() to echo back the entity built by EntryService
     * (preserving convertedAmount and conversionRate set during conversion).
     */
    private void stubCreate(Fixture f, BigDecimal amount, String currency) {
        when(f.entryRepo().save(any())).thenAnswer(inv -> {
            EntryEntity e = inv.getArgument(0);
            return EntryEntity.builder()
                    .id(UUID.randomUUID())
                    .flowSheetId(e.getFlowSheetId())
                    .userId(e.getUserId())
                    .entryType(e.getEntryType())
                    .category(e.getCategory())
                    .amount(e.getAmount())
                    .currency(e.getCurrency())
                    .convertedAmount(e.getConvertedAmount())
                    .conversionRate(e.getConversionRate())
                    .entryDate(e.getEntryDate())
                    .note(e.getNote())
                    .isDeleted(false)
                    .build();
        });
        when(f.entryRepo().findByFlowSheetIdAndIsDeletedFalse(f.sheetId())).thenReturn(List.of());
    }

    /**
     * EUR-based rates covering all currencies in CURRENCIES array.
     * EUR itself is the base (implicit 1.0).
     */
    private Map<String, Double> buildRates() {
        Map<String, Double> rates = new HashMap<>();
        rates.put("USD", 1.08);
        rates.put("GBP", 0.86);
        rates.put("JPY", 160.5);
        rates.put("CAD", 1.47);
        rates.put("AUD", 1.65);
        rates.put("CHF", 0.94);
        rates.put("CNY", 7.82);
        return rates;
    }
}
