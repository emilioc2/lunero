import { apiClient } from './http';

export interface CurrencyRatesResponse {
  currencies: string[];
  rates: Record<string, number>;
  updatedAt: string;
  ratesStale: boolean;
}

export const currencyApi = {
  getRates(): Promise<CurrencyRatesResponse> {
    return apiClient.get<CurrencyRatesResponse>('/api/v1/currencies').then((r) => r.data);
  },
};
