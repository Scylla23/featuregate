import { apiFetch } from './client';
import type {
  Flag,
  FlagWithConfig,
  FlagConfig,
  CreateFlagInput,
  UpdateFlagInput,
  UpdateFlagConfigInput,
  ListFlagsParams,
  EvaluateResult,
} from '@/types/flag';

export interface FlagsListResponse {
  flags: FlagWithConfig[];
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

export async function toggleFlag(key: string, environmentKey: string, projectId?: string): Promise<FlagWithConfig> {
  const query = new URLSearchParams();
  query.set('environmentKey', environmentKey);
  if (projectId) query.set('projectId', projectId);
  return apiFetch<FlagWithConfig>(`/flags/${key}/toggle?${query.toString()}`, {
    method: 'PATCH',
  });
}

export async function getFlag(key: string, environmentKey?: string, projectId?: string): Promise<FlagWithConfig> {
  const query = new URLSearchParams();
  if (environmentKey) query.set('environmentKey', environmentKey);
  if (projectId) query.set('projectId', projectId);
  const qs = query.toString();
  return apiFetch<FlagWithConfig>(`/flags/${key}${qs ? `?${qs}` : ''}`);
}

export async function updateFlag(key: string, input: UpdateFlagInput, projectId?: string): Promise<Flag> {
  const query = new URLSearchParams();
  if (projectId) query.set('projectId', projectId);
  const qs = query.toString();
  return apiFetch<Flag>(`/flags/${key}${qs ? `?${qs}` : ''}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export async function updateFlagConfig(
  key: string,
  environmentKey: string,
  input: UpdateFlagConfigInput,
  projectId?: string,
): Promise<FlagConfig> {
  const query = new URLSearchParams();
  if (projectId) query.set('projectId', projectId);
  const qs = query.toString();
  return apiFetch<FlagConfig>(`/flags/${key}/config/${environmentKey}${qs ? `?${qs}` : ''}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export async function deleteFlag(key: string, projectId?: string): Promise<void> {
  const query = new URLSearchParams();
  if (projectId) query.set('projectId', projectId);
  const qs = query.toString();
  await apiFetch(`/flags/${key}${qs ? `?${qs}` : ''}`, {
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
