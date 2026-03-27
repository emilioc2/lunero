import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  categoryApi,
  type CreateCategoryDto,
  type UpdateCategoryDto,
  type ReassignCategoryDto,
} from '@lunero/api-client';

export const categoryKeys = {
  all: ['categories'] as const,
};

export function useCategories() {
  return useQuery({
    queryKey: categoryKeys.all,
    queryFn: categoryApi.list,
    staleTime: 5 * 60_000, // categories change infrequently
  });
}

export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateCategoryDto) => categoryApi.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: categoryKeys.all }),
  });
}

export function useUpdateCategory(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateCategoryDto) => categoryApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: categoryKeys.all }),
  });
}

export function useDeleteCategory(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => categoryApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: categoryKeys.all }),
  });
}

export function useReassignCategory(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ReassignCategoryDto) => categoryApi.reassign(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: categoryKeys.all }),
  });
}
