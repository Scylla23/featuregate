import { apiFetch } from './client';
import type {
  Segment,
  CreateSegmentInput,
  UpdateSegmentInput,
  ListSegmentsParams,
  SegmentCheckResult,
  SegmentFlagReference,
} from '@/types/segment';

export interface SegmentsListResponse {
  segments: Segment[];
  total: number;
  page: number;
  totalPages: number;
}

export async function listSegments(params: ListSegmentsParams): Promise<SegmentsListResponse> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  if (params.search) query.set('search', params.search);
  if (params.tags?.length) query.set('tags', params.tags.join(','));
  if (params.environmentKey) query.set('environmentKey', params.environmentKey);
  if (params.projectId) query.set('projectId', params.projectId);

  const qs = query.toString();
  return apiFetch<SegmentsListResponse>(`/segments${qs ? `?${qs}` : ''}`);
}

export async function createSegment(input: CreateSegmentInput): Promise<Segment> {
  return apiFetch<Segment>('/segments', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function getSegment(key: string): Promise<Segment> {
  return apiFetch<Segment>(`/segments/${key}`);
}

export async function updateSegment(key: string, input: UpdateSegmentInput): Promise<Segment> {
  return apiFetch<Segment>(`/segments/${key}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export async function deleteSegment(key: string): Promise<void> {
  await apiFetch(`/segments/${key}`, {
    method: 'DELETE',
  });
}

export async function checkSegmentMembership(
  key: string,
  context: Record<string, unknown>,
): Promise<SegmentCheckResult> {
  return apiFetch<SegmentCheckResult>(`/segments/${key}/check`, {
    method: 'POST',
    body: JSON.stringify({ context }),
  });
}

export async function getSegmentFlags(
  key: string,
): Promise<{ flags: SegmentFlagReference[] }> {
  return apiFetch<{ flags: SegmentFlagReference[] }>(`/segments/${key}/flags`);
}
