export { evaluate } from './evaluate.js';
export { matchClause } from './clauses.js';
export { isUserInSegment } from './segments.js';
export { hashUser, bucketUser } from './hash.js';
export type {
  VariationValue,
  Variation,
  Operator,
  Clause,
  Rollout,
  Rule,
  Flag,
  Segment,
  EvaluationContext,
  EvaluationReason,
  EvaluationResult,
} from './types.js';
