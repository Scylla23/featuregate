import { apiFetch } from './client';
import type { Flag, CreateFlagInput, PaginatedResponse, ListFlagsParams } from '@/types/flag';

export async function listFlags(params: ListFlagsParams): Promise<PaginatedResponse<Flag>> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  if (params.search) query.set('search', params.search);
  if (params.tags?.length) query.set('tags', params.tags.join(','));
  if (params.environmentKey) query.set('environmentKey', params.environmentKey);
  if (params.projectId) query.set('projectId', params.projectId);

  const qs = query.toString();
  return apiFetch<PaginatedResponse<Flag>>(`/flags${qs ? `?${qs}` : ''}`);
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

export async function deleteFlag(key: string): Promise<void> {
  await apiFetch(`/flags/${key}`, {
    method: 'DELETE',
  });
}
