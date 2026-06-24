// ── Becoming Many — Chunk Decorations (M3 slice 2) ─────────────
//
// A deliberately minimal per-chunk instanced scatter: low-poly rocks + grass
// tufts placed on the terrain surface. It is decoupled from the generation
// internals on purpose — it samples ONLY the active provider's CPU height
// mirror (provider.height) for placement + slope, so the upcoming worldgen swap
// changes the terrain without touching this layer.
//
// One DecorationSet owns the shared geometries + sense-reveal materials; each
// chunk calls populate() to get a few InstancedMeshes (chunk-local coords, added
// under the chunk mesh so they stream + dispose with it). Placement is seeded by
// the chunk cell + world seed, so it's deterministic and matches the terrain.
//
// IMPORTANT — see AGENTS.md "WebGPU + TSL": classes from `three/webgpu`, node
// fns from `three/tsl`.

import { color, mix } from "three/tsl";
import * as THREE from "three/webgpu";
import { MeshStandardNodeMaterial, type Node } from "three/webgpu";
import { viewReveal } from "$lib/tsl";
import type { KitUniforms } from "./material";
import type { TerrainConfig, TerrainProvider } from "./provider";

// Per-chunk instance capacities at density = 1 (scaled by the density setting).
const GRASS_CAP = 70;
const ROCK_CAP = 28;
// Grass only takes on flat-ish ground; rocks go anywhere.
const GRASS_MAX_SLOPE = 0.8;

const dummy = new THREE.Object3D();

/** Small deterministic PRNG (mulberry32) so a chunk's scatter is reproducible. */
function mulberry32(seed: number): () => number {
	let a = seed >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) | 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

// Surface steepness at (x,z) from the provider's CPU height mirror.
function slopeAt(
	provider: TerrainProvider,
	cfg: TerrainConfig,
	x: number,
	z: number,
): number {
	const e = 2;
	const hx = provider.height(x + e, z, cfg) - provider.height(x - e, z, cfg);
	const hz = provider.height(x, z + e, cfg) - provider.height(x, z - e, cfg);
	return (Math.abs(hx) + Math.abs(hz)) / (2 * e);
}

function decorationMaterial(baseHex: number, u: KitUniforms): MeshStandardNodeMaterial {
	const m = new MeshStandardNodeMaterial();
	m.metalness = 0.0;
	m.roughness = 0.92;
	// Fade into the sense void exactly like the terrain (same view-radius bubble),
	// so decorations belong to the current sense rather than floating in the dark.
	const reveal = viewReveal(u.viewRadius, u.revealSoftness) as Node;
	m.colorNode = mix(u.fogColor, color(baseHex), reveal);
	return m;
}

export class DecorationSet {
	/** 0 = off; scales the per-chunk instance counts. */
	density: number;

	private readonly rockGeo: THREE.BufferGeometry;
	private readonly grassGeo: THREE.BufferGeometry;
	private readonly rockMat: MeshStandardNodeMaterial;
	private readonly grassMat: MeshStandardNodeMaterial;

	constructor(uniforms: KitUniforms, density = 0.6) {
		this.density = density;
		this.rockGeo = new THREE.IcosahedronGeometry(1.2, 0);
		this.grassGeo = new THREE.ConeGeometry(0.5, 2.4, 4);
		this.rockMat = decorationMaterial(0x6b6f73, uniforms); // grey
		this.grassMat = decorationMaterial(0x7fae54, uniforms); // green
	}

	/**
	 * Scatter decorations across one chunk cell. Returns InstancedMeshes in
	 * CHUNK-LOCAL coordinates (centred on the cell), to be parented under the
	 * chunk mesh. Empty if density is 0.
	 */
	populate(
		gridX: number,
		gridZ: number,
		chunkSize: number,
		provider: TerrainProvider,
		cfg: TerrainConfig,
	): THREE.InstancedMesh[] {
		if (this.density <= 0) return [];

		const centerX = gridX * chunkSize + chunkSize / 2;
		const centerZ = gridZ * chunkSize + chunkSize / 2;
		const seed =
			(Math.imul(gridX, 73856093) ^ Math.imul(gridZ, 19349663) ^
				Math.imul(cfg.seed | 0, 83492791)) >>> 0;
		const rng = mulberry32(seed);

		const grass = this.scatter(
			this.grassGeo,
			this.grassMat,
			GRASS_CAP,
			chunkSize,
			rng,
			(lx, lz) => {
				const wx = centerX + lx;
				const wz = centerZ + lz;
				if (slopeAt(provider, cfg, wx, wz) > GRASS_MAX_SLOPE) return null;
				return provider.height(wx, wz, cfg);
			},
		);
		const rock = this.scatter(
			this.rockGeo,
			this.rockMat,
			ROCK_CAP,
			chunkSize,
			rng,
			(lx, lz) => provider.height(centerX + lx, centerZ + lz, cfg),
		);

		return [grass, rock].filter((m): m is THREE.InstancedMesh => m !== null);
	}

	dispose(): void {
		this.rockGeo.dispose();
		this.grassGeo.dispose();
		this.rockMat.dispose();
		this.grassMat.dispose();
	}

	// Place up to `cap*density` instances; `surfaceY` returns the local Y at a
	// candidate (or null to reject it). Returns null if nothing was placed.
	private scatter(
		geo: THREE.BufferGeometry,
		mat: MeshStandardNodeMaterial,
		cap: number,
		span: number,
		rng: () => number,
		surfaceY: (lx: number, lz: number) => number | null,
	): THREE.InstancedMesh | null {
		const capacity = Math.round(cap * this.density);
		if (capacity <= 0) return null;

		const mesh = new THREE.InstancedMesh(geo, mat, capacity);
		mesh.frustumCulled = false; // small counts; bounds live under the chunk
		let placed = 0;
		for (let i = 0; i < capacity; i++) {
			// Candidate local position, jittered across the chunk cell.
			const lx = (rng() - 0.5) * span;
			const lz = (rng() - 0.5) * span;
			const y = surfaceY(lx, lz);
			if (y === null) continue;
			dummy.position.set(lx, y, lz);
			dummy.rotation.set(0, rng() * Math.PI * 2, 0);
			dummy.scale.setScalar(0.7 + rng() * 0.9);
			dummy.updateMatrix();
			mesh.setMatrixAt(placed, dummy.matrix);
			placed++;
		}
		mesh.count = placed;
		mesh.instanceMatrix.needsUpdate = true;
		if (placed === 0) {
			mesh.dispose();
			return null;
		}
		return mesh;
	}
}
