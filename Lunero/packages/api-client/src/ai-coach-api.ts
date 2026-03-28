import { apiClient } from './http';

export interface MiraAlert {
  id: string;
  type: string;
  message: string;
  severity: 'info' | 'warning' | 'critical';
  createdAt: string;
  dismissed: boolean;
}

export interface MiraQueryRequest {
  message: string;
}

export interface MiraQueryResponse {
  response: string;
}

export const aiCoachApi = {
  getAlerts(): Promise<MiraAlert[]> {
    return apiClient.get<MiraAlert[]>('/api/v1/mira/alerts').then((r) => r.data);
  },

  query(data: MiraQueryRequest): Promise<MiraQueryResponse> {
    return apiClient.post<MiraQueryResponse>('/api/v1/mira/query', data).then((r) => r.data);
  },

  dismissAlert(id: string): Promise<void> {
    return apiClient.post(`/api/v1/mira/alerts/${id}/dismiss`).then(() => undefined);
  },
};
