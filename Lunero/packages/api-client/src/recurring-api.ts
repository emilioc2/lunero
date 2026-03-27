import type { RecurringEntry } from '@lunero/core';
import { apiClient } from './http';

export interface CreateRecurringEntryDto {
  entryType: 'income' | 'expense' | 'savings';
  categoryId: string;
  amount: number;
  currency: string;
  cadence: 'daily' | 'weekly' | 'bi-weekly' | 'monthly';
  note?: string;
}

export interface UpdateRecurringEntryDto {
  categoryId?: string;
  amount?: number;
  currency?: string;
  cadence?: 'daily' | 'weekly' | 'bi-weekly' | 'monthly';
  note?: string;
}

export const recurringApi = {
  list(): Promise<RecurringEntry[]> {
    return apiClient.get<RecurringEntry[]>('/api/v1/recurring').then((r) => r.data);
  },

  create(data: CreateRecurringEntryDto): Promise<RecurringEntry> {
    return apiClient.post<RecurringEntry>('/api/v1/recurring', data).then((r) => r.data);
  },

  update(id: string, data: UpdateRecurringEntryDto): Promise<RecurringEntry> {
    return apiClient
      .patch<RecurringEntry>(`/api/v1/recurring/${id}`, data)
      .then((r) => r.data);
  },

  delete(id: string): Promise<void> {
    return apiClient.delete(`/api/v1/recurring/${id}`).then(() => undefined);
  },

  pause(id: string): Promise<RecurringEntry> {
    return apiClient
      .post<RecurringEntry>(`/api/v1/recurring/${id}/pause`)
      .then((r) => r.data);
  },

  resume(id: string): Promise<RecurringEntry> {
    return apiClient
      .post<RecurringEntry>(`/api/v1/recurring/${id}/resume`)
      .then((r) => r.data);
  },
};
