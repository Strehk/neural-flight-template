// ── Becoming Many — Terrain Chunk ──────────────────────────────
//
// One streamed terrain tile. Its vertex data is generated off-thread by the
// terrain worker (terrain/worker/) and arrives as plain position + normal
// Float32Arrays; this wraps them in a BufferGeometry (sharing a single grid
// index across all chunks) drawn by the shared sense material. No GPU compute,
// so no per-chunk pipeline build — that was the streaming hitch.
//
// Decorations are scattered on the surface (terrain/decorations.ts) and parented
// under the mesh so they stream + dispose with the chunk.
//
// IMPORTANT — see AGENTS.md "WebGPU + TSL": classes from `three/webgpu`.

import * as THREE from "three/webgpu";
import type { MeshStandardNodeMaterial } from "three/webgpu";
import type { ChunkLike } from "$lib/three/world/ChunkScheduler";
import type { DecorationSet } from "./decorations";
import type { TerrainConfig, TerrainProvider } from "./provider";
import type { TerrainBuildResult } from "./worker/protocol";

export class TerrainChunk implements ChunkLike {
	readonly gridX: number;
	readonly gridZ: number;
	readonly mesh: THREE.Mesh;

	private readonly geometry: THREE.BufferGeometry;
	private readonly decorations: THREE.InstancedMesh[];

	constructor(
		result: TerrainBuildResult,
		chunkSize: number,
		index: Uint16Array | Uint32Array,
		material: MeshStandardNodeMaterial,
		provider: TerrainProvider,
		cfg: TerrainConfig,
		decorations?: DecorationSet,
	) {
		this.gridX = result.gridX;
		this.gridZ = result.gridZ;

		// Wrap the worker's arrays. The index is shared (same grid topology for
		// every chunk); each chunk gets its own BufferAttribute over it so dispose
		// frees only this chunk's GPU index buffer.
		this.geometry = new THREE.BufferGeometry();
		this.geometry.setAttribute("position", new THREE.BufferAttribute(result.positions, 3));
		this.geometry.setAttribute("normal", new THREE.BufferAttribute(result.normals, 3));
		this.geometry.setIndex(new THREE.BufferAttribute(index, 1));
		// Local positions are real, so the bounding sphere is valid → off-screen
		// chunks frustum-cull normally.
		this.geometry.computeBoundingSphere();

		const centerX = result.gridX * chunkSize + chunkSize / 2;
		const centerZ = result.gridZ * chunkSize + chunkSize / 2;

		this.mesh = new THREE.Mesh(this.geometry, material);
		this.mesh.position.set(centerX, 0, centerZ);
		this.mesh.matrixAutoUpdate = false;
		this.mesh.updateMatrix();

		// Instanced decorations on the surface (chunk-local coords), parented to
		// the mesh so they stream + dispose with the chunk.
		this.decorations = decorations
			? decorations.populate(result.gridX, result.gridZ, chunkSize, provider, cfg)
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
