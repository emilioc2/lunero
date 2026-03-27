import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { profileApi, currencyApi, type UpdateProfileDto } from '@lunero/api-client';

export const profileKeys = {
  profile: ['profile'] as const,
  currencies: ['currencies'] as const,
};

export function useProfile() {
  return useQuery({
    queryKey: profileKeys.profile,
    queryFn: profileApi.get,
    staleTime: 5 * 60_000,
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateProfileDto) => profileApi.update(data),
    onSuccess: (updated) => {
      qc.setQueryData(profileKeys.profile, updated);
    },
  });
}

export function useDeleteAccount() {
  return useMutation({
    mutationFn: profileApi.delete,
  });
}

export function useCurrencyRates() {
  return useQuery({
    queryKey: profileKeys.currencies,
    queryFn: currencyApi.getRates,
    staleTime: 24 * 60 * 60_000, // rates are refreshed every 24h server-side
  });
}
