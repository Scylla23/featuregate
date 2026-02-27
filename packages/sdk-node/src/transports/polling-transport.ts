import type {
  Transport,
  TransportCallbacks,
  TransportConfig,
  TransportStatus,
  Logger,
} from '../types.js';
import { HttpClient } from '../http-client.js';

export class PollingTransport implements Transport {
  private readonly httpClient: HttpClient;
  private readonly pollingIntervalMs: number;
  private readonly logger: Logger | undefined;

  private callbacks: TransportCallbacks | null = null;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private _status: TransportStatus = 'disconnected';
  private lastPayloadHash = '';
  private stopped = true;

  constructor(httpClient: HttpClient, config: TransportConfig) {
    this.httpClient = httpClient;
    this.pollingIntervalMs = config.pollingIntervalMs;
    this.logger = config.logger;
  }

  get status(): TransportStatus {
    return this._status;
  }

  /**
   * Start polling:
   * 1. Fetch initial data immediately
   * 2. Set up interval for recurring polls
   */
  start(callbacks: TransportCallbacks): void {
    this.callbacks = callbacks;
    this.stopped = false;
    this.setStatus('connecting');

    // Initial fetch, then start interval regardless of success/failure
    this.poll().finally(() => {
      if (this.stopped) return;
      this.startInterval();
    });
  }

  /** Stop polling and clean up. */
  stop(): void {
    this.stopped = true;
    if (this.pollTimer !== null) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    this.setStatus('disconnected');
  }

  // ---------------------------------------------------------------------------
  // Internal
  // ---------------------------------------------------------------------------

  private startInterval(): void {
    this.pollTimer = setInterval(() => {
      this.poll();
    }, this.pollingIntervalMs);

    // Don't prevent process exit
    if (typeof this.pollTimer === 'object' && 'unref' in this.pollTimer) {
      this.pollTimer.unref();
    }
  }

  /** Perform a single poll: fetch, compare hash, deliver if changed. */
  private async poll(): Promise<void> {
    try {
      const data = await this.httpClient.fetchFlags();
      if (this.stopped) return;

      const hash = this.hashPayload(data.flags, data.segments);

      if (hash !== this.lastPayloadHash) {
        this.lastPayloadHash = hash;
        this.callbacks?.onData(data.flags, data.segments);
        this.logger?.debug('Polling detected flag/segment changes');
      } else {
        this.logger?.debug('Polling: no changes detected');
      }

      if (this._status !== 'connected') {
        this.setStatus('connected');
      }
    } catch (err) {
      if (this.stopped) return;
      this.logger?.error('Polling error');
      this.callbacks?.onError(
        err instanceof Error ? err : new Error(String(err)),
      );
      this.setStatus('error');
      // Do NOT stop polling on error — next interval will retry
    }
  }

  /**
   * Compute a djb2 hash of the payload for change detection.
   * Not cryptographic — just fast equality comparison.
   */
  private hashPayload(
    flags: Record<string, unknown>,
    segments: Record<string, unknown>,
  ): string {
    const str = JSON.stringify({ flags, segments });
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) + hash + str.charCodeAt(i)) & 0xffffffff;
    }
    return hash.toString(36);
  }

  private setStatus(status: TransportStatus): void {
    if (this._status === status) return;
    this._status = status;
    this.callbacks?.onStatusChange(status);
  }
}
