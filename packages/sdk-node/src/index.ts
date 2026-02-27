// Classes
export { FeatureGateClient } from './client.js';
export { FlagStore } from './store.js';
export { HttpClient, HttpError } from './http-client.js';
export { SseTransport } from './transports/sse-transport.js';
export { PollingTransport } from './transports/polling-transport.js';
export { TransportManager } from './transports/transport-manager.js';

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
  // Transport types
  TransportStatus,
  UpdateEventType,
  TransportCallbacks,
  TransportConfig,
  Transport,
  HttpClientConfig,
  SdkFlagsResponse,
} from './types.js';
