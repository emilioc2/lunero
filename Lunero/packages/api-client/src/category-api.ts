import type { Category } from '@lunero/core';
import { apiClient } from './http';

export interface CreateCategoryDto {
  name: string;
  entryType: 'income' | 'expense' | 'savings';
}

export interface UpdateCategoryDto {
  name?: string;
  sortOrder?: number;
}

export interface ReassignCategoryDto {
  targetCategoryId: string;
}

export const categoryApi = {
  list(): Promise<Category[]> {
    return apiClient.get<Category[]>('/api/v1/categories').then((r) => r.data);
  },

  create(data: CreateCategoryDto): Promise<Category> {
    return apiClient.post<Category>('/api/v1/categories', data).then((r) => r.data);
  },

  update(id: string, data: UpdateCategoryDto): Promise<Category> {
    return apiClient.patch<Category>(`/api/v1/categories/${id}`, data).then((r) => r.data);
  },

  delete(id: string): Promise<void> {
    return apiClient.delete(`/api/v1/categories/${id}`).then(() => undefined);
  },

  reassign(id: string, data: ReassignCategoryDto): Promise<void> {
    return apiClient
      .patch(`/api/v1/categories/${id}/reassign`, data)
      .then(() => undefined);
  },
};
