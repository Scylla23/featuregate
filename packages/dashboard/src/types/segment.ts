import type { Clause } from './flag';

export interface SegmentRule {
  id: string;
  clauses: Clause[];
  weight?: number;
  bucketBy?: string;
  description?: string;
}

export interface Segment {
  _id: string;
  key: string;
  name: string;
  description?: string;
  projectId: string;
  environmentKey: string;
  included: string[];
  excluded: string[];
  rules: SegmentRule[];
  tags: string[];
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSegmentInput {
  key: string;
  name: string;
  description?: string;
  projectId: string;
  environmentKey: string;
  included?: string[];
  excluded?: string[];
  rules?: SegmentRule[];
  tags?: string[];
}

export interface UpdateSegmentInput {
  name?: string;
  description?: string;
  included?: string[];
  excluded?: string[];
  rules?: SegmentRule[];
  tags?: string[];
}

export interface ListSegmentsParams {
  page?: number;
  limit?: number;
  search?: string;
  tags?: string[];
  environmentKey?: string;
  projectId?: string;
}

export interface SegmentCheckResult {
  match: boolean;
  reason: string;
}

export interface SegmentFlagReference {
  key: string;
  name: string;
  enabled: boolean;
}
