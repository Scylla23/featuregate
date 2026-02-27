import { EventEmitter } from 'node:events';
import { evaluate } from '@featuregate/evaluator';
import type {
  EvaluationContext,
  VariationValue,
  Flag,
  Segment,
} from '@featuregate/evaluator';
import type {
  FeatureGateClientOptions,
  EvaluationDetail,
  Logger,
  TransportCallbacks,
  UpdateEventType,
  TransportStatus,
} from './types.js';
import { FlagStore } from './store.js';
import { HttpClient } from './http-client.js';
import { TransportManager } from './transports/transport-manager.js';

const DEFAULT_POLLING_INTERVAL_MS = 30_000;
const DEFAULT_CONNECTION_TIMEOUT_MS = 10_000;

export class FeatureGateClient extends EventEmitter {
  private readonly store: FlagStore;
  private readonly transport: TransportManager;
  private readonly logger: Logger | undefined;
  private readonly connectionTimeoutMs: number;

  private initPromise: Promise<void> | null = null;
  private closed = false;
  private warnedNotReady = false;

  constructor(options: FeatureGateClientOptions) {
    super();

    if (!options.sdkKey) {
      throw new Error('FeatureGateClient: sdkKey is required');
    }
    if (!options.baseUrl) {
      throw new Error('FeatureGateClient: baseUrl is required');
    }

    this.logger = options.logger;
    this.connectionTimeoutMs = options.connectionTimeoutMs ?? DEFAULT_CONNECTION_TIMEOUT_MS;

    const pollingIntervalMs = options.pollingIntervalMs ?? DEFAULT_POLLING_INTERVAL_MS;

    this.store = new FlagStore();

    const httpClient = new HttpClient({
      baseUrl: options.baseUrl,
      sdkKey: options.sdkKey,
      timeoutMs: this.connectionTimeoutMs,
      logger: options.logger,
    });

    this.transport = new TransportManager(
      httpClient,
      {
        sdkKey: options.sdkKey,
        baseUrl: options.baseUrl,
        pollingIntervalMs,
        connectionTimeoutMs: this.connectionTimeoutMs,
        logger: options.logger,
      },
      options.transport ?? 'sse',
    );
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  /**
   * Initialize the client: fetch flags, start real-time updates.
   * Resolves when the first data load completes. Idempotent.
   */
  init(): Promise<void> {
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise<void>((resolve, reject) => {
      let settled = false;

      const timeoutTimer = setTimeout(() => {
        if (!settled) {
          settled = true;
          reject(new Error('FeatureGateClient: initialization timed out'));
        }
      }, this.connectionTimeoutMs);

      // Don't prevent process exit during timeout
      if (typeof timeoutTimer === 'object' && 'unref' in timeoutTimer) {
        timeoutTimer.unref();
      }

      const callbacks: TransportCallbacks = {
        onData: (flags, segments) => {
          this.store.replaceAll(flags, segments);

          if (!settled) {
            settled = true;
            clearTimeout(timeoutTimer);
            this.emit('ready');
            resolve();
          }

          this.emit('update', { flags: Object.keys(flags) });
        },

        onIncrement: (type: UpdateEventType, key: string, data: Flag | Segment) => {
          if (type === 'flag.updated') {
            this.store.upsertFlag(key, data as Flag);
            this.emit('change', { flagKey: key });
          } else if (type === 'segment.updated') {
            this.store.upsertSegment(key, data as Segment);
          }
        },

        onError: (error: Error) => {
          if (!settled) {
            settled = true;
            clearTimeout(timeoutTimer);
            reject(error);
          }
          this.emit('error', error);
        },

        onStatusChange: (_status: TransportStatus) => {
          // Status tracked internally by transport manager
        },

        onFallback: () => {
          this.emit('transport:fallback');
        },

        onRestored: () => {
          this.emit('transport:restored');
        },
      };

      this.transport.start(callbacks);
    });

    return this.initPromise;
  }

  /**
   * Shut down the client: stop transport, clean up resources.
   * Idempotent — safe to call multiple times.
   */
  async close(): Promise<void> {
    if (this.closed) return;
    this.closed = true;
    this.transport.stop();
    this.removeAllListeners();
  }

  // ---------------------------------------------------------------------------
  // Evaluation methods (synchronous, never throw)
  // ---------------------------------------------------------------------------

  /**
   * Evaluate a boolean flag. Returns `defaultValue` if the flag is not found,
   * the client is not ready, or evaluation fails.
   */
  isEnabled(
    flagKey: string,
    context: EvaluationContext,
    defaultValue = false,
  ): boolean {
    const result = this.evaluateFlag(flagKey, context);
    if (result === null) return defaultValue;
    return Boolean(result.value);
  }

  /**
   * Evaluate a flag and return its variation value. Returns `defaultValue`
   * if the flag is not found, the client is not ready, or evaluation fails.
   */
  variation(
    flagKey: string,
    context: EvaluationContext,
    defaultValue: VariationValue | null = null,
  ): VariationValue | null {
    const result = this.evaluateFlag(flagKey, context);
    if (result === null) return defaultValue;
    return result.value;
  }

  /**
   * Evaluate a flag and return detailed information including the reason.
   * Returns a detail object with `defaultValue` and reason `'ERROR'` on failure.
   */
  variationDetail(
    flagKey: string,
    context: EvaluationContext,
    defaultValue: VariationValue | null = null,
  ): EvaluationDetail {
    if (this.closed || !this.store.isInitialized()) {
      this.warnNotReady();
      return {
        value: defaultValue as VariationValue,
        variationIndex: -1,
        reason: 'ERROR',
      };
    }

    const flag = this.store.getFlag(flagKey);
    if (!flag) {
      this.logger?.debug(`Flag not found: ${flagKey}`);
      return {
        value: defaultValue as VariationValue,
        variationIndex: -1,
        reason: 'ERROR',
      };
    }

    try {
      const result = evaluate(flag, context, this.store.getSegmentsMap());
      return {
        value: result.value,
        variationIndex: result.variationIndex,
        reason: result.reason,
        ruleIndex: result.ruleIndex,
        ruleId: result.ruleId,
      };
    } catch (err) {
      this.logger?.error(`Evaluation error for flag ${flagKey}`);
      return {
        value: defaultValue as VariationValue,
        variationIndex: -1,
        reason: 'ERROR',
      };
    }
  }

  /**
   * Evaluate all flags for a given context. Returns a map of flag key → value.
   * Flags that fail evaluation are skipped.
   */
  allFlagsState(context: EvaluationContext): Record<string, VariationValue> {
    if (this.closed || !this.store.isInitialized()) {
      this.warnNotReady();
      return {};
    }

    const flags = this.store.getAllFlags();
    const segments = this.store.getSegmentsMap();
    const result: Record<string, VariationValue> = {};

    for (const [key, flag] of flags) {
      try {
        const evalResult = evaluate(flag, context, segments);
        result[key] = evalResult.value;
      } catch (err) {
        this.logger?.warn(`Evaluation error for flag ${key}, skipping`);
      }
    }

    return result;
  }

  // ---------------------------------------------------------------------------
  // Internal
  // ---------------------------------------------------------------------------

  /**
   * Core evaluation helper. Returns null if the client isn't ready or
   * the flag doesn't exist. Never throws.
   */
  private evaluateFlag(
    flagKey: string,
    context: EvaluationContext,
  ): { value: VariationValue; variationIndex: number } | null {
    if (this.closed || !this.store.isInitialized()) {
      this.warnNotReady();
      return null;
    }

    const flag = this.store.getFlag(flagKey);
    if (!flag) {
      this.logger?.debug(`Flag not found: ${flagKey}`);
      return null;
    }

    try {
      return evaluate(flag, context, this.store.getSegmentsMap());
    } catch (err) {
      this.logger?.error(`Evaluation error for flag ${flagKey}`);
      return null;
    }
  }

  /** Log a warning once when evaluation is called before init completes. */
  private warnNotReady(): void {
    if (!this.warnedNotReady) {
      this.warnedNotReady = true;
      this.logger?.warn(
        'FeatureGateClient: evaluation called before init() completed. Returning defaults.',
      );
    }
  }
}
