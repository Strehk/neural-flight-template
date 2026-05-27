/**
 * ChunkScheduler — generic anchor-tracked, dual-radius chunk loader
 * with hysteresis. Supports both synchronous and asynchronous chunk
 * factories.
 *
 * Behaviour:
 *
 * 1. **Anchor decoupled from the player.** The anchor is a discrete
 *    chunk cell that only advances when the player has moved
 *    `anchorStepCells` cells away from it. Set to 1 the anchor tracks
 *    the player; set to ≥2 the player can wobble around the boundary
 *    without triggering work.
 *
 * 2. **Build vs. keep radii.** A chunk is built (and uploaded by the
 *    caller's `buildChunk` factory) when it enters the build set. It's
 *    only disposed when it leaves the *keep* set — a Chebyshev ring one
 *    cell wider by default.
 *
 * 3. **Frame budget.** Each `update()` call **initiates** at most
 *    `maxBuildsPerFrame` builds. When `buildChunk` returns a Promise,
 *    the chunk is tracked as in-flight; when it resolves, the chunk
 *    enters the active set (unless its cell drifted outside the keep
 *    radius or the request was cancelled by `clearAll`, in which case
 *    the chunk is disposed immediately).
 *
 * Cancellation: the scheduler can't abort a worker that's already
 * running, but it can drop the result. `clearAll()` marks every
 * in-flight request cancelled and disposes resolved results inline.
 */

import type { StreamingConfig } from "$lib/experiences/sinneswandler_test1/world-config";

/** Minimal contract any chunk type must satisfy to plug into the scheduler. */
export interface ChunkLike {
  readonly gridX: number;
  readonly gridZ: number;
  dispose(): void;
}

export interface ChunkSchedulerOptions<T extends ChunkLike> {
  config: StreamingConfig;
  /**
   * Build a chunk for the given grid cell. May return synchronously
   * (legacy path) or a Promise (worker pool). Scene attachment is the
   * caller's responsibility on resolve.
   */
  buildChunk: (gridX: number, gridZ: number) => T | Promise<T>;
  /** Fired immediately after a chunk enters the active set. */
  onChunkBuilt?: (chunk: T) => void;
  /** Fired immediately after a chunk's `dispose()`; caller does scene detach. */
  onChunkDisposed?: (chunk: T) => void;
}

export interface SchedulerStats {
  /** Active chunks after this tick. */
  active: number;
  /** Builds initiated this tick (≤ maxBuildsPerFrame). */
  built: number;
  /** Chunks disposed this tick (does NOT include in-flight cancellations). */
  disposed: number;
  /** Chunks still inside the build set but deferred to a later frame. */
  pending: number;
  /** Builds still in flight (initiated, not yet resolved). */
  inFlight: number;
}

interface InFlightEntry {
  gridX: number;
  gridZ: number;
  generation: number;
  cancelled: boolean;
}

export class ChunkScheduler<T extends ChunkLike> {
  readonly config: StreamingConfig;

  private readonly buildChunk: (gx: number, gz: number) => T | Promise<T>;
  private readonly onBuilt?: (chunk: T) => void;
  private readonly onDisposed?: (chunk: T) => void;

  /** Active chunks keyed by `"gx,gz"`. Map preserves insertion order. */
  private readonly active = new Map<string, T>();
  /** Builds initiated but not yet resolved. Keyed by `"gx,gz"`. */
  private readonly inFlight = new Map<string, InFlightEntry>();
  /** Bumped on `clearAll` so resolved-after-clear chunks dispose themselves. */
  private generation = 0;

  /** `NaN` means "not yet anchored" — first `update()` plants the anchor. */
  private anchorX = Number.NaN;
  private anchorZ = Number.NaN;

  /** Lifetime counters — used by the rebuild-thrash regression check. */
  private builtLifetime = 0;
  private disposedLifetime = 0;

  constructor(opts: ChunkSchedulerOptions<T>) {
    this.config = opts.config;
    if (this.config.keepRadius < this.config.buildRadius) {
      throw new Error(
        `ChunkScheduler: keepRadius (${this.config.keepRadius}) must be ≥ buildRadius (${this.config.buildRadius}).`,
      );
    }
    this.buildChunk = opts.buildChunk;
    this.onBuilt = opts.onChunkBuilt;
    this.onDisposed = opts.onChunkDisposed;
  }

  /** Active chunks, in insertion order. */
  chunks(): IterableIterator<T> {
    return this.active.values();
  }

  get size(): number {
    return this.active.size;
  }

  /**
   * Resolve the active chunk that owns world coords `(x, z)`, or
   * `undefined` if it's outside the loaded set.
   */
  chunkAt(x: number, z: number): T | undefined {
    const gx = Math.floor(x / this.config.chunkSize);
    const gz = Math.floor(z / this.config.chunkSize);
    return this.active.get(`${gx},${gz}`);
  }

  /** Cumulative chunks built since construction (resets on `clearAll`). */
  get totalBuilt(): number {
    return this.builtLifetime;
  }

  /** Cumulative chunks disposed since construction. */
  get totalDisposed(): number {
    return this.disposedLifetime;
  }

  /** Current anchor cell, or `null` before the first `update()`. */
  getAnchor(): { x: number; z: number } | null {
    return Number.isFinite(this.anchorX)
      ? { x: this.anchorX, z: this.anchorZ }
      : null;
  }

  /**
   * One streaming tick. Advances the anchor, disposes chunks outside
   * the keep set, initiates builds for missing chunks inside the build
   * set up to the per-frame budget.
   */
  update(positionX: number, positionZ: number): SchedulerStats {
    const cs = this.config.chunkSize;
    const playerCellX = Math.floor(positionX / cs);
    const playerCellZ = Math.floor(positionZ / cs);

    if (!Number.isFinite(this.anchorX)) {
      this.anchorX = playerCellX;
      this.anchorZ = playerCellZ;
    } else {
      const dx = playerCellX - this.anchorX;
      const dz = playerCellZ - this.anchorZ;
      if (
        Math.abs(dx) >= this.config.anchorStepCells ||
        Math.abs(dz) >= this.config.anchorStepCells
      ) {
        this.anchorX = playerCellX;
        this.anchorZ = playerCellZ;
      }
    }

    const keep = this.config.keepRadius;
    let disposed = 0;
    for (const [key, chunk] of this.active) {
      const ddx = chunk.gridX - this.anchorX;
      const ddz = chunk.gridZ - this.anchorZ;
      if (Math.abs(ddx) > keep || Math.abs(ddz) > keep) {
        chunk.dispose();
        this.onDisposed?.(chunk);
        this.active.delete(key);
        disposed++;
        this.disposedLifetime++;
      }
    }

    // Cancel any in-flight cells that drifted outside the keep radius
    // while the worker was still building. The result will be disposed
    // on arrival.
    for (const entry of this.inFlight.values()) {
      if (entry.cancelled) continue;
      const ddx = entry.gridX - this.anchorX;
      const ddz = entry.gridZ - this.anchorZ;
      if (Math.abs(ddx) > keep || Math.abs(ddz) > keep) {
        entry.cancelled = true;
      }
    }

    const build = this.config.buildRadius;
    const budget = this.config.maxBuildsPerFrame;
    let built = 0;
    let pending = 0;

    // Iterate Chebyshev rings outward so nearest-to-anchor builds first
    // when the budget is tight.
    rings: for (let radius = 0; radius <= build; radius++) {
      for (let dx = -radius; dx <= radius; dx++) {
        for (let dz = -radius; dz <= radius; dz++) {
          if (Math.max(Math.abs(dx), Math.abs(dz)) !== radius) continue;

          const gx = this.anchorX + dx;
          const gz = this.anchorZ + dz;
          const key = `${gx},${gz}`;
          if (this.active.has(key) || this.inFlight.has(key)) continue;

          if (built >= budget) {
            pending++;
            continue;
          }
          this.initiateBuild(gx, gz, key);
          built++;
        }
      }
      if (built >= budget) {
        continue rings;
      }
    }

    return {
      active: this.active.size,
      built,
      disposed,
      pending,
      inFlight: this.inFlight.size,
    };
  }

  /**
   * Dispose every active chunk + cancel every in-flight build + drop
   * the anchor. The next `update()` re-plants the anchor at the
   * player's position and starts filling the build set from scratch.
   */
  clearAll(): void {
    this.generation += 1;
    for (const chunk of this.active.values()) {
      chunk.dispose();
      this.onDisposed?.(chunk);
      this.disposedLifetime++;
    }
    this.active.clear();
    for (const entry of this.inFlight.values()) {
      entry.cancelled = true;
    }
    // Don't clear inFlight — entries auto-clean when their promises
    // resolve into the disposal branch. Cancelling them ensures they
    // never reach the active set, which is the important guarantee.
    this.anchorX = Number.NaN;
    this.anchorZ = Number.NaN;
  }

  /** Reset the lifetime counters. */
  resetCounters(): void {
    this.builtLifetime = 0;
    this.disposedLifetime = 0;
  }

  private initiateBuild(gridX: number, gridZ: number, key: string): void {
    const entry: InFlightEntry = {
      gridX,
      gridZ,
      generation: this.generation,
      cancelled: false,
    };
    this.inFlight.set(key, entry);

    let result: T | Promise<T>;
    try {
      result = this.buildChunk(gridX, gridZ);
    } catch (err) {
      this.inFlight.delete(key);
      throw err;
    }

    if (isThenable(result)) {
      result.then(
        (chunk) => this.completeBuild(key, entry, chunk),
        // Build failure: drop the in-flight entry; the caller's
        // buildChunk promise has already rejected, no chunk to dispose.
        () => { this.inFlight.delete(key); },
      );
    } else {
      this.completeBuild(key, entry, result);
    }
  }

  private completeBuild(key: string, entry: InFlightEntry, chunk: T): void {
    this.inFlight.delete(key);
    if (entry.cancelled || entry.generation !== this.generation) {
      // Anchor moved (or clearAll was called) before this chunk
      // arrived. Dispose immediately; the scene was never updated.
      chunk.dispose();
      this.onDisposed?.(chunk);
      this.disposedLifetime++;
      return;
    }
    // Final keep-radius re-check — covers the case where the anchor
    // advanced after we marked the entry, but before resolution.
    const keep = this.config.keepRadius;
    const ddx = chunk.gridX - this.anchorX;
    const ddz = chunk.gridZ - this.anchorZ;
    if (Math.abs(ddx) > keep || Math.abs(ddz) > keep) {
      chunk.dispose();
      this.onDisposed?.(chunk);
      this.disposedLifetime++;
      return;
    }
    this.active.set(key, chunk);
    this.onBuilt?.(chunk);
    this.builtLifetime++;
  }
}

function isThenable<T>(value: T | Promise<T>): value is Promise<T> {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { then?: unknown }).then === "function"
  );
}
