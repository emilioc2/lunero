import { apiClient } from './http';

export interface MiraQueryRequest {
  message: string;
}

export interface MiraQueryResponse {
  response: string;
}

export interface MiraAlert {
  id: string;
  type: string;
  message: string;
  flowSheetId?: string;
  createdAt: string;
}

export const aiCoachApi = {
  query(data: MiraQueryRequest): Promise<MiraQueryResponse> {
    return apiClient
      .post<MiraQueryResponse>('/api/v1/ai/query', data)
      .then((r) => r.data);
  },

  getAlerts(): Promise<MiraAlert[]> {
    return apiClient.get<MiraAlert[]>('/api/v1/ai/alerts').then((r) => r.data);
  },

  dismissAlert(id: string): Promise<void> {
    return apiClient.post(`/api/v1/ai/alerts/${id}/dismiss`).then(() => undefined);
  },
};
