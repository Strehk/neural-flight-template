// ── Becoming Many — Streaming Terrain World ────────────────────
//
// Owns the streamed chunked terrain: the generic ChunkScheduler (reused from
// src/lib/three/world), the generation transport, one shared sense material, a
// shared grid index, and the active TerrainProvider + config. Generation is
// CPU-in-worker (no GPU compute), so no per-chunk pipeline build → no streaming
// hitch.
//
// Two provider kinds, two transports:
//   - "pointwise" (sine/ridged): a round-robin TerrainWorkerPool runs the shared
//     grid loop over provider.height; the flight floor samples provider.height.
//   - "chunk" (worldgen): a single dedicated WorldgenClient runs the whole
//     region/WFC/hydrology pipeline (its region cache stays warm); the flight
//     floor samples each built chunk's height grid via a ChunkHeightCache.
//
// Modularity payoff:
//   - setProvider(id)  → swap the terrain algorithm live; chunks rebuild.
//   - setConfig(patch) → tweak seed/amplitude/…; chunks rebuild.
//   - sampleHeight(x,z) → the flight floor matches the surface for either kind.
//
// IMPORTANT — see AGENTS.md "WebGPU + TSL": classes from `three/webgpu`.

import * as THREE from "three/webgpu";
import type { MeshBasicNodeMaterial, MeshStandardNodeMaterial, Node } from "three/webgpu";
import { ChunkScheduler } from "$lib/three/world/ChunkScheduler";
import type { StreamingConfig } from "$lib/experiences/sinneswandler_test1/world-config";
import { TerrainChunk } from "./chunk";
import { DecorationSet } from "./decorations";
import { ChunkHeightCache, makeHeightEntry, sampleEntry } from "./height-cache";
import { createTerrainMaterial, type KitUniforms } from "./material";
import { createWaterMaterial } from "./water-material";
import type { TerrainConfig, TerrainProvider } from "./provider";
import { getTerrainProvider } from "./providers";
import { TerrainWorkerPool } from "./worker/pool";
import { WorldgenClient } from "./worker/worldgen-client";

// Streaming defaults, tuned for smooth streaming over raw coverage: big 256 m
// chunks (rare build events, fewer draws), buildRadius 2 ≈ 640 m coverage (past
// the 620 m far plane), 40 segments ≈ 6.4 m/vertex, one build initiated per frame.
const DEFAULT_STREAMING: StreamingConfig = {
	chunkSize: 256,
	terrainSegments: 40,
	anchorStepCells: 1,
	buildRadius: 2,
	keepRadius: 3,
	maxBuildsPerFrame: 1,
	// Unused here (the legacy acoustic field is not part of this slice).
	acousticFieldEnabled: false,
	acousticFieldGridStep: 0,
};

export interface TerrainWorldOptions {
	scene: THREE.Scene;
	/** Live sense uniforms (shared with the rest of the experience). */
	uniforms: KitUniforms;
	/** Clock uniform node for the material's rim breath. */
	uTime: Node;
	/** Provider the world opens with. */
	provider: TerrainProvider;
	/** Config overrides folded onto the provider's defaults. */
	config?: Partial<TerrainConfig>;
	/** Streaming overrides (chunk size / radii / budget). */
	streaming?: Partial<StreamingConfig>;
	/** Decoration scatter density (0 = off). Default 0.6. */
	decorationDensity?: number;
}

export class TerrainWorld {
	/** Parent of all chunk meshes; added to the scene in the constructor. */
	readonly group: THREE.Group;

	private readonly material: MeshStandardNodeMaterial;
	/** Shared water material (ocean + lakes + rivers); used by chunk providers. */
	private readonly waterMaterial: MeshBasicNodeMaterial;
	private readonly decorations: DecorationSet;
	private readonly scheduler: ChunkScheduler<TerrainChunk>;
	private readonly chunkSize: number;
	private readonly segments: number;
	/** Shared grid index (same topology for every chunk). */
	private readonly indexArray: Uint16Array | Uint32Array;
	/** Flight-floor source for chunk providers (baked per-chunk height grids). */
	private readonly heightCache: ChunkHeightCache;

	/** Transports, created lazily for whichever provider kind is active. */
	private pool?: TerrainWorkerPool;
	private worldgen?: WorldgenClient;

	private provider: TerrainProvider;
	private cfg: TerrainConfig;
	/** Live GenParams overlay from the dev GUI (worldgen only); sent with builds. */
	private worldgenParams: Record<string, number> = {};

	constructor(opts: TerrainWorldOptions) {
		this.group = new THREE.Group();
		opts.scene.add(this.group);

		this.material = createTerrainMaterial(opts.uniforms, opts.uTime);
		this.waterMaterial = createWaterMaterial(opts.uniforms, opts.uTime);
		this.decorations = new DecorationSet(opts.uniforms, opts.decorationDensity ?? 0.6);
		this.provider = opts.provider;
		this.cfg = { ...opts.provider.defaultConfig, ...opts.config };

		const streaming: StreamingConfig = { ...DEFAULT_STREAMING, ...opts.streaming };
		this.chunkSize = streaming.chunkSize;
		this.segments = streaming.terrainSegments;
		this.heightCache = new ChunkHeightCache(this.chunkSize);

		// Build the grid index once from a throwaway plane and reuse its array.
		const template = new THREE.PlaneGeometry(1, 1, this.segments, this.segments);
		this.indexArray = (template.index as THREE.BufferAttribute).array as
			| Uint16Array
			| Uint32Array;
		template.dispose();

		this.scheduler = new ChunkScheduler<TerrainChunk>({
			config: streaming,
			buildChunk: (gx, gz) => this.buildChunk(gx, gz),
			onChunkBuilt: (chunk) => {
				this.group.add(chunk.mesh);
				if (chunk.heightGrid) this.heightCache.add(chunk.gridX, chunk.gridZ, chunk.heightGrid);
				console.log("[worldgen] built", chunk.gridX, chunk.gridZ, "active=", this.scheduler.size);
			},
			onChunkDisposed: (chunk) => this.heightCache.remove(chunk.gridX, chunk.gridZ),
		});
	}

	/** Stream around the player. Call once per frame with world XZ. */
	update(x: number, z: number): void {
		this.scheduler.update(x, z);
	}

	/** World ground height — the flight floor + gameplay sampling source. */
	sampleHeight(x: number, z: number): number {
		if (this.provider.kind === "chunk") return this.heightCache.sample(x, z);
		return this.provider.height ? this.provider.height(x, z, this.cfg) : 0;
	}

	/** Swap the terrain algorithm live; rebuilds every chunk. Keeps the current
	 *  config (shared shape) unless `config` overrides fields. */
	setProvider(id: string, config?: Partial<TerrainConfig>): void {
		this.provider = getTerrainProvider(id);
		if (config) this.cfg = { ...this.cfg, ...config };
		this.rebuild();
	}

	/** Tweak the active provider's config (seed/amplitude/…); rebuilds chunks. */
	setConfig(patch: Partial<TerrainConfig>): void {
		this.cfg = { ...this.cfg, ...patch };
		this.rebuild();
	}

	/** Set decoration scatter density (0 = off); rebuilds chunks. */
	setDecorationDensity(density: number): void {
		this.decorations.density = density;
		this.rebuild();
	}

	/** Merge a GenParams overlay from the dev GUI (worldgen only); rebuilds chunks.
	 *  The overlay is sent with every build and wins over the cfg-derived params. */
	setWorldgenParams(patch: Record<string, number>): void {
		this.worldgenParams = { ...this.worldgenParams, ...patch };
		console.log("[worldgen] setWorldgenParams", patch, "→ rebuild");
		this.rebuild();
	}

	get providerId(): string {
		return this.provider.id;
	}

	dispose(): void {
		this.scheduler.clearAll();
		this.pool?.dispose();
		this.worldgen?.dispose();
		this.heightCache.clear();
		this.group.removeFromParent();
		this.material.dispose();
		this.waterMaterial.dispose();
		this.decorations.dispose();
	}

	/** Drop all chunks + cached heights; the next update re-streams with current
	 *  provider/config. The worldgen worker re-applies the config (it keys its
	 *  region cache by the config signature). */
	private rebuild(): void {
		this.scheduler.clearAll();
		this.heightCache.clear();
	}

	private ensurePool(): TerrainWorkerPool {
		if (!this.pool) this.pool = new TerrainWorkerPool();
		return this.pool;
	}

	private ensureWorldgen(): WorldgenClient {
		if (!this.worldgen) this.worldgen = new WorldgenClient();
		return this.worldgen;
	}

	private async buildChunk(gridX: number, gridZ: number): Promise<TerrainChunk> {
		if (this.provider.kind === "chunk") {
			console.log("[worldgen] buildChunk START", gridX, gridZ);
			const r = await this.ensureWorldgen().build(
				this.cfg,
				gridX,
				gridZ,
				this.chunkSize,
				this.segments,
				this.worldgenParams,
			);
			console.log("[worldgen] buildChunk DONE", gridX, gridZ);
			// This chunk isn't in the global height cache yet (added on build), so
			// place its decorations against its own freshly-built grid.
			const local = makeHeightEntry(gridX, gridZ, this.chunkSize, r.heightGrid);
			return new TerrainChunk({
				gridX: r.gridX,
				gridZ: r.gridZ,
				chunkSize: this.chunkSize,
				positions: r.positions,
				normals: r.normals,
				heightGrid: r.heightGrid,
				biome: r.biome,
				index: this.indexArray,
				material: this.material,
				decorations: this.decorations,
				decoSampleHeight: (x, z) => sampleEntry(local, x, z),
				decoSeed: this.cfg.seed,
				waterPositions: r.waterPositions,
				waterColors: r.waterColors,
				waterMaterial: this.waterMaterial,
			});
		}

		const r = await this.ensurePool().build(
			this.provider.id,
			this.cfg,
			gridX,
			gridZ,
			this.chunkSize,
			this.segments,
		);
		const cfg = this.cfg;
		const provider = this.provider;
		return new TerrainChunk({
			gridX: r.gridX,
			gridZ: r.gridZ,
			chunkSize: this.chunkSize,
			positions: r.positions,
			normals: r.normals,
			index: this.indexArray,
			material: this.material,
			decorations: this.decorations,
			decoSampleHeight: (x, z) => (provider.height ? provider.height(x, z, cfg) : 0),
			decoSeed: this.cfg.seed,
		});
	}
}
