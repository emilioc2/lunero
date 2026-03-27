import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectionApi, type UpsertProjectionDto } from '@lunero/api-client';

export const projectionKeys = {
  bySheet: (flowSheetId: string) => ['projections', flowSheetId] as const,
  summary: (flowSheetId: string) => ['projections', flowSheetId, 'summary'] as const,
};

export function useProjections(flowSheetId: string) {
  return useQuery({
    queryKey: projectionKeys.bySheet(flowSheetId),
    queryFn: () => projectionApi.getProjections(flowSheetId),
    enabled: !!flowSheetId,
  });
}

export function useProjectionSummary(flowSheetId: string) {
  return useQuery({
    queryKey: projectionKeys.summary(flowSheetId),
    queryFn: () => projectionApi.getProjectionSummary(flowSheetId),
    enabled: !!flowSheetId,
  });
}

export function useUpsertProjection(flowSheetId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ categoryId, data }: { categoryId: string; data: UpsertProjectionDto }) =>
      projectionApi.upsertProjection(flowSheetId, categoryId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: projectionKeys.bySheet(flowSheetId) });
      qc.invalidateQueries({ queryKey: projectionKeys.summary(flowSheetId) });
    },
  });
}

export function useDeleteProjection(flowSheetId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (categoryId: string) =>
      projectionApi.deleteProjection(flowSheetId, categoryId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: projectionKeys.bySheet(flowSheetId) });
      qc.invalidateQueries({ queryKey: projectionKeys.summary(flowSheetId) });
    },
  });
}
