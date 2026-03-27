import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { flowSheetApi, type CreateFlowSheetDto, type UpdateFlowSheetDto } from '@lunero/api-client';

export const flowSheetKeys = {
  all: ['flowSheets'] as const,
  active: () => [...flowSheetKeys.all, 'active'] as const,
  detail: (id: string) => [...flowSheetKeys.all, id] as const,
};

export function useActiveFlowSheet() {
  return useQuery({
    queryKey: flowSheetKeys.active(),
    queryFn: flowSheetApi.getActive,
  });
}

export function useFlowSheets() {
  return useQuery({
    queryKey: flowSheetKeys.all,
    queryFn: flowSheetApi.getAll,
  });
}

export function useFlowSheet(id: string) {
  return useQuery({
    queryKey: flowSheetKeys.detail(id),
    queryFn: () => flowSheetApi.getById(id),
    enabled: !!id,
  });
}

export function useCreateFlowSheet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateFlowSheetDto) => flowSheetApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: flowSheetKeys.all });
    },
  });
}

export function useUpdateFlowSheet(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateFlowSheetDto) => flowSheetApi.update(id, data),
    onSuccess: (updated) => {
      qc.setQueryData(flowSheetKeys.detail(id), updated);
      qc.invalidateQueries({ queryKey: flowSheetKeys.active() });
    },
  });
}

export function useUnlockFlowSheet(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => flowSheetApi.unlock(id),
    onSuccess: (updated) => {
      qc.setQueryData(flowSheetKeys.detail(id), updated);
    },
  });
}
