import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { entryApi, type CreateEntryDto, type UpdateEntryDto } from '@lunero/api-client';
import { flowSheetKeys } from './use-flow-sheets';

export const entryKeys = {
  bySheet: (flowSheetId: string) => ['entries', flowSheetId] as const,
};

export function useEntries(flowSheetId: string) {
  return useQuery({
    queryKey: entryKeys.bySheet(flowSheetId),
    queryFn: () => entryApi.list(flowSheetId),
    enabled: !!flowSheetId,
  });
}

export function useCreateEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateEntryDto) => entryApi.create(data),
    onSuccess: (entry) => {
      qc.invalidateQueries({ queryKey: entryKeys.bySheet(entry.flowSheetId) });
      qc.invalidateQueries({ queryKey: flowSheetKeys.active() });
    },
  });
}

export function useUpdateEntry(flowSheetId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateEntryDto }) =>
      entryApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: entryKeys.bySheet(flowSheetId) });
      qc.invalidateQueries({ queryKey: flowSheetKeys.active() });
    },
  });
}

export function useDeleteEntry(flowSheetId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => entryApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: entryKeys.bySheet(flowSheetId) });
      qc.invalidateQueries({ queryKey: flowSheetKeys.active() });
    },
  });
}
