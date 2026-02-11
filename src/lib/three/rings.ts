/**
 * ⚠️ TEMPORARY DEFAULTS — Will move to experience manifest (Step 2).
 * These values currently mirror config/flight.ts RINGS + TERRAIN constants.
 * After migration: each experience passes its own config, no defaults here.
 */
import * as THREE from "three";
import { seededRandom2D as seededRandom } from "./random";
import {
	DEFAULT_HEIGHTMAP,
	getHeight,
	type HeightmapConfig,
} from "./terrain/heightmap";

export interface RingConfig {
	perChunk?: number;
	radius?: number;
	tubeRadius?: number;
	segments?: [number, number];
	collectDistance?: number;
	color?: number;
	collectedColor?: number;
	heightBase?: number;
	heightVariation?: number;
	emissive?: number;
	emissiveCollected?: number;
	chunkSize?: number;
}

const DEFAULTS: Required<RingConfig> = {
	perChunk: 2,
	radius: 6,
	tubeRadius: 0.4,
	segments: [12, 32],
	collectDistance: 8,
	color: 0xf1c40f,
	collectedColor: 0x2ecc71,
	heightBase: 20,
	heightVariation: 30,
	emissive: 0.3,
	emissiveCollected: 0.6,
	chunkSize: 128,
};

export interface RingState {
	mesh: THREE.Mesh;
	collected: boolean;
	center: THREE.Vector3;
	collectDistance: number;
	collectedColor: number;
	emissiveCollected: number;
}

export interface ChunkRings {
	rings: RingState[];
	dispose(): void;
}

// Lazy geometry cache — one TorusGeometry per unique config
const geoCache = new Map<string, THREE.TorusGeometry>();

function getRingGeometry(c: Required<RingConfig>): THREE.TorusGeometry {
	const key = `${c.radius}_${c.tubeRadius}_${c.segments[0]}_${c.segments[1]}`;
	let geo = geoCache.get(key);
	if (!geo) {
		geo = new THREE.TorusGeometry(
			c.radius,
			c.tubeRadius,
			c.segments[0],
			c.segments[1],
		);
		geoCache.set(key, geo);
	}
	return geo;
}

/** Create rings for a single terrain chunk. */
export function createChunkRings(
	chunkX: number,
	chunkZ: number,
	heightConfig: HeightmapConfig = DEFAULT_HEIGHTMAP,
	ringConfig?: RingConfig,
): ChunkRings {
	const c = { ...DEFAULTS, ...ringConfig };
	const geo = getRingGeometry(c);

	const worldX = chunkX * c.chunkSize;
	const worldZ = chunkZ * c.chunkSize;
	const seed = chunkX * 48611 + chunkZ * 97213;
	const rings: RingState[] = [];

	for (let i = 0; i < c.perChunk; i++) {
		const lx = (seededRandom(seed + i, 10) - 0.5) * c.chunkSize;
		const lz = (seededRandom(seed + i, 11) - 0.5) * c.chunkSize;
		const wx = lx + worldX;
		const wz = lz + worldZ;
		const terrainY = getHeight(wx, wz, heightConfig);
		const y =
			terrainY +
			c.heightBase +
			seededRandom(seed + i, 12) * c.heightVariation;

		const mat = new THREE.MeshStandardMaterial({
			color: c.color,
			emissive: c.color,
			emissiveIntensity: c.emissive,
			side: THREE.DoubleSide,
		});
		const mesh = new THREE.Mesh(geo, mat);
		mesh.position.set(wx, y, wz);
		mesh.rotation.y = seededRandom(seed + i, 13) * Math.PI;

		rings.push({
			mesh,
			collected: false,
			center: new THREE.Vector3(wx, y, wz),
			collectDistance: c.collectDistance,
			collectedColor: c.collectedColor,
			emissiveCollected: c.emissiveCollected,
		});
	}

	return {
		rings,
		dispose() {
			for (const ring of rings) {
				(ring.mesh.material as THREE.MeshStandardMaterial).dispose();
			}
		},
	};
}

/** Update the color of all uncollected rings. */
export function recolorRings(rings: RingState[], hexColor: string): void {
	const color = new THREE.Color(hexColor);
	for (const ring of rings) {
		if (ring.collected) continue;
		const mat = ring.mesh.material as THREE.MeshStandardMaterial;
		mat.color.copy(color);
		mat.emissive.copy(color);
	}
}

/** Check if the player is close enough to collect any uncollected ring. */
export function updateRings(
	rings: RingState[],
	playerPos: THREE.Vector3,
): number {
	let collected = 0;

	for (const ring of rings) {
		if (ring.collected) continue;
		if (ring.center.distanceTo(playerPos) < ring.collectDistance) {
			ring.collected = true;
			collected++;
			const mat = ring.mesh.material as THREE.MeshStandardMaterial;
			mat.color.setHex(ring.collectedColor);
			mat.emissive.setHex(ring.collectedColor);
			mat.emissiveIntensity = ring.emissiveCollected;
		}
	}

	return collected;
}
