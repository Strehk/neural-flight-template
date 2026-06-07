/**
 * Worldgen worker pool. Spawns `min(navigator.hardwareConcurrency - 1, 4)`
 * Web Workers and distributes chunk-build requests round-robin. Each
 * worker holds its own NoiseStack + TerrainSampler so the only shared
 * state is the init config + a monotonically increasing generation
 * counter used to drop in-flight results after a config change.
 */

import type { TerrainBiomeId } from "$lib/worldgen/terrain/biome-types";
import type {
  WorldConfig,
} from "$lib/worldgen/terrain/world-config";
import type { DecorationDataSettings } from "$lib/worldgen/vegetation/decoration-data";
import type {
  RGBLike,
  TerrainDayPalette,
  TerrainEchoPalette,
} from "$lib/worldgen/terrain/derived-field-sampler";
import type {
  WorkerBuildMessage,
  WorkerBuiltMessage,
  WorkerInitMessage,
  WorkerOutboundMessage,
  WorkerUpdateConfigMessage,
} from "./protocol";

// Vite '?worker' import — see https://vitejs.dev/guide/features.html#web-workers
import WorldgenWorker from "./worldgen.worker?worker";

export interface WorldgenWorkerPoolOptions {
  worldConfig: WorldConfig;
  biomeOverride: TerrainBiomeId | null;
  chunkSize: number;
  segments: number;
  acousticFieldEnabled: boolean;
  acousticFieldGridStep: number;
  decorationSettings: DecorationDataSettings;
  echoPalette: TerrainEchoPalette;
  dayPalette: TerrainDayPalette;
  /** Override worker count (testing). Defaults to clamp(hwc - 1, 1, 4). */
  workerCount?: number;
}

interface PendingRequest {
  id: number;
  generation: number;
  gridX: number;
  gridZ: number;
  /** Index into `this.workers` the request was dispatched to. */
  workerIndex: number;
  resolve: (msg: WorkerBuiltMessage) => void;
  reject: (err: Error) => void;
  cancelled: boolean;
}

export class WorldgenWorkerPool {
  private readonly workers: Worker[];
  private readonly pending = new Map<number, PendingRequest>();
  private nextId = 1;
  private nextWorker = 0;
  private generation = 0;
  private disposed = false;
  /**
   * The init message in its current form. Mutated by `updateConfig` so a
   * replacement worker (spun up by `handleWorkerError`) boots into the
   * same config as its peers without replaying every patch.
   */
  private lastInit: WorkerInitMessage;

  constructor(opts: WorldgenWorkerPoolOptions) {
    const desired = opts.workerCount ?? defaultWorkerCount();
    this.workers = [];
    for (let i = 0; i < desired; i++) {
      const w = new WorldgenWorker();
      const workerIndex = i;
      w.onmessage = (e: MessageEvent<WorkerOutboundMessage>) =>
        this.handleMessage(e.data);
      w.onerror = (e: ErrorEvent) => this.handleWorkerError(workerIndex, e);
      this.workers.push(w);
    }
    this.lastInit = {
      type: "init",
      worldConfig: opts.worldConfig,
      biomeOverride: opts.biomeOverride,
      chunkSize: opts.chunkSize,
      segments: opts.segments,
      acousticFieldEnabled: opts.acousticFieldEnabled,
      acousticFieldGridStep: opts.acousticFieldGridStep,
      decorationSettings: opts.decorationSettings,
      echoPalette: rgbPalette(opts.echoPalette),
      dayPalette:  rgbPalette(opts.dayPalette),
    };
    for (const w of this.workers) {
      w.postMessage(this.lastInit);
    }
  }

  get size(): number {
    return this.workers.length;
  }

  /**
   * Push a chunk-build request to the next worker. Returns a promise
   * that resolves with the worker's built payload, or rejects if the
   * request is cancelled (e.g. by `updateConfig`) or the worker errors.
   */
  build(gridX: number, gridZ: number): Promise<WorkerBuiltMessage> {
    if (this.disposed) {
      return Promise.reject(new Error("WorldgenWorkerPool: disposed"));
    }
    const id = this.nextId++;
    const generation = this.generation;
    const workerIndex = this.nextWorker;
    const worker = this.workers[workerIndex];
    this.nextWorker = (this.nextWorker + 1) % this.workers.length;
    return new Promise<WorkerBuiltMessage>((resolve, reject) => {
      this.pending.set(id, {
        id, generation, gridX, gridZ, workerIndex, resolve, reject, cancelled: false,
      });
      const msg: WorkerBuildMessage = { type: "build", id, generation, gridX, gridZ };
      worker.postMessage(msg);
    });
  }

  /**
   * Broadcast a config patch to every worker and bump the generation.
   * In-flight requests started under the previous generation are
   * marked cancelled — their resolutions arrive but are dropped.
   */
  updateConfig(patch: {
    worldConfigPatch?: Partial<WorldConfig>;
    biomeOverride?: TerrainBiomeId | null;
    decorationSettings?: DecorationDataSettings;
  }): void {
    if (this.disposed) return;
    this.generation += 1;
    for (const req of this.pending.values()) {
      req.cancelled = true;
      req.reject(new Error("WorldgenWorkerPool: request cancelled by config change"));
    }
    this.pending.clear();
    // Fold the patch into lastInit so a replacement worker boots into
    // the current state.
    if (patch.worldConfigPatch) {
      this.lastInit = {
        ...this.lastInit,
        worldConfig: { ...this.lastInit.worldConfig, ...patch.worldConfigPatch },
      };
    }
    if (patch.biomeOverride !== undefined) {
      this.lastInit = { ...this.lastInit, biomeOverride: patch.biomeOverride };
    }
    if (patch.decorationSettings) {
      this.lastInit = { ...this.lastInit, decorationSettings: patch.decorationSettings };
    }
    const msg: WorkerUpdateConfigMessage = {
      type: "updateConfig",
      ...patch,
      generation: this.generation,
    };
    for (const w of this.workers) {
      w.postMessage(msg);
    }
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const req of this.pending.values()) {
      req.cancelled = true;
      req.reject(new Error("WorldgenWorkerPool: disposed"));
    }
    this.pending.clear();
    for (const w of this.workers) {
      w.terminate();
    }
    this.workers.length = 0;
  }

  private handleMessage(msg: WorkerOutboundMessage): void {
    if (msg.type === "error") {
      const req = this.pending.get(msg.id);
      if (!req) return;
      this.pending.delete(msg.id);
      if (!req.cancelled) req.reject(new Error(msg.message));
      return;
    }
    const req = this.pending.get(msg.id);
    if (!req) return;
    this.pending.delete(msg.id);
    if (req.cancelled || msg.generation !== this.generation) {
      // Stale result — caller will (or already did) get a rejection via
      // the cancellation path; nothing else to do.
      return;
    }
    req.resolve(msg);
  }

  private handleWorkerError(workerIndex: number, e: ErrorEvent): void {
    if (this.disposed) return;
    // Reject only the requests that were dispatched to this worker.
    // Other workers in the pool are still healthy; their builds keep
    // resolving normally.
    const err = new Error(`WorldgenWorker[${workerIndex}] error: ${e.message}`);
    for (const [id, req] of this.pending) {
      if (req.workerIndex !== workerIndex) continue;
      this.pending.delete(id);
      if (!req.cancelled) req.reject(err);
    }
    // Replace the dead worker with a fresh one so future round-robin
    // dispatches don't fire into a corpse. Re-broadcast the latest init
    // so the replacement is at parity with its peers.
    const old = this.workers[workerIndex];
    if (old) {
      try { old.terminate(); } catch { /* already dead */ }
    }
    const replacement = new WorldgenWorker();
    replacement.onmessage = (ev: MessageEvent<WorkerOutboundMessage>) =>
      this.handleMessage(ev.data);
    replacement.onerror = (ev: ErrorEvent) => this.handleWorkerError(workerIndex, ev);
    this.workers[workerIndex] = replacement;
    // `lastInit` is kept current by `updateConfig` so the replacement
    // boots straight into the active config — no follow-up patch needed.
    // The pool stamps each build with the current generation; the worker
    // just echoes that stamp back, so its own internal generation never
    // needs to be in sync.
    replacement.postMessage(this.lastInit);
  }
}

/**
 * Convert a THREE.Color-backed palette into plain `{r,g,b}` so it
 * structured-clones cleanly across the worker boundary.
 */
function rgbPalette<K extends string>(palette: Record<K, RGBLike>): Record<K, RGBLike> {
  const out = {} as Record<K, RGBLike>;
  for (const key of Object.keys(palette) as K[]) {
    const c = palette[key];
    out[key] = { r: c.r, g: c.g, b: c.b };
  }
  return out;
}

function defaultWorkerCount(): number {
  const hwc = typeof navigator !== "undefined" ? (navigator.hardwareConcurrency ?? 4) : 4;
  return Math.max(1, Math.min(4, hwc - 1));
}
