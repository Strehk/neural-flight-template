/**
 * ChunkScheduler — generic anchor-tracked, dual-radius chunk loader
 * with hysteresis. Replaces `BatWorld.ensureChunks` (world.ts:610–646)
 * with a reusable streaming primitive that any future grid-tiled
 * world can adopt.
 *
 * Refactor step 7. The plan calls for three behaviours:
 *
 * 1. **Anchor decoupled from the player.** The anchor is a discrete
 *    chunk cell that only advances when the player has moved
 *    `anchorStepCells` cells away from it. Set to 1 (default) the
 *    anchor tracks the player; set to ≥2 the player can wobble
 *    around the boundary without triggering work.
 *
 * 2. **Build vs. keep radii.** A chunk is built (and uploaded to the
 *    scene by the caller's `buildChunk` factory) when it enters the
 *    build set. It's only disposed when it leaves the *keep* set — a
 *    Chebyshev ring one cell wider by default. The result is no
 *    rebuild thrash when the player oscillates near a boundary.
 *
 * 3. **Frame budget.** Each `update()` call builds at most
 *    `maxBuildsPerFrame` chunks. Missing cells are queued nearest-to-
 *    anchor first so the world fills in as a growing disk rather than
 *    a random scatter. Initial load takes ⌈cellsInBuildSet /
 *    budget⌉ frames.
 *
 * Determinism: the scheduler holds no world state itself — chunks are
 * produced by the caller-supplied `buildChunk` factory and disposed
 * via their own `dispose()` method. Construction order doesn't affect
 * which cells become active for a given anchor.
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
  /** Build a chunk for the given grid cell. Caller does scene attach. */
  buildChunk: (gridX: number, gridZ: number) => T;
  /** Fired immediately after `buildChunk` returns. */
  onChunkBuilt?: (chunk: T) => void;
  /** Fired immediately after a chunk's `dispose()`; caller does scene detach. */
  onChunkDisposed?: (chunk: T) => void;
}

export interface SchedulerStats {
  /** Active chunks after this tick. */
  active: number;
  /** Chunks built this tick (≤ maxBuildsPerFrame). */
  built: number;
  /** Chunks disposed this tick. */
  disposed: number;
  /** Chunks still inside the build set but deferred to a later frame. */
  pending: number;
}

export class ChunkScheduler<T extends ChunkLike> {
  readonly config: StreamingConfig;

  private readonly buildChunk: (gx: number, gz: number) => T;
  private readonly onBuilt?: (chunk: T) => void;
  private readonly onDisposed?: (chunk: T) => void;

  /** Active chunks keyed by `"gx,gz"`. Map preserves insertion order. */
  private readonly active = new Map<string, T>();
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

  /** Active chunks, in insertion order (matches the legacy `active.values()`). */
  chunks(): IterableIterator<T> {
    return this.active.values();
  }

  get size(): number {
    return this.active.size;
  }

  /**
   * Resolve the active chunk that owns world coords `(x, z)`, or
   * `undefined` if it's outside the loaded set. O(1) — keyed off
   * the same `"gx,gz"` string the scheduler uses internally.
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
   * One streaming tick. Advances the anchor if the player has moved
   * far enough, disposes chunks outside the keep set, builds missing
   * chunks inside the build set up to the per-frame budget.
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

    const build = this.config.buildRadius;
    const budget = this.config.maxBuildsPerFrame;
    let built = 0;
    let pending = 0;

    // Iterate Chebyshev rings outward (0 = anchor cell, 1 = 8 cells, …) so
    // nearest-to-anchor builds first when the budget is tight.
    rings: for (let radius = 0; radius <= build; radius++) {
      for (let dx = -radius; dx <= radius; dx++) {
        for (let dz = -radius; dz <= radius; dz++) {
          // Only emit cells exactly on this ring; skip the interior.
          if (Math.max(Math.abs(dx), Math.abs(dz)) !== radius) continue;

          const gx = this.anchorX + dx;
          const gz = this.anchorZ + dz;
          const key = `${gx},${gz}`;
          if (this.active.has(key)) continue;

          if (built >= budget) {
            pending++;
            continue;
          }
          const chunk = this.buildChunk(gx, gz);
          this.active.set(key, chunk);
          this.onBuilt?.(chunk);
          built++;
          this.builtLifetime++;
        }
      }
      if (built >= budget) {
        // Don't break — we still want to count `pending` for outer rings.
        // (Falls through; the inner `built >= budget` check skips builds.)
        continue rings;
      }
    }

    return {
      active: this.active.size,
      built,
      disposed,
      pending,
    };
  }

  /**
   * Dispose every active chunk + drop the anchor. The next `update()`
   * call re-plants the anchor at the player's position and starts
   * filling the build set from scratch (over multiple frames if
   * `maxBuildsPerFrame < buildSetSize`).
   */
  clearAll(): void {
    for (const chunk of this.active.values()) {
      chunk.dispose();
      this.onDisposed?.(chunk);
      this.disposedLifetime++;
    }
    this.active.clear();
    this.anchorX = Number.NaN;
    this.anchorZ = Number.NaN;
  }

  /**
   * Reset the lifetime counters. Useful at the start of a regression
   * test that measures churn in response to deliberate player motion.
   */
  resetCounters(): void {
    this.builtLifetime = 0;
    this.disposedLifetime = 0;
  }
}
