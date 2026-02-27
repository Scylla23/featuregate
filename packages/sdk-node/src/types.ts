import type { Flag, Segment, VariationValue, EvaluationReason } from '@featuregate/evaluator';

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

// ---------------------------------------------------------------------------
// Transport types
// ---------------------------------------------------------------------------

/** Status of a transport connection. */
export type TransportStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

/** The type of real-time update event received from the server. */
export type UpdateEventType = 'flag.updated' | 'segment.updated';

/** Callbacks that transport implementations use to communicate with the client. */
export interface TransportCallbacks {
  /** Full data payload received (initial fetch or polling refresh). */
  onData: (flags: Record<string, Flag>, segments: Record<string, Segment>) => void;
  /** Incremental update from SSE stream. */
  onIncrement: (type: UpdateEventType, key: string, data: Flag | Segment) => void;
  /** Transport error. */
  onError: (error: Error) => void;
  /** Connection status change. */
  onStatusChange: (status: TransportStatus) => void;
  /** SSE → polling fallback occurred (optional, used by TransportManager). */
  onFallback?: () => void;
  /** SSE recovered from polling fallback (optional, used by TransportManager). */
  onRestored?: () => void;
}

/** Configuration passed to transport constructors. */
export interface TransportConfig {
  sdkKey: string;
  baseUrl: string;
  pollingIntervalMs: number;
  connectionTimeoutMs: number;
  logger?: Logger;
}

/** Interface that all transports must implement. */
export interface Transport {
  start(callbacks: TransportCallbacks): void;
  stop(): void;
  readonly status: TransportStatus;
}

/** Options for the HTTP client. */
export interface HttpClientConfig {
  baseUrl: string;
  sdkKey: string;
  timeoutMs: number;
  logger?: Logger;
}

/** Shape of the GET /api/v1/sdk/flags response. */
export interface SdkFlagsResponse {
  flags: Record<string, Flag>;
  segments: Record<string, Segment>;
}
