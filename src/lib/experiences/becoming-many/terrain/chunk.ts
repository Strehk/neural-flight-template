// ── Becoming Many — GPU Terrain Chunk ──────────────────────────
//
// One streamed terrain tile. Its vertex data lives entirely on the GPU: two
// StorageBufferAttributes (position + normal) filled by a one-shot TSL compute
// kernel that calls the active provider's heightNode per vertex. The shared
// terrain material reads them via attribute("storagePosition"/"storageNormal")
// (see material.ts), so chunks share one material and never round-trip to the CPU.
//
// This is the "GPU chunk payload" the plan calls for: generate-on-GPU, draw
// straight from the storage buffers, dispose them on unload.
//
// The compute kernel derives each vertex's world XZ from instanceIndex + the
// chunk's (gridX,gridZ) and grid resolution, samples height (and four neighbours
// for the normal via finite differences), and writes local-space position
// (the mesh is translated to the chunk centre) + a world-space normal.
//
// IMPORTANT — see AGENTS.md "WebGPU + TSL": node fns from `three/tsl`, classes
// from `three/webgpu`. Mirrors the compute idiom in swarm-scene.ts.

import { Fn, float, instanceIndex, storage, vec3 } from "three/tsl";
import * as THREE from "three/webgpu";
import type { ComputeNode, MeshStandardNodeMaterial } from "three/webgpu";
import type { ChunkLike } from "$lib/three/world/ChunkScheduler";
import type { TerrainConfig, TerrainProvider } from "./provider";
import { STORAGE_NORMAL, STORAGE_POSITION } from "./material";

export interface ChunkParams {
	/** Chunk edge length in world units. */
	chunkSize: number;
	/** Grid cells per side (vertices per side = segments + 1). */
	segments: number;
}

export class TerrainChunk implements ChunkLike {
	readonly gridX: number;
	readonly gridZ: number;
	readonly mesh: THREE.Mesh;

	private readonly geometry: THREE.PlaneGeometry;
	private readonly kernel: ComputeNode;
	private readonly vertexCount: number;

	constructor(
		gridX: number,
		gridZ: number,
		params: ChunkParams,
		provider: TerrainProvider,
		cfg: TerrainConfig,
		material: MeshStandardNodeMaterial,
	) {
		this.gridX = gridX;
		this.gridZ = gridZ;

		const { chunkSize, segments } = params;
		const seg1 = segments + 1;
		const count = seg1 * seg1;
		this.vertexCount = count;

		// World centre of this cell — local [-cs/2, cs/2] maps to the cell's world
		// span, and adjacent chunks meet exactly (shared edge → identical height).
		const centerX = gridX * chunkSize + chunkSize / 2;
		const centerZ = gridZ * chunkSize + chunkSize / 2;
		// Finite-difference step for the normal: one grid cell.
		const e = chunkSize / segments;

		// PlaneGeometry gives us the (segments+1)² vertex grid + triangle index;
		// its own position/normal attributes are overridden by the storage ones.
		this.geometry = new THREE.PlaneGeometry(chunkSize, chunkSize, segments, segments);

		const posAttr = new THREE.StorageBufferAttribute(count, 3);
		const nrmAttr = new THREE.StorageBufferAttribute(count, 3);
		this.geometry.setAttribute(STORAGE_POSITION, posAttr);
		this.geometry.setAttribute(STORAGE_NORMAL, nrmAttr);

		const posStore = storage(posAttr, "vec3", count);
		const nrmStore = storage(nrmAttr, "vec3", count);

		this.kernel = Fn(() => {
			// instanceIndex → grid (ix, iz). Float math keeps it portable across the
			// uint/int TSL surface; idx ≤ ~few-thousand is exact in f32.
			const idx = float(instanceIndex);
			const iz = idx.div(seg1).floor();
			const ix = idx.sub(iz.mul(seg1));

			const lx = ix.div(segments).sub(0.5).mul(chunkSize);
			const lz = iz.div(segments).sub(0.5).mul(chunkSize);
			const wx = lx.add(centerX);
			const wz = lz.add(centerZ);

			const h = provider.heightNode(wx, wz, cfg);
			// Surface normal from the height gradient (central differences).
			const hL = provider.heightNode(wx.sub(e), wz, cfg);
			const hR = provider.heightNode(wx.add(e), wz, cfg);
			const hD = provider.heightNode(wx, wz.sub(e), cfg);
			const hU = provider.heightNode(wx, wz.add(e), cfg);
			const normal = vec3(hL.sub(hR), float(2 * e), hD.sub(hU)).normalize();

			posStore.element(instanceIndex).assign(vec3(lx, h, lz));
			nrmStore.element(instanceIndex).assign(normal);
		})().compute(count);

		this.mesh = new THREE.Mesh(this.geometry, material);
		this.mesh.position.set(centerX, 0, centerZ);
		// Real positions live on the GPU, so the CPU bounding box is stale — don't
		// let the frustum culler use it (same as the swarm reference).
		this.mesh.frustumCulled = false;
		this.mesh.matrixAutoUpdate = false;
		this.mesh.updateMatrix();
	}

	/** Run the one-shot generation kernel. Awaited by the world before the chunk
	 *  enters the scene. */
	async generate(renderer: THREE.WebGPURenderer): Promise<void> {
		await renderer.computeAsync(this.kernel);
	}

	/** Detach + free GPU resources. Called by the scheduler on unload. The
	 *  material is shared and owned by the world, so it is NOT disposed here. */
	dispose(): void {
		this.mesh.removeFromParent();
		this.geometry.dispose();
	}
}
