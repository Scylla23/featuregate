import type {
  Transport,
  TransportCallbacks,
  TransportConfig,
  TransportStatus,
  Logger,
  Flag,
  Segment,
} from '../types.js';
import { HttpClient } from '../http-client.js';

const INITIAL_RECONNECT_MS = 1000;
const MAX_RECONNECT_MS = 30_000;
const BACKOFF_MULTIPLIER = 2;

export class SseTransport implements Transport {
  private readonly httpClient: HttpClient;
  private readonly logger: Logger | undefined;

  private callbacks: TransportCallbacks | null = null;
  private abortController: AbortController | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectDelayMs = INITIAL_RECONNECT_MS;
  private _status: TransportStatus = 'disconnected';
  private stopped = true;

  constructor(httpClient: HttpClient, config: TransportConfig) {
    this.httpClient = httpClient;
    this.logger = config.logger;
  }

  get status(): TransportStatus {
    return this._status;
  }

  /**
   * Start the SSE transport:
   * 1. Fetch initial flags/segments via HTTP
   * 2. Deliver via callbacks.onData()
   * 3. Open SSE stream for real-time updates
   */
  start(callbacks: TransportCallbacks): void {
    this.callbacks = callbacks;
    this.stopped = false;
    this.setStatus('connecting');

    this.initialize().catch((err) => {
      if (this.stopped) return;
      const error = err instanceof Error ? err : new Error(String(err));
      this.callbacks?.onError(error);
      this.setStatus('error');
      this.scheduleReconnect();
    });
  }

  /** Stop the transport, abort active stream, cancel reconnection. */
  stop(): void {
    this.stopped = true;
    this.abortController?.abort();
    this.abortController = null;

    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.setStatus('disconnected');
  }

  // ---------------------------------------------------------------------------
  // Internal
  // ---------------------------------------------------------------------------

  private async initialize(): Promise<void> {
    // Step 1: Fetch full payload
    const data = await this.httpClient.fetchFlags();
    if (this.stopped) return;
    this.callbacks!.onData(data.flags, data.segments);

    // Step 2: Open SSE stream
    await this.connectStream();
  }

  private async connectStream(): Promise<void> {
    this.abortController = new AbortController();

    const response = await this.httpClient.openStream(this.abortController.signal);
    if (this.stopped) return;

    if (!response.body) {
      throw new Error('SSE response has no body');
    }

    this.setStatus('connected');
    this.resetBackoff();

    try {
      await this.readStream(response.body);
    } catch (err) {
      if (this.stopped) return;
      throw err;
    }

    // Stream ended naturally (server closed). Reconnect unless stopped.
    if (!this.stopped) {
      this.logger?.info('SSE stream ended, reconnecting...');
      this.setStatus('connecting');
      this.scheduleReconnect();
    }
  }

  /**
   * Read the SSE stream line-by-line and dispatch parsed events.
   * SSE protocol: lines of "field: value", events separated by blank lines.
   */
  private async readStream(body: ReadableStream<Uint8Array>): Promise<void> {
    const reader = body.getReader();
    const decoder = new TextDecoder();

    let buffer = '';
    let currentEvent = '';
    let currentData = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
          const line = buffer.slice(0, newlineIndex).replace(/\r$/, '');
          buffer = buffer.slice(newlineIndex + 1);

          if (line === '') {
            // Blank line = end of event
            if (currentEvent && currentData) {
              this.dispatchEvent(currentEvent, currentData);
            }
            currentEvent = '';
            currentData = '';
          } else if (line.startsWith('event:')) {
            currentEvent = line.slice(6).trim();
          } else if (line.startsWith('data:')) {
            const dataValue = line.slice(5).trim();
            currentData = currentData ? currentData + '\n' + dataValue : dataValue;
          }
          // Ignore id:, retry:, and comment lines (starting with :)
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Dispatch a parsed SSE event.
   * Handles double-stringification from the server:
   *   publisher.ts: { key, flag: JSON.stringify(flagObj) }
   *   stream.ts:    data: JSON.stringify(above)
   */
  private dispatchEvent(eventType: string, rawData: string): void {
    if (!this.callbacks) return;

    try {
      if (eventType === 'heartbeat') {
        this.logger?.debug('SSE heartbeat received');
        this.resetBackoff();
        return;
      }

      if (eventType === 'flag.updated') {
        const outer = JSON.parse(rawData) as { key: string; flag: string };
        const flag = JSON.parse(outer.flag) as Flag;
        this.callbacks.onIncrement('flag.updated', outer.key, flag);
        this.logger?.debug(`SSE flag updated: ${outer.key}`);
        return;
      }

      if (eventType === 'segment.updated') {
        const outer = JSON.parse(rawData) as { key: string; segment: string };
        const segment = JSON.parse(outer.segment) as Segment;
        this.callbacks.onIncrement('segment.updated', outer.key, segment);
        this.logger?.debug(`SSE segment updated: ${outer.key}`);
        return;
      }

      this.logger?.warn(`Unknown SSE event type: ${eventType}`);
    } catch (err) {
      this.logger?.error(`Failed to parse SSE event: ${eventType}`);
      this.callbacks.onError(
        err instanceof Error ? err : new Error(`SSE parse error: ${String(err)}`),
      );
    }
  }

  private scheduleReconnect(): void {
    if (this.stopped || this.reconnectTimer !== null) return;

    const delay = this.reconnectDelayMs;
    this.reconnectDelayMs = Math.min(
      this.reconnectDelayMs * BACKOFF_MULTIPLIER,
      MAX_RECONNECT_MS,
    );

    this.logger?.info(`SSE reconnecting in ${delay}ms`);

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (this.stopped) return;

      this.connectStream().catch((err) => {
        if (this.stopped) return;
        this.logger?.error('SSE reconnection failed');
        this.callbacks?.onError(
          err instanceof Error ? err : new Error(String(err)),
        );
        this.setStatus('error');
        this.scheduleReconnect();
      });
    }, delay);

    // Don't prevent process exit
    if (typeof this.reconnectTimer === 'object' && 'unref' in this.reconnectTimer) {
      this.reconnectTimer.unref();
    }
  }

  private resetBackoff(): void {
    this.reconnectDelayMs = INITIAL_RECONNECT_MS;
  }

  private setStatus(status: TransportStatus): void {
    if (this._status === status) return;
    this._status = status;
    this.callbacks?.onStatusChange(status);
  }
}
