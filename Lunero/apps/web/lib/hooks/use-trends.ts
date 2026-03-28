import { useQuery } from '@tanstack/react-query';
import { trendApi, type TrendQueryParams } from '@lunero/api-client';

export const trendKeys = {
  all: ['trends'] as const,
  byParams: (params: TrendQueryParams) => [...trendKeys.all, params] as const,
};

export function useTrends(params: TrendQueryParams) {
  return useQuery({
    queryKey: trendKeys.byParams(params),
    queryFn: () => trendApi.getTrends(params),
  });
}
