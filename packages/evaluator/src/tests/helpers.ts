import type {
  Flag,
  Segment,
  Rule,
  Clause,
  Rollout,
  EvaluationContext,
  Variation,
  Operator,
  VariationValue,
} from '../types.js';

export function buildContext(overrides: Partial<EvaluationContext> & { key?: string } = {}): EvaluationContext {
  return {
    key: 'user-123',
    ...overrides,
  };
}

export function buildVariation(value: VariationValue, overrides: Partial<Variation> = {}): Variation {
  return { value, ...overrides };
}

export function buildClause(
  attribute: string,
  operator: Operator,
  values: VariationValue[],
  overrides: Partial<Clause> = {},
): Clause {
  return { attribute, operator, values, ...overrides };
}

export function buildRollout(
  variations: { variation: number; weight: number }[],
  bucketBy?: string,
): Rollout {
  return { variations, ...(bucketBy ? { bucketBy } : {}) };
}

export function buildRule(id: string, clauses: Clause[], overrides: Partial<Rule> = {}): Rule {
  return { id, clauses, ...overrides };
}

export function buildSegment(key: string, overrides: Partial<Omit<Segment, 'key'>> = {}): Segment {
  return {
    key,
    included: [],
    excluded: [],
    rules: [],
    ...overrides,
  };
}

export function buildFlag(key: string, overrides: Partial<Omit<Flag, 'key'>> = {}): Flag {
  return {
    key,
    enabled: true,
    variations: [buildVariation(false, { name: 'off' }), buildVariation(true, { name: 'on' })],
    offVariation: 0,
    rules: [],
    defaultRule: { variation: 0 },
    ...overrides,
  };
}

export function buildBooleanFlag(key: string, enabled = true, defaultOn = false): Flag {
  return buildFlag(key, {
    enabled,
    defaultRule: { variation: defaultOn ? 1 : 0 },
  });
}
