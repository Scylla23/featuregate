import type { HttpClientConfig, SdkFlagsResponse, Logger } from './types.js';

const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 1000;
const BACKOFF_MULTIPLIER = 2;

/** HTTP status codes that should not be retried (permanent failures). */
const NON_RETRYABLE_STATUSES = new Set([400, 401, 403, 404, 422]);

export class HttpError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly retryable: boolean,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export class HttpClient {
  private readonly baseUrl: string;
  private readonly sdkKey: string;
  private readonly timeoutMs: number;
  private readonly logger: Logger | undefined;

  constructor(config: HttpClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/+$/, '');
    this.sdkKey = config.sdkKey;
    this.timeoutMs = config.timeoutMs;
    this.logger = config.logger;
  }

  /**
   * Fetch all flags and segments for the configured SDK key.
   * Retries up to 3 times on 5xx or network errors with exponential backoff.
   */
  async fetchFlags(): Promise<SdkFlagsResponse> {
    const url = `${this.baseUrl}/api/v1/sdk/flags`;
    const response = await this.fetchWithRetry(url);
    return (await response.json()) as SdkFlagsResponse;
  }

  /**
   * Open a streaming fetch connection to the SSE endpoint.
   * Does NOT retry — the SSE transport handles reconnection.
   */
  async openStream(signal?: AbortSignal): Promise<Response> {
    const url = `${this.baseUrl}/api/v1/sdk/stream`;
    const response = await this.fetchWithTimeout(url, {
      headers: {
        'X-API-Key': this.sdkKey,
        'Accept': 'text/event-stream',
      },
      signal,
    });

    if (!response.ok) {
      throw new HttpError(
        `SSE stream request failed: ${response.status} ${response.statusText}`,
        response.status,
        response.status >= 500,
      );
    }

    return response;
  }

  // ---------------------------------------------------------------------------
  // Internal
  // ---------------------------------------------------------------------------

  private async fetchWithTimeout(
    url: string,
    init?: RequestInit,
  ): Promise<Response> {
    const timeoutSignal = AbortSignal.timeout(this.timeoutMs);

    // Combine timeout signal with any caller-provided signal
    let signal: AbortSignal;
    if (init?.signal) {
      signal = AbortSignal.any([timeoutSignal, init.signal]);
    } else {
      signal = timeoutSignal;
    }

    return fetch(url, { ...init, signal });
  }

  private async fetchWithRetry(
    url: string,
    attempt = 0,
  ): Promise<Response> {
    try {
      const response = await this.fetchWithTimeout(url, {
        headers: {
          'X-API-Key': this.sdkKey,
          'Accept': 'application/json',
        },
      });

      if (response.ok) {
        return response;
      }

      if (NON_RETRYABLE_STATUSES.has(response.status)) {
        throw new HttpError(
          `Request failed: ${response.status} ${response.statusText}`,
          response.status,
          false,
        );
      }

      // 5xx — retryable
      if (attempt < MAX_RETRIES - 1) {
        const delay = INITIAL_BACKOFF_MS * BACKOFF_MULTIPLIER ** attempt;
        this.logger?.warn(
          `Request to ${url} failed with ${response.status}, retrying in ${delay}ms (attempt ${attempt + 1}/${MAX_RETRIES})`,
        );
        await this.sleep(delay);
        return this.fetchWithRetry(url, attempt + 1);
      }

      throw new HttpError(
        `Request failed after ${MAX_RETRIES} attempts: ${response.status} ${response.statusText}`,
        response.status,
        true,
      );
    } catch (err) {
      if (err instanceof HttpError) throw err;

      // Network error or abort — retry if attempts remain
      if (attempt < MAX_RETRIES - 1) {
        const delay = INITIAL_BACKOFF_MS * BACKOFF_MULTIPLIER ** attempt;
        this.logger?.warn(
          `Request to ${url} failed with network error, retrying in ${delay}ms (attempt ${attempt + 1}/${MAX_RETRIES})`,
        );
        await this.sleep(delay);
        return this.fetchWithRetry(url, attempt + 1);
      }

      throw err;
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
