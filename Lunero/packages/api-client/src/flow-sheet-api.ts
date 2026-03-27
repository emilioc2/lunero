import type { FlowSheet } from '@lunero/core';
import { apiClient } from './http';

export interface CreateFlowSheetDto {
  periodType: 'weekly' | 'monthly' | 'custom';
  startDate: string;
  endDate: string;
}

export interface UpdateFlowSheetDto {
  startDate?: string;
  endDate?: string;
}

export const flowSheetApi = {
  getActive(): Promise<FlowSheet> {
    return apiClient.get<FlowSheet>('/api/v1/flowsheets/active').then((r) => r.data);
  },

  getAll(): Promise<FlowSheet[]> {
    return apiClient.get<FlowSheet[]>('/api/v1/flowsheets').then((r) => r.data);
  },

  getById(id: string): Promise<FlowSheet> {
    return apiClient.get<FlowSheet>(`/api/v1/flowsheets/${id}`).then((r) => r.data);
  },

  create(data: CreateFlowSheetDto): Promise<FlowSheet> {
    return apiClient.post<FlowSheet>('/api/v1/flowsheets', data).then((r) => r.data);
  },

  update(id: string, data: UpdateFlowSheetDto): Promise<FlowSheet> {
    return apiClient.patch<FlowSheet>(`/api/v1/flowsheets/${id}`, data).then((r) => r.data);
  },

  unlock(id: string): Promise<FlowSheet> {
    return apiClient.post<FlowSheet>(`/api/v1/flowsheets/${id}/unlock`).then((r) => r.data);
  },
};
