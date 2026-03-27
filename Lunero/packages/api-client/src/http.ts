import axios, { AxiosError, AxiosInstance } from 'axios';

// Token provider — injected at app startup (e.g. from Clerk's getToken)
let tokenProvider: (() => Promise<string | null>) | null = null;

export function setTokenProvider(fn: () => Promise<string | null>): void {
  tokenProvider = fn;
}

export function createApiClient(baseURL: string): AxiosInstance {
  const client = axios.create({
    baseURL,
    headers: { 'Content-Type': 'application/json' },
  });

  // Request interceptor — inject Clerk JWT
  client.interceptors.request.use(async (config) => {
    if (tokenProvider) {
      const token = await tokenProvider();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  });

  // Response interceptor — normalize errors
  client.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
      const status = error.response?.status;
      const data = error.response?.data as Record<string, unknown> | undefined;

      const apiError: ApiError = {
        status: status ?? 0,
        title: (data?.title as string) ?? error.message,
        detail: (data?.detail as string) ?? undefined,
        raw: error,
      };

      return Promise.reject(apiError);
    }
  );

  return client;
}

export interface ApiError {
  status: number;
  title: string;
  detail?: string;
  raw: AxiosError;
}

// Default singleton — base URL resolved from env at runtime
const BASE_URL =
  typeof process !== 'undefined'
    ? (process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8080')
    : 'http://localhost:8080';

export const apiClient = createApiClient(BASE_URL);
