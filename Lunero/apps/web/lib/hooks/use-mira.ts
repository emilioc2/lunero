import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { aiCoachApi, type MiraQueryRequest } from '@lunero/api-client';

export const miraKeys = {
  alerts: ['mira', 'alerts'] as const,
};

export function useMiraAlerts() {
  return useQuery({
    queryKey: miraKeys.alerts,
    queryFn: aiCoachApi.getAlerts,
    staleTime: 60_000, // alerts refresh every minute
  });
}

export function useMiraQuery() {
  return useMutation({
    mutationFn: (data: MiraQueryRequest) => aiCoachApi.query(data),
  });
}

export function useDismissAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => aiCoachApi.dismissAlert(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: miraKeys.alerts }),
  });
}
