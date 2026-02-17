import { apiFetch } from './client';
import type {
  ApiKeyItem,
  CreateApiKeyInput,
  CreateApiKeyResponse,
} from '@/types/settings';

interface ListApiKeysResponse {
  apiKeys: ApiKeyItem[];
  total: number;
  active: number;
  revoked: number;
}

interface ListApiKeysParams {
  status?: string;
  environmentId?: string;
  keyType?: string;
}

export async function listApiKeys(
  projectId: string,
  params?: ListApiKeysParams,
): Promise<ListApiKeysResponse> {
  const query = new URLSearchParams();
  if (params?.status) query.set('status', params.status);
  if (params?.environmentId) query.set('environmentId', params.environmentId);
  if (params?.keyType) query.set('keyType', params.keyType);
  const qs = query.toString();
  return apiFetch<ListApiKeysResponse>(
    `/projects/${projectId}/api-keys${qs ? `?${qs}` : ''}`,
  );
}

export async function createApiKey(
  projectId: string,
  input: CreateApiKeyInput,
): Promise<CreateApiKeyResponse> {
  return apiFetch<CreateApiKeyResponse>(`/projects/${projectId}/api-keys`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function updateApiKey(
  projectId: string,
  keyId: string,
  input: { name?: string; description?: string },
): Promise<ApiKeyItem> {
  return apiFetch<ApiKeyItem>(`/projects/${projectId}/api-keys/${keyId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export async function revokeApiKey(projectId: string, keyId: string): Promise<ApiKeyItem> {
  return apiFetch<ApiKeyItem>(`/projects/${projectId}/api-keys/${keyId}/revoke`, {
    method: 'POST',
  });
}

export async function deleteApiKey(projectId: string, keyId: string): Promise<void> {
  await apiFetch<{ success: boolean }>(`/projects/${projectId}/api-keys/${keyId}`, {
    method: 'DELETE',
  });
}
