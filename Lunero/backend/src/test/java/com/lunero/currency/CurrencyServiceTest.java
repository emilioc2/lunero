package com.lunero.currency;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.util.Map;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CurrencyServiceTest {

    @Mock private RestTemplate restTemplate;

    private CurrencyService currencyService;

    @BeforeEach
    void setUp() {
        currencyService = new CurrencyService(restTemplate);
    }

    // ── refreshRates ─────────────────────────────────────────────────────────

    @Test
    void refreshRates_loadsRatesAndClearsStaleFlag() {
        FrankfurterResponse response = new FrankfurterResponse(
                "EUR", "2024-01-15",
                Map.of("USD", 1.08, "GBP", 0.86, "JPY", 160.5));
        when(restTemplate.getForObject(any(String.class), eq(FrankfurterResponse.class)))
                .thenReturn(response);

        currencyService.refreshRates();

        CurrencyService.RatesSnapshot snapshot = currencyService.getRates();
        assertThat(snapshot.stale()).isFalse();
        assertThat(snapshot.rates()).containsEntry("USD", 1.08);
        assertThat(snapshot.rates()).containsEntry("GBP", 0.86);
        assertThat(snapshot.updatedAt()).isNotNull();
    }

    @Test
    void refreshRates_setsStaleOnNetworkFailure() {
        when(restTemplate.getForObject(any(String.class), eq(FrankfurterResponse.class)))
                .thenThrow(new RuntimeException("Connection refused"));

        currencyService.refreshRates();

        assertThat(currencyService.getRates().stale()).isTrue();
    }

    @Test
    void refreshRates_setsStaleOnNullResponse() {
        when(restTemplate.getForObject(any(String.class), eq(FrankfurterResponse.class)))
                .thenReturn(null);

        currencyService.refreshRates();

        assertThat(currencyService.getRates().stale()).isTrue();
    }

    @Test
    void refreshRates_setsStaleOnEmptyRates() {
        FrankfurterResponse empty = new FrankfurterResponse("EUR", "2024-01-15", Map.of());
        when(restTemplate.getForObject(any(String.class), eq(FrankfurterResponse.class)))
                .thenReturn(empty);

        currencyService.refreshRates();

        assertThat(currencyService.getRates().stale()).isTrue();
    }

    @Test
    void refreshRates_retainsLastKnownRatesOnFailure() {
        // First successful load
        FrankfurterResponse first = new FrankfurterResponse("EUR", "2024-01-14",
                Map.of("USD", 1.08, "GBP", 0.86));
        when(restTemplate.getForObject(any(String.class), eq(FrankfurterResponse.class)))
                .thenReturn(first)
                .thenThrow(new RuntimeException("timeout"));

        currencyService.refreshRates(); // success
        currencyService.refreshRates(); // failure

        CurrencyService.RatesSnapshot snapshot = currencyService.getRates();
        assertThat(snapshot.stale()).isTrue();
        // Last known rates are retained
        assertThat(snapshot.rates()).containsEntry("USD", 1.08);
    }

    // ── convert ──────────────────────────────────────────────────────────────

    @Test
    void convert_sameCurrency_returnsOriginalAmountWithRateOne() {
        loadRates(Map.of("USD", 1.08));

        CurrencyService.ConversionResult result = currencyService.convert(
                new BigDecimal("100"), "USD", "USD");

        assertThat(result).isNotNull();
        assertThat(result.convertedAmount()).isEqualByComparingTo("100");
        assertThat(result.conversionRate()).isEqualByComparingTo("1");
    }

    @Test
    void convert_usdToEur_crossMultipliesThroughEur() {
        // EUR base: USD=1.08 means 1 EUR = 1.08 USD
        // USD -> EUR: rate = 1.0 / 1.08
        loadRates(Map.of("USD", 1.08));

        CurrencyService.ConversionResult result = currencyService.convert(
                new BigDecimal("108"), "USD", "EUR");

        assertThat(result).isNotNull();
        // 108 USD * (1/1.08) ≈ 100 EUR
        assertThat(result.convertedAmount()).isCloseTo(new BigDecimal("100"), within("0.01"));
        assertThat(result.conversionRate()).isCloseTo(new BigDecimal("0.92592593"), within("0.00000001"));
    }

    @Test
    void convert_eurToUsd_usesDirectRate() {
        loadRates(Map.of("USD", 1.08));

        CurrencyService.ConversionResult result = currencyService.convert(
                new BigDecimal("100"), "EUR", "USD");

        assertThat(result).isNotNull();
        assertThat(result.convertedAmount()).isCloseTo(new BigDecimal("108"), within("0.01"));
        assertThat(result.conversionRate()).isCloseTo(new BigDecimal("1.08"), within("0.00000001"));
    }

    @Test
    void convert_gbpToUsd_crossMultipliesThroughEur() {
        // GBP=0.86, USD=1.08 (both relative to EUR)
        // GBP -> USD: rate = 1.08 / 0.86
        loadRates(Map.of("GBP", 0.86, "USD", 1.08));

        CurrencyService.ConversionResult result = currencyService.convert(
                new BigDecimal("86"), "GBP", "USD");

        assertThat(result).isNotNull();
        // 86 GBP * (1.08/0.86) ≈ 108 USD
        assertThat(result.convertedAmount()).isCloseTo(new BigDecimal("108"), within("0.01"));
    }

    @Test
    void convert_returnsNull_whenNoRatesLoaded() {
        // No refreshRates() called — rates are empty
        CurrencyService.ConversionResult result = currencyService.convert(
                new BigDecimal("100"), "USD", "EUR");

        assertThat(result).isNull();
    }

    @Test
    void convert_returnsNull_whenCurrencyNotInRates() {
        loadRates(Map.of("USD", 1.08));

        CurrencyService.ConversionResult result = currencyService.convert(
                new BigDecimal("100"), "XYZ", "USD");

        assertThat(result).isNull();
    }

    // ── getRates ─────────────────────────────────────────────────────────────

    @Test
    void getRates_returnsEmptyAndNullTimestamp_beforeFirstRefresh() {
        CurrencyService.RatesSnapshot snapshot = currencyService.getRates();

        assertThat(snapshot.rates()).isEmpty();
        assertThat(snapshot.updatedAt()).isNull();
        assertThat(snapshot.stale()).isFalse();
    }

    @Test
    void getRates_includesAllLoadedRates() {
        Map<String, Double> ratesMap = Map.of("USD", 1.08, "GBP", 0.86, "JPY", 160.5);
        loadRates(ratesMap);

        CurrencyService.RatesSnapshot snapshot = currencyService.getRates();

        assertThat(snapshot.rates()).containsAllEntriesOf(ratesMap);
        assertThat(snapshot.stale()).isFalse();
    }

    // ── supported currencies ─────────────────────────────────────────────────

    @Test
    void supportedCurrencies_containsAtLeast30() {
        assertThat(CurrencyService.SUPPORTED_CURRENCIES).hasSizeGreaterThanOrEqualTo(30);
    }

    @Test
    void supportedCurrencies_containsCommonCurrencies() {
        assertThat(CurrencyService.SUPPORTED_CURRENCIES)
                .contains("USD", "EUR", "GBP", "JPY", "CAD", "AUD", "CHF", "CNY");
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private void loadRates(Map<String, Double> rates) {
        FrankfurterResponse response = new FrankfurterResponse("EUR", "2024-01-15", rates);
        when(restTemplate.getForObject(any(String.class), eq(FrankfurterResponse.class)))
                .thenReturn(response);
        currencyService.refreshRates();
    }

    private static org.assertj.core.data.Offset<BigDecimal> within(String tolerance) {
        return org.assertj.core.data.Offset.offset(new BigDecimal(tolerance));
    }
}
