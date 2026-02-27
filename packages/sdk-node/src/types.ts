import type { VariationValue, EvaluationReason } from '@featuregate/evaluator';

// Re-export evaluator types for SDK consumers
export type {
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
} from '@featuregate/evaluator';

// ---------------------------------------------------------------------------
// SDK-specific types
// ---------------------------------------------------------------------------

export interface Logger {
  debug(msg: string, ...args: unknown[]): void;
  info(msg: string, ...args: unknown[]): void;
  warn(msg: string, ...args: unknown[]): void;
  error(msg: string, ...args: unknown[]): void;
}

export interface FeatureGateClientOptions {
  /** Environment SDK key (scopes to project + environment on the server). */
  sdkKey: string;

  /** Base URL of the FeatureGate API server (e.g. "http://localhost:4000"). */
  baseUrl: string;

  /** Transport mechanism for receiving flag updates. Default: 'sse'. */
  transport?: 'sse' | 'polling';

  /** Polling interval in milliseconds (used when transport is 'polling'). Default: 30_000. */
  pollingIntervalMs?: number;

  /** Timeout in milliseconds for the initial connection / data fetch. Default: 10_000. */
  connectionTimeoutMs?: number;

  /** Optional structured logger. If omitted, logs are suppressed. */
  logger?: Logger;
}

/**
 * Detailed evaluation result returned by `variationDetail()`.
 * Mirrors EvaluationResult from the evaluator but lives in the SDK's public API surface.
 */
export interface EvaluationDetail {
  value: VariationValue;
  variationIndex: number;
  reason: EvaluationReason;
  ruleIndex?: number;
  ruleId?: string;
}
