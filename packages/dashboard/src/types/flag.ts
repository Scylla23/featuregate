export type VariationValue = string | number | boolean | Record<string, unknown> | unknown[];

export interface Variation {
  value: VariationValue;
  name?: string;
  description?: string;
}

export interface Clause {
  attribute: string;
  operator: string;
  values: VariationValue[];
  negate?: boolean;
}

export interface RolloutVariation {
  variation: number;
  weight: number;
}

export interface Rollout {
  variations: RolloutVariation[];
  bucketBy?: string;
  seed?: number;
}

export interface Rule {
  id: string;
  description?: string;
  clauses: Clause[];
  variation?: number;
  rollout?: Rollout;
}

export interface Target {
  variation: number;
  values: string[];
}

export interface Flag {
  _id: string;
  key: string;
  name: string;
  description?: string;
  projectId: string;
  environmentKey: string;
  enabled: boolean;
  variations: Variation[];
  offVariation: number;
  fallthrough: {
    variation?: number;
    rollout?: Rollout;
  };
  targets: Target[];
  rules: Rule[];
  tags: string[];
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFlagInput {
  key: string;
  name: string;
  description?: string;
  projectId: string;
  environmentKey: string;
  enabled?: boolean;
  variations: Pick<Variation, 'value' | 'name'>[];
  offVariation: number;
  fallthrough?: { variation?: number };
  tags?: string[];
}

export interface UpdateFlagInput {
  name?: string;
  description?: string;
  enabled?: boolean;
  variations?: Variation[];
  offVariation?: number;
  fallthrough?: {
    variation?: number;
    rollout?: {
      variations?: RolloutVariation[];
      bucketBy?: string;
      seed?: number;
    };
  };
  targets?: Target[];
  rules?: Array<{
    id: string;
    description?: string;
    clauses: Clause[];
    rollout?: {
      variation?: number;
      variations?: RolloutVariation[];
      bucketBy?: string;
      seed?: number;
    };
  }>;
  tags?: string[];
}

export interface EvaluateResult {
  flagKey: string;
  value: VariationValue;
  variationIndex: number;
  reason: {
    kind: string;
    ruleIndex?: number;
    ruleId?: string;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  totalPages: number;
}

export interface ListFlagsParams {
  page?: number;
  limit?: number;
  search?: string;
  tags?: string[];
  sortBy?: 'updatedAt' | 'name' | 'enabled';
  sortOrder?: 'asc' | 'desc';
  environmentKey?: string;
  projectId?: string;
}
