import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  recurringApi,
  type CreateRecurringEntryDto,
  type UpdateRecurringEntryDto,
} from '@lunero/api-client';

export const recurringKeys = {
  all: ['recurring'] as const,
};

export function useRecurringEntries() {
  return useQuery({
    queryKey: recurringKeys.all,
    queryFn: recurringApi.list,
  });
}

export function useCreateRecurringEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateRecurringEntryDto) => recurringApi.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: recurringKeys.all }),
  });
}

export function useUpdateRecurringEntry(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateRecurringEntryDto) => recurringApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: recurringKeys.all }),
  });
}

export function useDeleteRecurringEntry(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => recurringApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: recurringKeys.all }),
  });
}

export function usePauseRecurringEntry(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => recurringApi.pause(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: recurringKeys.all }),
  });
}

export function useResumeRecurringEntry(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => recurringApi.resume(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: recurringKeys.all }),
  });
}
