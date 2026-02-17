import { AuditLog } from '../models/AuditLog.js';
import { Types } from 'mongoose';

interface AuditAuthor {
  userId: Types.ObjectId;
  email: string;
}

interface CreateAuditEntryParams {
  action: string;
  resourceType: 'flag' | 'segment' | 'environment' | 'member' | 'apikey' | 'project';
  resourceKey: string;
  projectId: Types.ObjectId;
  environmentKey?: string;
  author: AuditAuthor;
  previousValue?: Record<string, unknown> | null;
  currentValue?: Record<string, unknown> | null;
}

/**
 * Compute a shallow diff between two objects.
 * Returns an object mapping changed top-level keys to { from, to }.
 */
function computeShallowDiff(
  prev: Record<string, unknown> | null | undefined,
  curr: Record<string, unknown> | null | undefined,
): Record<string, { from: unknown; to: unknown }> | null {
  if (!prev || !curr) return null;

  const diff: Record<string, { from: unknown; to: unknown }> = {};
  const allKeys = new Set([...Object.keys(prev), ...Object.keys(curr)]);

  for (const key of allKeys) {
    if (key === '_id' || key === '__v' || key === 'createdAt' || key === 'updatedAt') continue;

    const prevVal = prev[key];
    const currVal = curr[key];

    if (JSON.stringify(prevVal) !== JSON.stringify(currVal)) {
      diff[key] = { from: prevVal, to: currVal };
    }
  }

  return Object.keys(diff).length > 0 ? diff : null;
}

/**
 * Create an audit log entry. Fire-and-forget safe: catches and logs errors
 * so audit failures never block mutations.
 */
export async function createAuditEntry(params: CreateAuditEntryParams): Promise<void> {
  try {
    const diff = computeShallowDiff(params.previousValue, params.currentValue);

    await AuditLog.create({
      action: params.action,
      resourceType: params.resourceType,
      resourceKey: params.resourceKey,
      projectId: params.projectId,
      environmentKey: params.environmentKey ?? '',
      author: params.author,
      previousValue: params.previousValue ?? null,
      currentValue: params.currentValue ?? null,
      diff,
    });
  } catch (error) {
    console.error('Failed to create audit log entry:', error);
  }
}
