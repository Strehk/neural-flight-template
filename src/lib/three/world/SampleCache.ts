/**
 * SampleCache — small generic LRU keyed by quantised (x, z) world
 * coordinates. Used by `TerrainSampler` to amortise the cost of the FBM
 * stack across the multiple consumers that query the same terrain point
 * each frame (player altitude, echo hits, chemosense hotspots,
 * sense-switch lookahead, chunk vertex seams).
 *
 * Quantisation: keys are `floor(x / quant) , floor(z / quant)` strings.
 * Default `quant = 2.0` matches the plan and is finer than the legacy
 * terrain mesh resolution (≈2.8 m per triangle at the default
 * chunkSize=112 / segments=40), so the visual quantisation is bounded
 * by what the mesh already snaps to.
 *
 * Determinism: the cache only memoises pure functions, so eviction at
 * any time is observationally identical to a cold cache. This is the
 * core of the GC-safety property promised in step 5's determinism
 * contract.
 */

export interface SampleCacheOptions {
  /** Maximum number of entries before LRU eviction kicks in. */
  maxSize: number;
  /** Side length of the quantisation cell in world units. */
  quantization: number;
}

export class SampleCache<T> {
  readonly maxSize: number;
  readonly quantization: number;

  /**
   * Map is iterated in insertion order; we use `delete + set` on every
   * access to move an entry to the "newest" end, and evict from the
   * iterator's first entry when overflowing. Classic O(1) LRU.
   */
  private readonly map = new Map<string, T>();

  constructor(options: SampleCacheOptions) {
    this.maxSize = options.maxSize;
    this.quantization = options.quantization;
  }

  /** Current entry count. Useful for perf instrumentation. */
  get size(): number {
    return this.map.size;
  }

  /** Compose the cache key from raw world coords. */
  private keyOf(x: number, z: number): string {
    const qx = Math.floor(x / this.quantization);
    const qz = Math.floor(z / this.quantization);
    return `${qx},${qz}`;
  }

  /** Look up; returns `undefined` on miss. Touches the entry to mark it newest on hit. */
  get(x: number, z: number): T | undefined {
    const key = this.keyOf(x, z);
    const value = this.map.get(key);
    if (value === undefined) return undefined;
    // Touch — move to newest position.
    this.map.delete(key);
    this.map.set(key, value);
    return value;
  }

  /** Store the value for the cell containing (x, z), evicting the oldest entry if needed. */
  set(x: number, z: number, value: T): T {
    const key = this.keyOf(x, z);
    if (this.map.has(key)) this.map.delete(key);
    this.map.set(key, value);
    if (this.map.size > this.maxSize) {
      const oldest = this.map.keys().next().value;
      if (oldest !== undefined) this.map.delete(oldest);
    }
    return value;
  }

  /** Empty the cache. Call after config changes that would change samples. */
  clear(): void {
    this.map.clear();
  }
}
