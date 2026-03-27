package com.lunero.currency;

import com.lunero.common.config.CacheConfig;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CachePut;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.math.MathContext;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
public class CurrencyService {

    static final List<String> SUPPORTED_CURRENCIES = List.of(
            "USD", "EUR", "GBP", "JPY", "CAD", "AUD", "CHF", "CNY", "HKD", "NZD",
            "SEK", "NOK", "DKK", "SGD", "MXN", "BRL", "INR", "KRW", "ZAR", "AED",
            "SAR", "THB", "MYR", "IDR", "PHP", "PLN", "CZK", "HUF", "RON", "TRY"
    );

    private static final String FRANKFURTER_URL = "https://api.frankfurter.app/latest";

    private final RestTemplate restTemplate;

    // In-memory fallback — holds last known rates even when cache is cold
    private volatile Map<String, Double> lastKnownRates = new HashMap<>();
    private volatile Instant lastUpdatedAt = null;
    private volatile boolean ratesStale = false;

    public CurrencyService(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    /**
     * Returns the current cached rates snapshot.
     * Falls back to last known rates if cache is empty.
     */
    public RatesSnapshot getRates() {
        return new RatesSnapshot(lastKnownRates, lastUpdatedAt, ratesStale);
    }

    /**
     * Converts {@code amount} from {@code fromCurrency} to {@code toCurrency}
     * using cached EUR-based rates (cross-multiply through EUR).
     *
     * @return ConversionResult with convertedAmount and conversionRate, or null if rates unavailable
     */
    public ConversionResult convert(BigDecimal amount, String fromCurrency, String toCurrency) {
        if (fromCurrency.equalsIgnoreCase(toCurrency)) {
            return new ConversionResult(amount, BigDecimal.ONE);
        }

        Map<String, Double> rates = lastKnownRates;
        if (rates.isEmpty()) {
            log.warn("No FX rates available for conversion {} -> {}", fromCurrency, toCurrency);
            return null;
        }

        // Rates are relative to EUR. EUR itself has an implicit rate of 1.0.
        double fromRate = "EUR".equalsIgnoreCase(fromCurrency) ? 1.0 : rates.getOrDefault(fromCurrency.toUpperCase(), 0.0);
        double toRate   = "EUR".equalsIgnoreCase(toCurrency)   ? 1.0 : rates.getOrDefault(toCurrency.toUpperCase(), 0.0);

        if (fromRate == 0.0 || toRate == 0.0) {
            log.warn("Missing FX rate for {} or {}", fromCurrency, toCurrency);
            return null;
        }

        // conversionRate = toRate / fromRate  (both relative to EUR)
        BigDecimal conversionRate = BigDecimal.valueOf(toRate)
                .divide(BigDecimal.valueOf(fromRate), 8, RoundingMode.HALF_UP);
        BigDecimal converted = amount.multiply(conversionRate, new MathContext(18, RoundingMode.HALF_UP))
                .setScale(4, RoundingMode.HALF_UP);

        return new ConversionResult(converted, conversionRate);
    }

    /**
     * Scheduled every 24h. Fetches latest rates from Frankfurter and updates the in-memory cache.
     * On failure, retains last known rates and sets {@code ratesStale = true}.
     */
    @Scheduled(fixedRateString = "PT24H", initialDelayString = "PT0S")
    public void refreshRates() {
        try {
            FrankfurterResponse response = restTemplate.getForObject(FRANKFURTER_URL, FrankfurterResponse.class);
            if (response == null || response.rates() == null || response.rates().isEmpty()) {
                markStale("Frankfurter returned empty response");
                return;
            }
            lastKnownRates = new HashMap<>(response.rates());
            lastUpdatedAt  = Instant.now();
            ratesStale     = false;
            log.info("FX rates refreshed successfully at {}, {} currencies loaded", lastUpdatedAt, lastKnownRates.size());
        } catch (Exception ex) {
            markStale("Failed to refresh FX rates: " + ex.getMessage());
        }
    }

    private void markStale(String reason) {
        ratesStale = true;
        log.error("FX rate refresh failed — retaining last known rates. Reason: {}", reason);
    }

    public record RatesSnapshot(Map<String, Double> rates, Instant updatedAt, boolean stale) {}
    public record ConversionResult(BigDecimal convertedAmount, BigDecimal conversionRate) {}
}
