import { QueryClient } from '@tanstack/react-query';
import type { ApiError } from '@lunero/api-client';

// Retry only on network errors (status 0) or 5xx — not on 4xx client errors
function shouldRetry(failureCount: number, error: unknown): boolean {
  const apiError = error as ApiError;
  if (apiError?.status && apiError.status >= 400 && apiError.status < 500) {
    return false;
  }
  return failureCount < 2;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,       // 30s — data stays fresh before background refetch
      gcTime: 5 * 60_000,      // 5min — keep unused data in cache
      retry: shouldRetry,
      refetchOnWindowFocus: true,
    },
    mutations: {
      retry: false,
    },
  },
});
