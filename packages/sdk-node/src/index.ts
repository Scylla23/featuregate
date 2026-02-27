// Classes
export { FlagStore } from './store.js';

// Types (re-exported from evaluator + SDK-specific)
export type {
  // From evaluator
  Flag,
  Segment,
  EvaluationContext,
  EvaluationResult,
  EvaluationReason,
  VariationValue,
  Variation,
  Operator,
  Clause,
  Rollout,
  Rule,
  // SDK-specific
  Logger,
  FeatureGateClientOptions,
  EvaluationDetail,
} from './types.js';
