import { apiClient } from './http';

export interface CurrencyRatesResponse {
  baseCurrency: string;
  currencies: string[];
  rates: Record<string, number>;
  updatedAt: string;
}

export const currencyApi = {
  getRates(): Promise<CurrencyRatesResponse> {
    return apiClient.get<CurrencyRatesResponse>('/api/v1/currencies/rates').then((r) => r.data);
  },
};
