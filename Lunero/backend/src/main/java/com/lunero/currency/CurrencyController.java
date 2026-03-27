package com.lunero.currency;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/currencies")
@RequiredArgsConstructor
public class CurrencyController {

    private final CurrencyService currencyService;

    @GetMapping
    public ResponseEntity<CurrencyResponse> getCurrencies() {
        CurrencyService.RatesSnapshot snapshot = currencyService.getRates();
        CurrencyResponse response = new CurrencyResponse(
                CurrencyService.SUPPORTED_CURRENCIES,
                snapshot.rates(),
                snapshot.updatedAt(),
                snapshot.stale()
        );
        return ResponseEntity.ok(response);
    }
}
