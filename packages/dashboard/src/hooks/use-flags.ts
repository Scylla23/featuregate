import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listFlags, createFlag, toggleFlag } from '@/api/flags';
import type { Flag, CreateFlagInput, PaginatedResponse, ListFlagsParams } from '@/types/flag';

export function useFlags(params: ListFlagsParams) {
  return useQuery({
    queryKey: ['flags', params],
    queryFn: async () => {
      const res = await listFlags(params);
      // Normalize API response { flags } to our internal { data } shape
      const normalized: PaginatedResponse<Flag> = {
        data: res.flags,
        total: res.total,
        page: res.page,
        totalPages: res.totalPages,
      };
      return normalized;
    },
    enabled: !!params.projectId && !!params.environmentKey,
  });
}

export function useToggleFlag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (key: string) => {
      return toggleFlag(key);
    },
    onMutate: async (key: string) => {
      await queryClient.cancelQueries({ queryKey: ['flags'] });
      const previousQueries = queryClient.getQueriesData<PaginatedResponse<Flag>>({
        queryKey: ['flags'],
      });

      queryClient.setQueriesData<PaginatedResponse<Flag>>({ queryKey: ['flags'] }, (old) => {
        if (!old) return old;
        return {
          ...old,
          data: old.data.map((f) => (f.key === key ? { ...f, enabled: !f.enabled } : f)),
        };
      });

      return { previousQueries };
    },
    onError: (_err, _key, context) => {
      context?.previousQueries.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['flags'] });
    },
  });
}

export function useCreateFlag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateFlagInput) => {
      return createFlag(input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flags'] });
    },
  });
}
