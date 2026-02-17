export interface AuditAuthor {
  userId: string;
  email: string;
}

export interface AuditLogEntry {
  _id: string;
  action: string;
  resourceType: 'flag' | 'segment';
  resourceKey: string;
  projectId: string;
  environmentKey: string;
  author: AuditAuthor;
  previousValue: Record<string, unknown> | null;
  currentValue: Record<string, unknown> | null;
  diff: Record<string, { from: unknown; to: unknown }> | null;
  timestamp: string;
}

export interface AuditLogResponse {
  entries: AuditLogEntry[];
  total: number;
  page: number;
  totalPages: number;
}

export interface ListAuditLogParams {
  page?: number;
  limit?: number;
  resourceType?: 'flag' | 'segment';
  resourceKey?: string;
  action?: string;
  author?: string;
  from?: string;
  to?: string;
}
