/**
 * ⚠️ TEMPORARY DEFAULTS — Will move to experience manifest (Step 2).
 * These values currently mirror config/flight.ts CLOUDS constants.
 * After migration: each experience passes its own config, no defaults here.
 */
import * as THREE from "three";

function seededRandom(seed: number): number {
	let h = (seed * 2654435761) | 0;
	h = ((h >>> 16) ^ h) * 0x45d9f3b;
	h = ((h >>> 16) ^ h) * 0x45d9f3b;
	h = (h >>> 16) ^ h;
	return (h & 0x7fffffff) / 0x7fffffff;
}

export interface CloudConfig {
	count?: number;
	spread?: number;
	heightMin?: number;
	heightMax?: number;
	blobCount?: [number, number];
	blobRadius?: [number, number];
	color?: number;
	opacity?: number;
	driftSpeed?: number;
	driftDirection?: { x: number; z: number };
}

const DEFAULTS: Required<CloudConfig> = {
	count: 40,
	spread: 500,
	heightMin: 150,
	heightMax: 280,
	blobCount: [4, 8],
	blobRadius: [10, 25],
	color: 0xffffff,
	opacity: 0.9,
	driftSpeed: 8,
	driftDirection: { x: 1, z: 0.3 },
};

/** Dispose all geometries in a cloud group. */
export function disposeClouds(group: THREE.Group): void {
	for (const cloudGroup of group.children) {
		if (cloudGroup instanceof THREE.Group) {
			for (const blob of cloudGroup.children) {
				if (blob instanceof THREE.Mesh) blob.geometry.dispose();
			}
		}
	}
	group.clear();
}

/** Create low-poly cloud groups as a single merged mesh. */
export function createClouds(config?: CloudConfig): THREE.Group {
	const c = { ...DEFAULTS, ...config };

	const group = new THREE.Group();
	group.userData.spread = c.spread;
	group.userData.driftSpeed = c.driftSpeed;
	group.userData.driftDirection = c.driftDirection;

	const mat = new THREE.MeshStandardMaterial({
		color: c.color,
		flatShading: true,
		transparent: true,
		opacity: c.opacity,
	});

	for (let i = 0; i < c.count; i++) {
		const cx = (seededRandom(i * 7) - 0.5) * c.spread * 2;
		const cz = (seededRandom(i * 7 + 1) - 0.5) * c.spread * 2;
		const cy =
			c.heightMin + seededRandom(i * 7 + 2) * (c.heightMax - c.heightMin);

		const blobCount =
			c.blobCount[0] +
			Math.floor(
				seededRandom(i * 7 + 3) * (c.blobCount[1] - c.blobCount[0] + 1),
			);

		const cloudGroup = new THREE.Group();
		cloudGroup.position.set(cx, cy, cz);

		for (let b = 0; b < blobCount; b++) {
			const radius =
				c.blobRadius[0] +
				seededRandom(i * 100 + b) * (c.blobRadius[1] - c.blobRadius[0]);
			const geo = new THREE.DodecahedronGeometry(radius, 1);
			const blob = new THREE.Mesh(geo, mat);

			blob.position.set(
				(seededRandom(i * 100 + b + 50) - 0.5) * 30,
				(seededRandom(i * 100 + b + 60) - 0.5) * 8,
				(seededRandom(i * 100 + b + 70) - 0.5) * 20,
			);
			blob.scale.set(
				1 + seededRandom(i * 100 + b + 80) * 0.5,
				0.5 + seededRandom(i * 100 + b + 90) * 0.3,
				1 + seededRandom(i * 100 + b + 95) * 0.5,
			);

			cloudGroup.add(blob);
		}

		group.add(cloudGroup);
	}

	return group;
}

/**
 * 🧑‍💻 TODO (David): Implement the cloud drift logic below.
 *
 * Each cloud group drifts slowly in driftDirection at driftSpeed.
 * When a cloud drifts too far from the player, it wraps to the opposite side.
 *
 * @param clouds - The cloud group returned by createClouds()
 * @param delta - Frame delta time in seconds
 * @param playerPos - Current player position (for wrapping relative to player)
 * @param driftSpeed - Override drift speed (e.g. from runtimeConfig.windSpeed)
 */
export function updateClouds(
	clouds: THREE.Group,
	delta: number,
	playerPos: THREE.Vector3,
	driftSpeed?: number,
): void {
	const spread = (clouds.userData.spread as number) ?? DEFAULTS.spread;
	const direction = (clouds.userData.driftDirection as {
		x: number;
		z: number;
	}) ?? DEFAULTS.driftDirection;
	const speed =
		driftSpeed ?? (clouds.userData.driftSpeed as number) ?? DEFAULTS.driftSpeed;

	const dirLen = Math.hypot(direction.x, direction.z);
	const dx = (direction.x / dirLen) * speed * delta;
	const dz = (direction.z / dirLen) * speed * delta;

	for (const cloud of clouds.children) {
		cloud.position.x += dx;
		cloud.position.z += dz;

		if (cloud.position.x - playerPos.x > spread)
			cloud.position.x -= spread * 2;
		if (cloud.position.x - playerPos.x < -spread)
			cloud.position.x += spread * 2;
		if (cloud.position.z - playerPos.z > spread)
			cloud.position.z -= spread * 2;
		if (cloud.position.z - playerPos.z < -spread)
			cloud.position.z += spread * 2;
	}
}
