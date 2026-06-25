// ── Becoming Many — Terrain Chunk ──────────────────────────────
//
// One streamed terrain tile. Its vertex data is generated off the main thread
// (either the pointwise worker pool or the worldgen worker) and arrives as plain
// position + normal Float32Arrays; this wraps them in a BufferGeometry (sharing a
// single grid index across all chunks) drawn by the shared sense material. No GPU
// compute, so no per-chunk pipeline build — that was the streaming hitch.
//
// The chunk is provider-agnostic: it takes a plain params object (TerrainWorld
// builds it from whichever transport produced the vertex data). Chunk providers
// also pass a per-vertex `heightGrid` (kept for the flight-floor cache) and a
// `biome` array (reserved for biome-aware senses; not rendered yet).
//
// Decorations are scattered on the surface (terrain/decorations.ts) via a height
// sampler closure and parented under the mesh so they stream + dispose with it.
//
// IMPORTANT — see AGENTS.md "WebGPU + TSL": classes from `three/webgpu`.

import * as THREE from "three/webgpu";
import type { MeshStandardNodeMaterial } from "three/webgpu";
import type { ChunkLike } from "$lib/three/world/ChunkScheduler";
import type { DecorationSet } from "./decorations";

export interface TerrainChunkParams {
	gridX: number;
	gridZ: number;
	chunkSize: number;
	/** (segments+1)² × 3 — chunk-local position (lx, y, lz) per vertex. */
	positions: Float32Array;
	/** (segments+1)² × 3 — world-space surface normal per vertex. */
	normals: Float32Array;
	/** Shared grid index (same topology for every chunk). */
	index: Uint16Array | Uint32Array;
	material: MeshStandardNodeMaterial;
	/** World-Y per vertex — chunk providers supply it for the flight-floor cache. */
	heightGrid?: Float32Array;
	/** Per-vertex biome id — reserved for biome-aware senses (not rendered yet). */
	biome?: Uint8Array;
	decorations?: DecorationSet;
	/** Height sampler for decoration placement (provider-agnostic). */
	decoSampleHeight?: (x: number, z: number) => number;
	/** Seed for the decoration scatter PRNG. */
	decoSeed?: number;
}

export class TerrainChunk implements ChunkLike {
	readonly gridX: number;
	readonly gridZ: number;
	readonly mesh: THREE.Mesh;
	/** Kept so TerrainWorld can register it in the flight-floor cache. */
	readonly heightGrid?: Float32Array;
	/** Reserved for biome-aware senses; unused this slice. */
	readonly biome?: Uint8Array;

	private readonly geometry: THREE.BufferGeometry;
	private readonly decorations: THREE.InstancedMesh[];

	constructor(p: TerrainChunkParams) {
		this.gridX = p.gridX;
		this.gridZ = p.gridZ;
		this.heightGrid = p.heightGrid;
		this.biome = p.biome;

		// Wrap the worker's arrays. The index is shared (same grid topology for
		// every chunk); each chunk gets its own BufferAttribute over it so dispose
		// frees only this chunk's GPU index buffer.
		this.geometry = new THREE.BufferGeometry();
		this.geometry.setAttribute("position", new THREE.BufferAttribute(p.positions, 3));
		this.geometry.setAttribute("normal", new THREE.BufferAttribute(p.normals, 3));
		this.geometry.setIndex(new THREE.BufferAttribute(p.index, 1));
		// Local positions are real, so the bounding sphere is valid → off-screen
		// chunks frustum-cull normally.
		this.geometry.computeBoundingSphere();

		const centerX = p.gridX * p.chunkSize + p.chunkSize / 2;
		const centerZ = p.gridZ * p.chunkSize + p.chunkSize / 2;

		this.mesh = new THREE.Mesh(this.geometry, p.material);
		this.mesh.position.set(centerX, 0, centerZ);
		this.mesh.matrixAutoUpdate = false;
		this.mesh.updateMatrix();

		// Instanced decorations on the surface (chunk-local coords), parented to
		// the mesh so they stream + dispose with the chunk.
		this.decorations =
			p.decorations && p.decoSampleHeight
				? p.decorations.populate(p.gridX, p.gridZ, p.chunkSize, p.decoSampleHeight, p.decoSeed ?? 0)
				: [];
		for (const deco of this.decorations) this.mesh.add(deco);
	}

	dispose(): void {
		this.mesh.removeFromParent();
		this.geometry.dispose();
		// Shared deco geo/materials are owned by the DecorationSet (disposed by the
		// world); here we just free the per-chunk instance buffers.
		for (const deco of this.decorations) deco.dispose();
	}
}
