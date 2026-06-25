// ── Becoming Many — Streaming Terrain World ────────────────────
//
// Owns the streamed chunked terrain: the generic ChunkScheduler (reused from
// src/lib/three/world), a worker pool that generates chunk vertex data off the
// main thread, one shared sense material, a shared grid index, and the active
// TerrainProvider + config. Generation is CPU-in-worker (no GPU compute), so no
// per-chunk pipeline build → no streaming hitch. The provider's height() feeds
// both the worker (geometry) and the main thread (flight floor + decorations).
//
// Modularity payoff:
//   - setProvider(id)  → swap the terrain algorithm live; chunks rebuild.
//   - setConfig(patch) → tweak seed/amplitude/…; chunks rebuild.
//   - sampleHeight(x,z) → provider.height; the flight floor matches the surface.
//
// IMPORTANT — see AGENTS.md "WebGPU + TSL": classes from `three/webgpu`.

import * as THREE from "three/webgpu";
import type { MeshStandardNodeMaterial, Node } from "three/webgpu";
import { ChunkScheduler } from "$lib/three/world/ChunkScheduler";
import type { StreamingConfig } from "$lib/experiences/sinneswandler_test1/world-config";
import { TerrainChunk } from "./chunk";
import { DecorationSet } from "./decorations";
import { createTerrainMaterial, type KitUniforms } from "./material";
import type { TerrainConfig, TerrainProvider } from "./provider";
import { getTerrainProvider } from "./providers";
import { TerrainWorkerPool } from "./worker/pool";

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
	private readonly decorations: DecorationSet;
	private readonly pool: TerrainWorkerPool;
	private readonly scheduler: ChunkScheduler<TerrainChunk>;
	private readonly chunkSize: number;
	private readonly segments: number;
	/** Shared grid index (same topology for every chunk). */
	private readonly indexArray: Uint16Array | Uint32Array;

	private provider: TerrainProvider;
	private cfg: TerrainConfig;

	constructor(opts: TerrainWorldOptions) {
		this.group = new THREE.Group();
		opts.scene.add(this.group);

		this.material = createTerrainMaterial(opts.uniforms, opts.uTime);
		this.decorations = new DecorationSet(opts.uniforms, opts.decorationDensity ?? 0.6);
		this.provider = opts.provider;
		this.cfg = { ...opts.provider.defaultConfig, ...opts.config };

		const streaming: StreamingConfig = { ...DEFAULT_STREAMING, ...opts.streaming };
		this.chunkSize = streaming.chunkSize;
		this.segments = streaming.terrainSegments;

		// Build the grid index once from a throwaway plane and reuse its array.
		const template = new THREE.PlaneGeometry(1, 1, this.segments, this.segments);
		this.indexArray = (template.index as THREE.BufferAttribute).array as
			| Uint16Array
			| Uint32Array;
		template.dispose();

		this.pool = new TerrainWorkerPool();

		this.scheduler = new ChunkScheduler<TerrainChunk>({
			config: streaming,
			buildChunk: (gx, gz) => this.buildChunk(gx, gz),
			onChunkBuilt: (chunk) => this.group.add(chunk.mesh),
		});
	}

	/** Stream around the player. Call once per frame with world XZ. */
	update(x: number, z: number): void {
		this.scheduler.update(x, z);
	}

	/** World ground height — the flight floor + gameplay sampling source. */
	sampleHeight(x: number, z: number): number {
		return this.provider.height(x, z, this.cfg);
	}

	/** Swap the terrain algorithm live; rebuilds every chunk. Keeps the current
	 *  config (shared shape) unless `config` overrides fields. */
	setProvider(id: string, config?: Partial<TerrainConfig>): void {
		this.provider = getTerrainProvider(id);
		if (config) this.cfg = { ...this.cfg, ...config };
		this.scheduler.clearAll();
	}

	/** Tweak the active provider's config (seed/amplitude/…); rebuilds chunks. */
	setConfig(patch: Partial<TerrainConfig>): void {
		this.cfg = { ...this.cfg, ...patch };
		this.scheduler.clearAll();
	}

	/** Set decoration scatter density (0 = off); rebuilds chunks. */
	setDecorationDensity(density: number): void {
		this.decorations.density = density;
		this.scheduler.clearAll();
	}

	get providerId(): string {
		return this.provider.id;
	}

	dispose(): void {
		this.scheduler.clearAll();
		this.pool.dispose();
		this.group.removeFromParent();
		this.material.dispose();
		this.decorations.dispose();
	}

	private async buildChunk(gridX: number, gridZ: number): Promise<TerrainChunk> {
		const result = await this.pool.build(
			this.provider.id,
			this.cfg,
			gridX,
			gridZ,
			this.chunkSize,
			this.segments,
		);
		return new TerrainChunk(
			result,
			this.chunkSize,
			this.indexArray,
			this.material,
			this.provider,
			this.cfg,
			this.decorations,
		);
	}
}
