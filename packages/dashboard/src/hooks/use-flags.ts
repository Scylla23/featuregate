import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listFlags,
  getFlag,
  createFlag,
  updateFlag,
  updateFlagConfig,
  toggleFlag,
  evaluateFlag,
} from '@/api/flags';
import { useProject } from '@/providers/project-provider';
import type {
  FlagWithConfig,
  CreateFlagInput,
  UpdateFlagInput,
  UpdateFlagConfigInput,
  PaginatedResponse,
  ListFlagsParams,
} from '@/types/flag';

export function useFlags(params: ListFlagsParams) {
  return useQuery({
    queryKey: ['flags', params],
    queryFn: async () => {
      const res = await listFlags(params);
      // Normalize API response { flags } to our internal { data } shape
      const normalized: PaginatedResponse<FlagWithConfig> = {
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
  const { activeProjectId, activeEnvironmentKey } = useProject();

  return useMutation({
    mutationFn: async (key: string) => {
      return toggleFlag(key, activeEnvironmentKey!, activeProjectId || undefined);
    },
    onMutate: async (key: string) => {
      await queryClient.cancelQueries({ queryKey: ['flags'] });
      const previousQueries = queryClient.getQueriesData<PaginatedResponse<FlagWithConfig>>({
        queryKey: ['flags'],
      });

      queryClient.setQueriesData<PaginatedResponse<FlagWithConfig>>(
        { queryKey: ['flags'] },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            data: old.data.map((f) => (f.key === key ? { ...f, enabled: !f.enabled } : f)),
          };
        },
      );

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

export function useFlag(key: string | undefined) {
  const { activeProjectId, activeEnvironmentKey } = useProject();

  return useQuery({
    queryKey: ['flag', key, activeEnvironmentKey],
    queryFn: () => getFlag(key!, activeEnvironmentKey || undefined, activeProjectId || undefined),
    enabled: !!key && !!activeEnvironmentKey,
  });
}

export function useUpdateFlag() {
  const queryClient = useQueryClient();
  const { activeProjectId } = useProject();

  return useMutation({
    mutationFn: ({ key, input }: { key: string; input: UpdateFlagInput }) =>
      updateFlag(key, input, activeProjectId || undefined),
    onSuccess: (_updatedFlag, { key }) => {
      queryClient.invalidateQueries({ queryKey: ['flag', key] });
      queryClient.invalidateQueries({ queryKey: ['flags'] });
    },
  });
}

export function useUpdateFlagConfig() {
  const queryClient = useQueryClient();
  const { activeProjectId, activeEnvironmentKey } = useProject();

  return useMutation({
    mutationFn: ({ key, input }: { key: string; input: UpdateFlagConfigInput }) =>
      updateFlagConfig(key, activeEnvironmentKey!, input, activeProjectId || undefined),
    onSuccess: (_updatedConfig, { key }) => {
      queryClient.invalidateQueries({ queryKey: ['flag', key] });
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

export function useEvaluateFlag() {
  return useMutation({
    mutationFn: ({
      flagKey,
      context,
      projectId,
      environmentKey,
    }: {
      flagKey: string;
      context: Record<string, unknown>;
      projectId: string;
      environmentKey: string;
    }) => evaluateFlag(flagKey, context, projectId, environmentKey),
  });
}
