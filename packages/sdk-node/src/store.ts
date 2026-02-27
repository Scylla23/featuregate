import type { Flag, Segment } from '@featuregate/evaluator';

/**
 * In-memory store for flag and segment definitions.
 *
 * Designed to be passed directly to the evaluator:
 *   evaluate(flag, context, store.getSegmentsMap())
 *
 * Thread-safety note: Node.js is single-threaded, so Map mutations
 * are inherently atomic from the caller's perspective.
 */
export class FlagStore {
  private flags: Map<string, Flag> = new Map();
  private segments: Map<string, Segment> = new Map();
  private initialized = false;

  // ---------------------------------------------------------------------------
  // Queries
  // ---------------------------------------------------------------------------

  /** Get a single flag by key, or undefined if not found. */
  getFlag(key: string): Flag | undefined {
    return this.flags.get(key);
  }

  /** Get a single segment by key, or undefined if not found. */
  getSegment(key: string): Segment | undefined {
    return this.segments.get(key);
  }

  /** Get a shallow copy of all flags as a Map. */
  getAllFlags(): Map<string, Flag> {
    return new Map(this.flags);
  }

  /**
   * Get the segments Map by reference.
   *
   * This is the Map that should be passed directly to the evaluator's
   * `evaluate()` function as its third argument.
   */
  getSegmentsMap(): Map<string, Segment> {
    return this.segments;
  }

  /** Get a shallow copy of all segments as a Map. */
  getAllSegments(): Map<string, Segment> {
    return new Map(this.segments);
  }

  /** Whether the store has received its initial data load. */
  isInitialized(): boolean {
    return this.initialized;
  }

  // ---------------------------------------------------------------------------
  // Bulk operations
  // ---------------------------------------------------------------------------

  /**
   * Replace all flags and segments atomically.
   *
   * Called after fetching `GET /api/v1/sdk/flags` which returns:
   *   { flags: Record<string, Flag>, segments: Record<string, Segment> }
   */
  replaceAll(
    flags: Record<string, Flag>,
    segments: Record<string, Segment>,
  ): void {
    this.flags = new Map(Object.entries(flags));
    this.segments = new Map(Object.entries(segments));
    this.initialized = true;
  }

  // ---------------------------------------------------------------------------
  // Incremental updates (SSE)
  // ---------------------------------------------------------------------------

  /** Insert or update a single flag definition. */
  upsertFlag(key: string, flag: Flag): void {
    this.flags.set(key, flag);
  }

  /** Insert or update a single segment definition. */
  upsertSegment(key: string, segment: Segment): void {
    this.segments.set(key, segment);
  }

  /** Remove a flag from the store. Returns true if the flag existed. */
  removeFlag(key: string): boolean {
    return this.flags.delete(key);
  }

  /** Remove a segment from the store. Returns true if the segment existed. */
  removeSegment(key: string): boolean {
    return this.segments.delete(key);
  }
}
