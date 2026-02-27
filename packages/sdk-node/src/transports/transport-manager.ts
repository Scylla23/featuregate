import type {
  Transport,
  TransportCallbacks,
  TransportConfig,
  TransportStatus,
  Logger,
} from '../types.js';
import { HttpClient } from '../http-client.js';
import { SseTransport } from './sse-transport.js';
import { PollingTransport } from './polling-transport.js';

/** Consecutive SSE failures before falling back to polling. */
const SSE_FAILURE_THRESHOLD = 3;

/** How often to retry SSE while in polling fallback (ms). */
const SSE_RETRY_INTERVAL_MS = 60_000;

export class TransportManager implements Transport {
  private readonly httpClient: HttpClient;
  private readonly config: TransportConfig;
  private readonly preferredTransport: 'sse' | 'polling';
  private readonly logger: Logger | undefined;

  private activeTransport: Transport | null = null;
  private callbacks: TransportCallbacks | null = null;
  private _status: TransportStatus = 'disconnected';

  private sseFailureCount = 0;
  private inFallback = false;
  private sseRetryTimer: ReturnType<typeof setTimeout> | null = null;
  private probeTransport: Transport | null = null;
  private stopped = true;

  constructor(
    httpClient: HttpClient,
    config: TransportConfig,
    preferredTransport: 'sse' | 'polling',
  ) {
    this.httpClient = httpClient;
    this.config = config;
    this.preferredTransport = preferredTransport;
    this.logger = config.logger;
  }

  get status(): TransportStatus {
    return this._status;
  }

  /**
   * Start the transport manager.
   * - 'polling' mode: start polling directly.
   * - 'sse' mode: start SSE with automatic fallback to polling on repeated failures.
   */
  start(callbacks: TransportCallbacks): void {
    this.callbacks = callbacks;
    this.stopped = false;
    this.sseFailureCount = 0;
    this.inFallback = false;

    if (this.preferredTransport === 'polling') {
      this.activeTransport = this.createTransport('polling');
      this.activeTransport.start(this.wrapCallbacks(callbacks));
    } else {
      this.activeTransport = this.createTransport('sse');
      this.activeTransport.start(this.wrapCallbacks(callbacks));
    }
  }

  /** Stop all transports and timers. */
  stop(): void {
    this.stopped = true;
    this.activeTransport?.stop();
    this.activeTransport = null;
    this.probeTransport?.stop();
    this.probeTransport = null;

    if (this.sseRetryTimer !== null) {
      clearTimeout(this.sseRetryTimer);
      this.sseRetryTimer = null;
    }

    this.setStatus('disconnected');
  }

  // ---------------------------------------------------------------------------
  // Internal
  // ---------------------------------------------------------------------------

  private createTransport(type: 'sse' | 'polling'): Transport {
    if (type === 'sse') {
      return new SseTransport(this.httpClient, this.config);
    }
    return new PollingTransport(this.httpClient, this.config);
  }

  /** Wrap callbacks to intercept errors for SSE→polling fallback logic. */
  private wrapCallbacks(callbacks: TransportCallbacks): TransportCallbacks {
    return {
      onData: (flags, segments) => {
        if (!this.inFallback) {
          this.sseFailureCount = 0;
        }
        callbacks.onData(flags, segments);
      },
      onIncrement: (type, key, data) => {
        // Incremental updates only come from SSE — reset failure count
        this.sseFailureCount = 0;
        callbacks.onIncrement(type, key, data);
      },
      onError: (error) => {
        if (!this.inFallback && this.preferredTransport === 'sse') {
          this.sseFailureCount++;
          this.logger?.warn(
            `SSE error (${this.sseFailureCount}/${SSE_FAILURE_THRESHOLD}): ${error.message}`,
          );
          if (this.sseFailureCount >= SSE_FAILURE_THRESHOLD) {
            this.fallbackToPolling();
            return;
          }
        }
        callbacks.onError(error);
      },
      onStatusChange: (status) => {
        this.setStatus(status);
      },
    };
  }

  /** Switch from SSE to polling after repeated failures. */
  private fallbackToPolling(): void {
    if (this.stopped) return;

    this.logger?.warn('SSE failed repeatedly. Falling back to polling.');
    this.inFallback = true;
    this.callbacks?.onFallback?.();

    // Stop SSE
    this.activeTransport?.stop();

    // Start polling
    this.activeTransport = this.createTransport('polling');
    this.activeTransport.start(this.wrapCallbacks(this.callbacks!));

    // Schedule periodic SSE recovery attempts
    this.scheduleSseRetry();
  }

  /** Schedule a periodic attempt to recover SSE. */
  private scheduleSseRetry(): void {
    if (this.stopped || this.sseRetryTimer !== null) return;

    this.sseRetryTimer = setTimeout(() => {
      this.sseRetryTimer = null;
      if (this.stopped || !this.inFallback) return;
      this.attemptSseRecovery();
    }, SSE_RETRY_INTERVAL_MS);

    // Don't prevent process exit
    if (typeof this.sseRetryTimer === 'object' && 'unref' in this.sseRetryTimer) {
      this.sseRetryTimer.unref();
    }
  }

  /** Try to reconnect SSE while polling continues. */
  private attemptSseRecovery(): void {
    this.logger?.info('Attempting SSE recovery...');

    const probe = this.createTransport('sse');
    this.probeTransport = probe;

    const probeCallbacks: TransportCallbacks = {
      onData: (flags, segments) => {
        if (this.stopped) {
          probe.stop();
          return;
        }
        // SSE recovered! Switch over.
        this.logger?.info('SSE recovered. Switching back from polling.');
        this.activeTransport?.stop();
        this.activeTransport = probe;
        this.probeTransport = null;
        this.inFallback = false;
        this.sseFailureCount = 0;

        // Deliver data and re-wire to normal wrapped callbacks
        this.callbacks!.onRestored?.();
        this.callbacks!.onData(flags, segments);
      },
      onIncrement: (type, key, data) => {
        this.callbacks?.onIncrement(type, key, data);
      },
      onError: () => {
        // SSE still failing — stop probe, schedule another retry
        probe.stop();
        this.probeTransport = null;
        if (!this.stopped && this.inFallback) {
          this.scheduleSseRetry();
        }
      },
      onStatusChange: (status) => {
        if (status === 'connected' && !this.inFallback) {
          this.callbacks?.onStatusChange(status);
        }
      },
    };

    probe.start(probeCallbacks);
  }

  private setStatus(status: TransportStatus): void {
    if (this._status === status) return;
    this._status = status;
    this.callbacks?.onStatusChange(status);
  }
}
