// ── Becoming Many — Streaming Terrain World ────────────────────
//
// Owns the streamed chunked terrain: the generic ChunkScheduler (reused from
// src/lib/three/world), one shared sense material, and the active TerrainProvider
// + config. Each chunk is generated on the GPU (terrain/chunk.ts) and read back
// for flight via the provider's CPU height mirror.
//
// The modularity payoff lives here:
//   - setProvider(id)  → swap the whole terrain algorithm at runtime; chunks rebuild.
//   - setConfig(patch) → tweak seed/amplitude/etc.; chunks rebuild.
//   - sampleHeight(x,z) → provider.height; the flight floor matches the surface.
//
// IMPORTANT — see AGENTS.md "WebGPU + TSL": classes from `three/webgpu`.

import * as THREE from "three/webgpu";
import type { MeshStandardNodeMaterial, Node } from "three/webgpu";
import { ChunkScheduler } from "$lib/three/world/ChunkScheduler";
import type { StreamingConfig } from "$lib/experiences/sinneswandler_test1/world-config";
import { type ChunkParams, TerrainChunk } from "./chunk";
import { createTerrainMaterial, type KitUniforms } from "./material";
import type { TerrainConfig, TerrainProvider } from "./provider";
import { getTerrainProvider } from "./providers";

// Streaming defaults. buildRadius 3 over 128 m chunks ≈ a 450 m view, inside the
// manifest's 620 m far plane; the sense view-radius reveal fades the rest.
const DEFAULT_STREAMING: StreamingConfig = {
	chunkSize: 128,
	terrainSegments: 48,
	anchorStepCells: 1,
	buildRadius: 3,
	keepRadius: 4,
	maxBuildsPerFrame: 2,
	// Unused here (the legacy acoustic field is not part of this slice).
	acousticFieldEnabled: false,
	acousticFieldGridStep: 0,
};

export interface TerrainWorldOptions {
	renderer: THREE.WebGPURenderer;
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
}

export class TerrainWorld {
	/** Parent of all chunk meshes; added to the scene in the constructor. */
	readonly group: THREE.Group;

	private readonly renderer: THREE.WebGPURenderer;
	private readonly material: MeshStandardNodeMaterial;
	private readonly scheduler: ChunkScheduler<TerrainChunk>;
	private readonly params: ChunkParams;

	private provider: TerrainProvider;
	private cfg: TerrainConfig;

	constructor(opts: TerrainWorldOptions) {
		this.renderer = opts.renderer;
		this.group = new THREE.Group();
		opts.scene.add(this.group);

		this.material = createTerrainMaterial(opts.uniforms, opts.uTime);
		this.provider = opts.provider;
		this.cfg = { ...opts.provider.defaultConfig, ...opts.config };

		const streaming: StreamingConfig = { ...DEFAULT_STREAMING, ...opts.streaming };
		this.params = {
			chunkSize: streaming.chunkSize,
			segments: streaming.terrainSegments,
		};

		this.scheduler = new ChunkScheduler<TerrainChunk>({
			config: streaming,
			buildChunk: (gx, gz) => this.buildChunk(gx, gz),
			// Only chunks that survive to the active set get shown; cancelled/late
			// ones are disposed by the scheduler (chunk.dispose detaches the mesh).
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
	 *  config (seed/amplitude/…) since it's a shared shape — pass `config` to
	 *  override fields. */
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

	get providerId(): string {
		return this.provider.id;
	}

	dispose(): void {
		this.scheduler.clearAll();
		this.group.removeFromParent();
		this.material.dispose();
	}

	private async buildChunk(gridX: number, gridZ: number): Promise<TerrainChunk> {
		const chunk = new TerrainChunk(
			gridX,
			gridZ,
			this.params,
			this.provider,
			this.cfg,
			this.material,
		);
		await chunk.generate(this.renderer);
		return chunk;
	}
}
