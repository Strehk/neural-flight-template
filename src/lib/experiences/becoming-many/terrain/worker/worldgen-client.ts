// ── Becoming Many — WorldGen Worker Client ─────────────────────
//
// A single-worker client for the worldgen worker (NOT a pool — one long-lived
// worker keeps the region LRU cache warm). Same build()/dispose() shape as
// TerrainWorkerPool so TerrainWorld can treat the two transports alike. The
// ChunkScheduler handles cancellation of stale results, so this stays minimal.

import type { TerrainConfig } from "../provider";
// Vite '?worker' import — bundles worldgen.worker.ts (the whole CPU pipeline).
import WorldgenWorker from "./worldgen.worker?worker";
import type { WorldgenBuildResult, WorldgenOutbound } from "./worldgen-protocol";

interface Pending {
	resolve: (r: WorldgenBuildResult) => void;
	reject: (e: Error) => void;
}

export class WorldgenClient {
	private readonly worker: Worker;
	private readonly pending = new Map<number, Pending>();
	private nextId = 1;
	private disposed = false;

	constructor() {
		this.worker = new WorldgenWorker();
		this.worker.onmessage = (e: MessageEvent<WorldgenOutbound>) => this.handle(e.data);
		this.worker.onerror = (e: ErrorEvent) => this.handleError(e);
	}

	build(
		cfg: TerrainConfig,
		gridX: number,
		gridZ: number,
		chunkSize: number,
		segments: number,
		params?: Record<string, number>,
	): Promise<WorldgenBuildResult> {
		if (this.disposed) return Promise.reject(new Error("WorldgenClient: disposed"));
		const id = this.nextId++;
		return new Promise<WorldgenBuildResult>((resolve, reject) => {
			this.pending.set(id, { resolve, reject });
			this.worker.postMessage({
				type: "build",
				id,
				cfg,
				params,
				gridX,
				gridZ,
				chunkSize,
				segments,
			});
		});
	}

	dispose(): void {
		if (this.disposed) return;
		this.disposed = true;
		for (const p of this.pending.values()) p.reject(new Error("WorldgenClient: disposed"));
		this.pending.clear();
		this.worker.terminate();
	}

	private handle(msg: WorldgenOutbound): void {
		const p = this.pending.get(msg.id);
		if (!p) return;
		this.pending.delete(msg.id);
		if (msg.type === "error") {
			console.error("[worldgen] build failed:", msg.message);
			p.reject(new Error(msg.message));
		} else p.resolve(msg);
	}

	private handleError(e: ErrorEvent): void {
		console.error("[worldgen] worker crashed:", e.message, e.filename, e.lineno);
		const err = new Error(`WorldgenWorker error: ${e.message}`);
		for (const p of this.pending.values()) p.reject(err);
		this.pending.clear();
	}
}
