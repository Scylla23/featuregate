import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listEnvironments,
  createEnvironment,
  updateEnvironment,
  deleteEnvironment,
  resetSdkKey,
  resetMobileKey,
  reorderEnvironments,
} from '@/api/environments';
import type { CreateEnvironmentInput, UpdateEnvironmentInput } from '@/types/settings';

export function useEnvironmentsList(projectId: string | null) {
  return useQuery({
    queryKey: ['settings-environments', projectId],
    queryFn: () => listEnvironments(projectId!),
    enabled: !!projectId,
  });
}

export function useCreateEnvironment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, input }: { projectId: string; input: CreateEnvironmentInput }) =>
      createEnvironment(projectId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings-environments'] });
      queryClient.invalidateQueries({ queryKey: ['environments'] });
    },
  });
}

export function useUpdateEnvironment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      projectId,
      envKey,
      input,
    }: {
      projectId: string;
      envKey: string;
      input: UpdateEnvironmentInput;
    }) => updateEnvironment(projectId, envKey, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings-environments'] });
      queryClient.invalidateQueries({ queryKey: ['environments'] });
    },
  });
}

export function useDeleteEnvironment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, envKey }: { projectId: string; envKey: string }) =>
      deleteEnvironment(projectId, envKey),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings-environments'] });
      queryClient.invalidateQueries({ queryKey: ['environments'] });
    },
  });
}

export function useResetSdkKey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, envKey }: { projectId: string; envKey: string }) =>
      resetSdkKey(projectId, envKey),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings-environments'] });
      queryClient.invalidateQueries({ queryKey: ['environments'] });
    },
  });
}

export function useResetMobileKey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, envKey }: { projectId: string; envKey: string }) =>
      resetMobileKey(projectId, envKey),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings-environments'] });
      queryClient.invalidateQueries({ queryKey: ['environments'] });
    },
  });
}

export function useReorderEnvironments() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      projectId,
      orderedKeys,
    }: {
      projectId: string;
      orderedKeys: string[];
    }) => reorderEnvironments(projectId, orderedKeys),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings-environments'] });
      queryClient.invalidateQueries({ queryKey: ['environments'] });
    },
  });
}
