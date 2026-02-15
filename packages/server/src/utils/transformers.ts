import type {
  Flag as EvalFlag,
  Segment as EvalSegment,
  Rule as EvalRule,
  Clause as EvalClause,
  VariationValue,
} from '@featuregate/evaluator';

// ---------------------------------------------------------------------------
// Mongoose lean document shapes (subset of fields relevant for transformation)
// ---------------------------------------------------------------------------

interface MongooseClause {
  attribute: string;
  operator: string;
  values: unknown[];
  negate?: boolean;
}

interface MongooseRuleRollout {
  variation?: number;
  variations?: { variation: number; weight: number }[];
}

interface MongooseRule {
  id: string;
  description?: string;
  clauses: MongooseClause[];
  rollout?: MongooseRuleRollout;
}

interface MongooseFallthrough {
  variation?: number;
  rollout?: {
    variations?: { variation: number; weight: number }[];
  };
}

interface MongooseFlagDoc {
  key: string;
  enabled: boolean;
  variations: { value: unknown; name?: string; description?: string }[];
  offVariation: number;
  fallthrough?: MongooseFallthrough;
  targets?: { variation: number; values: string[] }[];
  rules?: MongooseRule[];
}

interface MongooseSegmentRule {
  id: string;
  clauses: MongooseClause[];
  weight?: number;
  bucketBy?: string;
}

interface MongooseSegmentDoc {
  key: string;
  included?: string[];
  excluded?: string[];
  rules?: MongooseSegmentRule[];
}

// ---------------------------------------------------------------------------
// Segment ID → Key map (for resolving segmentMatch references)
// ---------------------------------------------------------------------------

type SegmentIdToKeyMap = Map<string, string>;

export function buildSegmentIdToKeyMap(
  segments: Array<{ _id: unknown; key: string }>,
): SegmentIdToKeyMap {
  const map = new Map<string, string>();
  for (const seg of segments) {
    map.set(String(seg._id), seg.key);
  }
  return map;
}

// ---------------------------------------------------------------------------
// Flag transformation
// ---------------------------------------------------------------------------

function transformClause(
  clause: MongooseClause,
  segmentMap?: SegmentIdToKeyMap,
): EvalClause {
  // Convert { attribute: 'segmentMatch', values: [objectId] }
  // to { attribute: 'segment:<key>', values: [true] }
  if (clause.attribute === 'segmentMatch' && segmentMap) {
    const segmentId = String(clause.values[0]);
    const segmentKey = segmentMap.get(segmentId);
    if (segmentKey) {
      return {
        attribute: `segment:${segmentKey}`,
        operator: 'in' as EvalClause['operator'],
        values: [true],
        ...(clause.negate ? { negate: true } : {}),
      };
    }
  }

  return {
    attribute: clause.attribute,
    operator: clause.operator as EvalClause['operator'],
    values: clause.values as EvalClause['values'],
    ...(clause.negate ? { negate: true } : {}),
  };
}

/**
 * Transform a Mongoose Flag rule to an Evaluator Rule.
 *
 * Mongoose stores variation/rollout nested under `rule.rollout`.
 * Evaluator expects `rule.variation` and `rule.rollout` at top level.
 */
function transformFlagRule(
  mongoRule: MongooseRule,
  segmentMap?: SegmentIdToKeyMap,
): EvalRule {
  const evalRule: EvalRule = {
    id: mongoRule.id,
    clauses: mongoRule.clauses.map((c) => transformClause(c, segmentMap)),
  };

  if (mongoRule.rollout?.variation !== undefined) {
    evalRule.variation = mongoRule.rollout.variation;
  }

  if (mongoRule.rollout?.variations && mongoRule.rollout.variations.length > 0) {
    evalRule.rollout = {
      variations: mongoRule.rollout.variations,
    };
  }

  return evalRule;
}

function transformFallthrough(ft?: MongooseFallthrough): EvalFlag['defaultRule'] {
  if (!ft) {
    return { variation: 0 };
  }

  const defaultRule: EvalFlag['defaultRule'] = {};

  if (ft.variation !== undefined) {
    defaultRule.variation = ft.variation;
  }

  if (ft.rollout?.variations && ft.rollout.variations.length > 0) {
    defaultRule.rollout = {
      variations: ft.rollout.variations,
    };
  }

  return defaultRule;
}

export function toEvalFlag(
  doc: MongooseFlagDoc,
  segmentMap?: SegmentIdToKeyMap,
): EvalFlag {
  return {
    key: doc.key,
    enabled: doc.enabled,
    variations: doc.variations.map((v) => ({
      value: v.value as VariationValue,
      ...(v.name ? { name: v.name } : {}),
      ...(v.description ? { description: v.description } : {}),
    })),
    offVariation: doc.offVariation,
    ...(doc.targets && doc.targets.length > 0
      ? { individualTargets: doc.targets }
      : {}),
    rules: (doc.rules ?? []).map((r) => transformFlagRule(r, segmentMap)),
    defaultRule: transformFallthrough(doc.fallthrough),
  };
}

// ---------------------------------------------------------------------------
// Segment transformation
// ---------------------------------------------------------------------------

function transformSegmentRule(mongoRule: MongooseSegmentRule): EvalRule {
  const evalRule: EvalRule = {
    id: mongoRule.id,
    clauses: mongoRule.clauses.map((c) => ({
      attribute: c.attribute,
      operator: c.operator as EvalClause['operator'],
      values: c.values as EvalClause['values'],
      ...(c.negate ? { negate: true } : {}),
    })),
  };

  if (mongoRule.weight !== undefined) {
    evalRule.rollout = {
      variations: [{ variation: 0, weight: mongoRule.weight }],
      ...(mongoRule.bucketBy ? { bucketBy: mongoRule.bucketBy } : {}),
    };
  }

  return evalRule;
}

export function toEvalSegment(doc: MongooseSegmentDoc): EvalSegment {
  return {
    key: doc.key,
    included: doc.included ?? [],
    excluded: doc.excluded ?? [],
    rules: (doc.rules ?? []).map(transformSegmentRule),
  };
}
