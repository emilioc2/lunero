import { useQuery } from '@tanstack/react-query';
import { trendApi, type TrendQueryParams } from '@lunero/api-client';

export const trendKeys = {
  all: ['trends'] as const,
  list: (params: TrendQueryParams) => [...trendKeys.all, params] as const,
  breakdown: (dataPointId: string) => [...trendKeys.all, 'breakdown', dataPointId] as const,
};

export function useTrends(params: TrendQueryParams) {
  return useQuery({
    queryKey: trendKeys.list(params),
    queryFn: () => trendApi.getTrends(params),
  });
}

export function useTrendBreakdown(dataPointId: string) {
  return useQuery({
    queryKey: trendKeys.breakdown(dataPointId),
    queryFn: () => trendApi.getBreakdown(dataPointId),
    enabled: !!dataPointId,
  });
}
