import { apiFetch } from './client';
import type {
  Flag,
  CreateFlagInput,
  UpdateFlagInput,
  ListFlagsParams,
  EvaluateResult,
} from '@/types/flag';

export interface FlagsListResponse {
  flags: Flag[];
  total: number;
  page: number;
  totalPages: number;
}

export async function listFlags(params: ListFlagsParams): Promise<FlagsListResponse> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  if (params.search) query.set('search', params.search);
  if (params.tags?.length) query.set('tags', params.tags.join(','));
  if (params.environmentKey) query.set('environmentKey', params.environmentKey);
  if (params.projectId) query.set('projectId', params.projectId);

  const qs = query.toString();
  return apiFetch<FlagsListResponse>(`/flags${qs ? `?${qs}` : ''}`);
}

export async function createFlag(input: CreateFlagInput): Promise<Flag> {
  return apiFetch<Flag>('/flags', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function toggleFlag(key: string): Promise<Flag> {
  return apiFetch<Flag>(`/flags/${key}/toggle`, {
    method: 'PATCH',
  });
}

export async function getFlag(key: string): Promise<Flag> {
  return apiFetch<Flag>(`/flags/${key}`);
}

export async function updateFlag(key: string, input: UpdateFlagInput): Promise<Flag> {
  return apiFetch<Flag>(`/flags/${key}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export async function deleteFlag(key: string): Promise<void> {
  await apiFetch(`/flags/${key}`, {
    method: 'DELETE',
  });
}

export async function evaluateFlag(
  flagKey: string,
  context: Record<string, unknown>,
  projectId: string,
  environmentKey: string,
): Promise<EvaluateResult> {
  return apiFetch<EvaluateResult>(`/flags/${flagKey}/evaluate`, {
    method: 'POST',
    body: JSON.stringify({ context, projectId, environmentKey }),
  });
}
