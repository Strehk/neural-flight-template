/**
 * BlobTerrain — Noise-displaced plane with soft rounded hills
 *
 * CPU-side FBM displacement for compatibility with any fragment shader.
 * Use with toon-stepped.frag or gradient-material.frag for stylized looks.
 *
 * @example
 * const terrain = createBlobTerrain({
 *   noiseScale: 0.02,
 *   amplitude: 8,
 *   color: 0x88cc88,
 * });
 * scene.add(terrain.mesh);
 * // Optional animation: updateBlobTerrain(terrain, elapsed);
 */
import * as THREE from "three";

export interface BlobTerrainConfig {
	size?: number;
	segments?: number;
	noiseScale?: number;
	amplitude?: number;
	octaves?: number;
	color?: number;
	flatShading?: boolean;
	animated?: boolean;
	animSpeed?: number;
}

export interface BlobTerrainHandle {
	mesh: THREE.Mesh;
	update: (elapsed: number) => void;
	dispose: () => void;
}

const DEFAULTS: Required<BlobTerrainConfig> = {
	size: 100,
	segments: 128,
	noiseScale: 0.03,
	amplitude: 6,
	octaves: 5,
	color: 0x7faa6e,
	flatShading: true,
	animated: false,
	animSpeed: 0.1,
};

// Simple 2D hash for CPU-side noise
function hash2d(x: number, y: number): number {
	const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
	return n - Math.floor(n);
}

function noise2d(x: number, y: number): number {
	const ix = Math.floor(x);
	const iy = Math.floor(y);
	const fx = x - ix;
	const fy = y - iy;
	const sx = fx * fx * (3 - 2 * fx);
	const sy = fy * fy * (3 - 2 * fy);

	const a = hash2d(ix, iy);
	const b = hash2d(ix + 1, iy);
	const c = hash2d(ix, iy + 1);
	const d = hash2d(ix + 1, iy + 1);

	return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}

function fbm(x: number, y: number, octaves: number): number {
	let value = 0;
	let amp = 0.5;
	let freq = 1;
	for (let i = 0; i < octaves; i++) {
		value += amp * noise2d(x * freq, y * freq);
		freq *= 2;
		amp *= 0.5;
	}
	return value;
}

function displaceTerrain(
	geo: THREE.PlaneGeometry,
	scale: number,
	amplitude: number,
	octaves: number,
	timeOffset: number,
): void {
	const pos = geo.attributes.position;
	for (let i = 0; i < pos.count; i++) {
		const x = pos.getX(i);
		const z = pos.getZ(i); // Plane rotated to XZ
		const height =
			fbm(x * scale + timeOffset, z * scale + timeOffset * 0.7, octaves) *
			amplitude;
		pos.setY(i, height);
	}
	pos.needsUpdate = true;
	geo.computeVertexNormals();
}

export function createBlobTerrain(
	config?: BlobTerrainConfig,
): BlobTerrainHandle {
	const c = { ...DEFAULTS, ...config };

	const geo = new THREE.PlaneGeometry(c.size, c.size, c.segments, c.segments);
	geo.rotateX(-Math.PI / 2);

	displaceTerrain(geo, c.noiseScale, c.amplitude, c.octaves, 0);

	const mat = new THREE.MeshStandardMaterial({
		color: c.color,
		flatShading: c.flatShading,
		roughness: 0.8,
		metalness: 0.1,
	});

	const mesh = new THREE.Mesh(geo, mat);
	mesh.receiveShadow = true;
	mesh.castShadow = true;

	return {
		mesh,
		update(elapsed: number) {
			if (!c.animated) return;
			displaceTerrain(
				geo,
				c.noiseScale,
				c.amplitude,
				c.octaves,
				elapsed * c.animSpeed,
			);
		},
		dispose() {
			geo.dispose();
			mat.dispose();
		},
	};
}
