/**
 * ProceduralCity — Instanced box-based city generator
 *
 * Creates a grid of randomized buildings using InstancedMesh for performance.
 * Works for brutalist, synthwave, and retro-futuristic scenes.
 *
 * @example
 * const city = createProceduralCity({ density: 0.7, maxHeight: 30 });
 * scene.add(city.mesh);
 */
import * as THREE from "three";

export interface ProceduralCityConfig {
	gridSize?: number;
	cellSize?: number;
	density?: number;
	minHeight?: number;
	maxHeight?: number;
	minWidth?: number;
	maxWidth?: number;
	color?: number;
	seed?: number;
}

export interface ProceduralCityHandle {
	mesh: THREE.InstancedMesh;
	dispose: () => void;
}

const DEFAULTS: Required<ProceduralCityConfig> = {
	gridSize: 20,
	cellSize: 4,
	density: 0.6,
	minHeight: 2,
	maxHeight: 25,
	minWidth: 1.5,
	maxWidth: 3.5,
	color: 0x333344,
	seed: 42,
};

// Seeded PRNG (simple LCG)
function seededRandom(seed: number): () => number {
	let s = seed;
	return () => {
		s = (s * 1664525 + 1013904223) & 0xffffffff;
		return (s >>> 0) / 0xffffffff;
	};
}

export function createProceduralCity(config?: ProceduralCityConfig): ProceduralCityHandle {
	const c = { ...DEFAULTS, ...config };
	const rng = seededRandom(c.seed);

	// Pre-calculate building positions
	const buildings: { x: number; z: number; w: number; d: number; h: number }[] = [];
	const halfGrid = (c.gridSize * c.cellSize) / 2;

	for (let gx = 0; gx < c.gridSize; gx++) {
		for (let gz = 0; gz < c.gridSize; gz++) {
			if (rng() > c.density) continue;

			const x = gx * c.cellSize - halfGrid + c.cellSize / 2;
			const z = gz * c.cellSize - halfGrid + c.cellSize / 2;
			const w = c.minWidth + rng() * (c.maxWidth - c.minWidth);
			const d = c.minWidth + rng() * (c.maxWidth - c.minWidth);
			const h = c.minHeight + rng() * (c.maxHeight - c.minHeight);

			buildings.push({ x, z, w, d, h });
		}
	}

	// Single box geometry, instanced N times
	const geo = new THREE.BoxGeometry(1, 1, 1);
	const mat = new THREE.MeshStandardMaterial({
		color: c.color,
		roughness: 0.9,
		metalness: 0.1,
		flatShading: true,
	});

	const mesh = new THREE.InstancedMesh(geo, mat, buildings.length);
	const dummy = new THREE.Object3D();

	for (let i = 0; i < buildings.length; i++) {
		const b = buildings[i];
		dummy.position.set(b.x, b.h / 2, b.z);
		dummy.scale.set(b.w, b.h, b.d);
		dummy.updateMatrix();
		mesh.setMatrixAt(i, dummy.matrix);
	}

	mesh.instanceMatrix.needsUpdate = true;
	mesh.castShadow = true;
	mesh.receiveShadow = true;

	return {
		mesh,
		dispose() {
			geo.dispose();
			mat.dispose();
		},
	};
}
