/**
 * Builds a chunk's per-vertex arrays from the detail generator (was
 * TerrainMeshBuilder.ts, which produced a three BufferGeometry). Here we emit
 * plain typed arrays — NO three import — so this runs inside the worldgen worker;
 * the main thread wraps them in a BufferGeometry with the shared grid index.
 *
 * Geometry is chunk-LOCAL, centred on the chunk (x,z ∈ [-size/2, size/2]); world
 * XZ is reconstructed from the chunk origin so the detail noise stays seam-free.
 * Normals come from a one-vertex apron of real-neighbour heights (evaluated at the
 * true world positions just outside the chunk), so edge normals match neighbours.
 */
import type { ChunkVertexData } from "../../../provider";
import type { TerrainDetailGenerator } from "./TerrainDetailGenerator";
import { computeGridNormals } from "./TerrainNormalBuilder";
import type { TerrainSampler } from "./TerrainSampler";

/**
 * @param sampler   reads the chunk's Stage-1 maps (seamless bordered height etc.)
 * @param detail    adds local relief; `worldY` is a pure function of world (x,y)
 * @param segments  grid segments per chunk edge (verts per edge = segments+1)
 */
export function buildChunkArrays(
	sampler: TerrainSampler,
	detail: TerrainDetailGenerator,
	segments: number,
): ChunkVertexData {
	const size = sampler.size;
	const res = Math.max(8, segments | 0);
	const vpe = res + 1; // verts per edge
	const step = size / res;
	const half = size / 2;
	const ox = sampler.originX;
	const oy = sampler.originY;

	// Extended height grid (1-vertex apron) for seam-free normals.
	const ew = res + 3;
	const extY = new Float32Array(ew * ew);
	for (let ej = 0; ej < ew; ej++) {
		const wy = oy + (ej - 1) * step;
		for (let ei = 0; ei < ew; ei++) {
			const wx = ox + (ei - 1) * step;
			extY[ej * ew + ei] = detail.worldY(wx, wy, sampler);
		}
	}

	const positions = new Float32Array(vpe * vpe * 3);
	const heightGrid = new Float32Array(vpe * vpe);
	const biome = new Uint8Array(vpe * vpe);
	for (let j = 0; j <= res; j++) {
		const localZ = -half + j * step;
		const ej = j + 1;
		const v = j / res;
		for (let i = 0; i <= res; i++) {
			const y = extY[ej * ew + (i + 1)];
			const vi = j * vpe + i;
			positions[vi * 3] = -half + i * step;
			positions[vi * 3 + 1] = y;
			positions[vi * 3 + 2] = localZ;
			heightGrid[vi] = y;
			biome[vi] = sampler.sampleBiome(i / res, v);
		}
	}

	const normals = computeGridNormals(extY, res, step);
	return { positions, normals, biome, heightGrid };
}
