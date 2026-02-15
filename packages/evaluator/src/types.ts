// packages/evaluator/src/types.ts

export type VariationValue = string | number | boolean | Record<string, unknown> | unknown[];

export interface Variation {
  value: VariationValue;
  name?: string;
  description?: string;
}

export type Operator =
  | 'equals'
  | 'notEquals'
  | 'contains'
  | 'notContains'
  | 'startsWith'
  | 'endsWith'
  | 'matches'
  | 'greaterThan'
  | 'lessThan'
  | 'greaterThanOrEqual'
  | 'lessThanOrEqual'
  | 'in'
  | 'notIn'
  | 'semverEquals'
  | 'semverGreaterThan'
  | 'semverLessThan'
  | 'before'
  | 'after'
  | 'isTrue'
  | 'isFalse'
  | 'exists'
  | 'notExists';

export interface Clause {
  attribute: string; // e.g., "email", "plan", or "segment:beta-testers"
  operator: Operator;
  values: VariationValue[];
  negate?: boolean;
}

export interface Rollout {
  variations: {
    variation: number; // Index of the variation in the flag's variations array
    weight: number; // 0 to 100000 (representing 0% to 100.000%)
  }[];
  bucketBy?: string; // Attribute to hash, defaults to "key"
}

export interface Rule {
  id: string;
  clauses: Clause[];
  variation?: number; // Fixed variation index
  rollout?: Rollout; // Percentage rollout configuration
}

export interface Flag {
  key: string;
  enabled: boolean;
  variations: Variation[];
  offVariation: number;
  individualTargets?: {
    variation: number;
    values: string[]; // List of context keys (user IDs)
  }[];
  rules: Rule[];
  defaultRule: {
    variation?: number;
    rollout?: Rollout;
  };
}

export interface Segment {
  key: string;
  included: string[];
  excluded: string[];
  rules: Rule[];
}

export interface EvaluationContext {
  key: string;
  [attribute: string]: VariationValue;
}

export type EvaluationReason =
  | 'FLAG_DISABLED'
  | 'INDIVIDUAL_TARGET'
  | 'RULE_MATCH'
  | 'ROLLOUT'
  | 'DEFAULT'
  | 'DEFAULT_ROLLOUT'
  | 'ERROR';

export interface EvaluationResult {
  value: VariationValue;
  variationIndex: number;
  reason: EvaluationReason;
  ruleIndex?: number;
  ruleId?: string;
}
