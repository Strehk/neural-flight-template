import * as THREE from "three";
import { createTerrainGeometry } from "./geometry";
import type { HeightmapConfig } from "./heightmap";

// Singleton material shared by all terrain chunks — saves GPU memory.
// vertexColors: height-based coloring is baked into geometry vertex attributes.
const MATERIAL = new THREE.MeshStandardMaterial({
	vertexColors: true,
	flatShading: true,
});

/** A single terrain tile owning its mesh and grid position. */
export class TerrainChunk {
	readonly mesh: THREE.Mesh;
	gridX: number;
	gridZ: number;

	constructor(
		gridX: number,
		gridZ: number,
		size: number,
		config: HeightmapConfig,
	) {
		this.gridX = gridX;
		this.gridZ = gridZ;

		const geo = createTerrainGeometry(gridX, gridZ, size, config);
		this.mesh = new THREE.Mesh(geo, MATERIAL);
		this.mesh.receiveShadow = true;
		this.mesh.position.set(gridX * size, 0, gridZ * size);
	}

	/** Rebuild geometry for a new grid position. */
	rebuild(
		gridX: number,
		gridZ: number,
		size: number,
		config: HeightmapConfig,
	): void {
		this.gridX = gridX;
		this.gridZ = gridZ;
		this.mesh.geometry.dispose();
		this.mesh.geometry = createTerrainGeometry(gridX, gridZ, size, config);
		this.mesh.position.set(gridX * size, 0, gridZ * size);
	}

	dispose(): void {
		this.mesh.geometry.dispose();
	}
}
