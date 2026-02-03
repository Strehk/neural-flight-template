import * as THREE from "three";
import { RINGS, TERRAIN } from "$lib/config/flight";
import {
	DEFAULT_HEIGHTMAP,
	getHeight,
	type HeightmapConfig,
} from "./terrain/heightmap";

function seededRandom(a: number, b: number): number {
	let h = (a * 2654435761) ^ (b * 2246822519);
	h = ((h >>> 16) ^ h) * 0x45d9f3b;
	h = ((h >>> 16) ^ h) * 0x45d9f3b;
	h = (h >>> 16) ^ h;
	return (h & 0x7fffffff) / 0x7fffffff;
}

export interface RingState {
	mesh: THREE.Mesh;
	collected: boolean;
	center: THREE.Vector3;
}

export interface ChunkRings {
	rings: RingState[];
	dispose(): void;
}

const ringGeo = new THREE.TorusGeometry(
	RINGS.RADIUS,
	RINGS.TUBE_RADIUS,
	RINGS.SEGMENTS[0],
	RINGS.SEGMENTS[1],
);

/** Create rings for a single terrain chunk. */
export function createChunkRings(
	chunkX: number,
	chunkZ: number,
	config: HeightmapConfig = DEFAULT_HEIGHTMAP,
	ringCount: number = RINGS.PER_CHUNK,
): ChunkRings {
	const size = TERRAIN.CHUNK_SIZE;
	const worldX = chunkX * size;
	const worldZ = chunkZ * size;
	const seed = chunkX * 48611 + chunkZ * 97213;
	const rings: RingState[] = [];

	for (let i = 0; i < ringCount; i++) {
		const lx = (seededRandom(seed + i, 10) - 0.5) * size;
		const lz = (seededRandom(seed + i, 11) - 0.5) * size;
		const wx = lx + worldX;
		const wz = lz + worldZ;
		const terrainY = getHeight(wx, wz, config);
		const y =
			terrainY +
			RINGS.HEIGHT_BASE +
			seededRandom(seed + i, 12) * RINGS.HEIGHT_VARIATION;

		const mat = new THREE.MeshStandardMaterial({
			color: RINGS.COLOR,
			emissive: RINGS.COLOR,
			emissiveIntensity: RINGS.EMISSIVE,
			side: THREE.DoubleSide,
		});
		const mesh = new THREE.Mesh(ringGeo, mat);
		mesh.position.set(wx, y, wz);
		mesh.rotation.y = seededRandom(seed + i, 13) * Math.PI;

		rings.push({
			mesh,
			collected: false,
			center: new THREE.Vector3(wx, y, wz),
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
		if (ring.center.distanceTo(playerPos) < RINGS.COLLECT_DISTANCE) {
			ring.collected = true;
			collected++;
			const mat = ring.mesh.material as THREE.MeshStandardMaterial;
			mat.color.setHex(RINGS.COLLECTED_COLOR);
			mat.emissive.setHex(RINGS.COLLECTED_COLOR);
			mat.emissiveIntensity = RINGS.EMISSIVE_COLLECTED;
		}
	}

	return collected;
}
