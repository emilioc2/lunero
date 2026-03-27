import type { Entry } from '@lunero/core';
import { apiClient } from './http';

export type TrendView = 'weekly' | 'monthly' | 'yearly';

export interface TrendPeriod {
  id: string;
  label: string;
  startDate: string;
  endDate: string;
  totalIncome: number;
  totalExpenses: number;
  totalSavings: number;
  availableBalance: number;
}

export interface TrendData {
  view: TrendView;
  periods: TrendPeriod[];
}

export interface TrendQueryParams {
  view: TrendView;
  from?: string;
  to?: string;
  categoryId?: string;
}

export const trendApi = {
  getTrends(params: TrendQueryParams): Promise<TrendData> {
    return apiClient
      .get<TrendData>('/api/v1/trends', { params })
      .then((r) => r.data);
  },

  getBreakdown(dataPointId: string): Promise<Entry[]> {
    return apiClient
      .get<Entry[]>(`/api/v1/trends/${dataPointId}/breakdown`)
      .then((r) => r.data);
  },
};
