import { apiFetch } from './client';
import type { AuditLogResponse, ListAuditLogParams } from '@/types/audit';

export async function listAuditLog(params: ListAuditLogParams): Promise<AuditLogResponse> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  if (params.resourceType) query.set('resourceType', params.resourceType);
  if (params.resourceKey) query.set('resourceKey', params.resourceKey);
  if (params.action) query.set('action', params.action);
  if (params.author) query.set('author', params.author);
  if (params.from) query.set('from', params.from);
  if (params.to) query.set('to', params.to);

  const qs = query.toString();
  return apiFetch<AuditLogResponse>(`/audit-log${qs ? `?${qs}` : ''}`);
}
