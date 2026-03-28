import type { CategoryProjection, ProjectionSummary } from '@lunero/core';
import { apiClient } from './http';

export interface UpsertProjectionDto {
  projectedAmount: number;
  currency: string;
}

export const projectionApi = {
  getProjections(flowSheetId: string): Promise<CategoryProjection[]> {
    return apiClient
      .get<CategoryProjection[]>(`/api/v1/flowsheets/${flowSheetId}/projections`)
      .then((r) => r.data);
  },

  getProjectionSummary(flowSheetId: string): Promise<ProjectionSummary> {
    return apiClient
      .get<ProjectionSummary>(`/api/v1/flowsheets/${flowSheetId}/projections/summary`)
      .then((r) => r.data);
  },

  upsertProjection(
    flowSheetId: string,
    categoryId: string,
    data: UpsertProjectionDto,
  ): Promise<CategoryProjection> {
    return apiClient
      .put<CategoryProjection>(
        `/api/v1/flowsheets/${flowSheetId}/projections/${categoryId}`,
        data,
      )
      .then((r) => r.data);
  },

  deleteProjection(flowSheetId: string, categoryId: string): Promise<void> {
    return apiClient
      .delete(`/api/v1/flowsheets/${flowSheetId}/projections/${categoryId}`)
      .then(() => undefined);
  },
};
