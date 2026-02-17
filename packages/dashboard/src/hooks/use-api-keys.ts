import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listApiKeys,
  createApiKey,
  revokeApiKey,
  deleteApiKey,
} from '@/api/apikeys';
import type { CreateApiKeyInput } from '@/types/settings';

export function useApiKeys(
  projectId: string | null,
  params?: { status?: string; environmentId?: string; keyType?: string },
) {
  return useQuery({
    queryKey: ['api-keys', projectId, params],
    queryFn: () => listApiKeys(projectId!, params),
    enabled: !!projectId,
  });
}

export function useCreateApiKey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, input }: { projectId: string; input: CreateApiKeyInput }) =>
      createApiKey(projectId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
    },
  });
}

export function useRevokeApiKey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, keyId }: { projectId: string; keyId: string }) =>
      revokeApiKey(projectId, keyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
    },
  });
}

export function useDeleteApiKey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, keyId }: { projectId: string; keyId: string }) =>
      deleteApiKey(projectId, keyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
    },
  });
}
