import type { Entry } from '@lunero/core';
import { apiClient } from './http';

export interface CreateEntryDto {
  flowSheetId: string;
  entryType: 'income' | 'expense' | 'savings';
  categoryId: string;
  amount: number;
  currency: string;
  entryDate: string; // DD/MM/YYYY
  note?: string;
  clientUpdatedAt: string;
}

export interface UpdateEntryDto {
  categoryId?: string;
  amount?: number;
  currency?: string;
  entryDate?: string;
  note?: string;
  clientUpdatedAt: string;
}

export const entryApi = {
  list(flowSheetId: string): Promise<Entry[]> {
    return apiClient
      .get<Entry[]>(`/api/v1/flowsheets/${flowSheetId}/entries`)
      .then((r) => r.data);
  },

  create(data: CreateEntryDto): Promise<Entry> {
    return apiClient.post<Entry>('/api/v1/entries', data).then((r) => r.data);
  },

  update(id: string, data: UpdateEntryDto): Promise<Entry> {
    return apiClient.patch<Entry>(`/api/v1/entries/${id}`, data).then((r) => r.data);
  },

  delete(id: string): Promise<void> {
    return apiClient.delete(`/api/v1/entries/${id}`).then(() => undefined);
  },
};
