import * as THREE from "three";
import { CLOUDS } from "$lib/config/flight";

function seededRandom(seed: number): number {
	let h = (seed * 2654435761) | 0;
	h = ((h >>> 16) ^ h) * 0x45d9f3b;
	h = ((h >>> 16) ^ h) * 0x45d9f3b;
	h = (h >>> 16) ^ h;
	return (h & 0x7fffffff) / 0x7fffffff;
}

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
export function createClouds(count: number = CLOUDS.COUNT, height = 0): THREE.Group {
	const group = new THREE.Group();
	const mat = new THREE.MeshStandardMaterial({
		color: CLOUDS.COLOR,
		flatShading: true,
		transparent: true,
		opacity: CLOUDS.OPACITY,
	});

	const heightMin = height > 0 ? height - 50 : CLOUDS.HEIGHT_MIN;
	const heightMax = height > 0 ? height + 50 : CLOUDS.HEIGHT_MAX;

	for (let c = 0; c < count; c++) {
		const cx = (seededRandom(c * 7) - 0.5) * CLOUDS.SPREAD * 2;
		const cz = (seededRandom(c * 7 + 1) - 0.5) * CLOUDS.SPREAD * 2;
		const cy = heightMin + seededRandom(c * 7 + 2) * (heightMax - heightMin);

		const blobCount =
			CLOUDS.BLOB_COUNT[0] +
			Math.floor(
				seededRandom(c * 7 + 3) *
					(CLOUDS.BLOB_COUNT[1] - CLOUDS.BLOB_COUNT[0] + 1),
			);

		const cloudGroup = new THREE.Group();
		cloudGroup.position.set(cx, cy, cz);

		for (let b = 0; b < blobCount; b++) {
			const radius =
				CLOUDS.BLOB_RADIUS[0] +
				seededRandom(c * 100 + b) *
					(CLOUDS.BLOB_RADIUS[1] - CLOUDS.BLOB_RADIUS[0]);
			const geo = new THREE.DodecahedronGeometry(radius, 1);
			const blob = new THREE.Mesh(geo, mat);

			blob.position.set(
				(seededRandom(c * 100 + b + 50) - 0.5) * 30,
				(seededRandom(c * 100 + b + 60) - 0.5) * 8,
				(seededRandom(c * 100 + b + 70) - 0.5) * 20,
			);
			blob.scale.set(
				1 + seededRandom(c * 100 + b + 80) * 0.5,
				0.5 + seededRandom(c * 100 + b + 90) * 0.3,
				1 + seededRandom(c * 100 + b + 95) * 0.5,
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
 * Each cloud group drifts slowly in DRIFT_DIRECTION at DRIFT_SPEED.
 * When a cloud drifts too far from the player, it wraps to the opposite side.
 *
 * @param clouds - The cloud group returned by createClouds()
 * @param delta - Frame delta time in seconds
 * @param playerPos - Current player position (for wrapping relative to player)
 */
export function updateClouds(
	clouds: THREE.Group,
	delta: number,
	playerPos: THREE.Vector3,
): void {
	// ─── YOUR DRIFT LOGIC HERE (≈8 lines) ──────────────
	//
	// For each cloud child in clouds.children:
	//   1. Move it by DRIFT_DIRECTION * DRIFT_SPEED * delta
	//   2. Check distance from playerPos on X and Z axes
	//   3. If too far (> CLOUDS.SPREAD), wrap to opposite side
	//
	// Consider:
	//   - Normalize DRIFT_DIRECTION for consistent speed
	//   - Wrap threshold = CLOUDS.SPREAD (same as spawn spread)
	//   - Only wrap on the axis that's out of bounds
	// ─────────────────────────────────────────────────────

	const dirLen = Math.hypot(CLOUDS.DRIFT_DIRECTION.x, CLOUDS.DRIFT_DIRECTION.z);
	const dx = (CLOUDS.DRIFT_DIRECTION.x / dirLen) * CLOUDS.DRIFT_SPEED * delta;
	const dz = (CLOUDS.DRIFT_DIRECTION.z / dirLen) * CLOUDS.DRIFT_SPEED * delta;
	const limit = CLOUDS.SPREAD;

	for (const cloud of clouds.children) {
		cloud.position.x += dx;
		cloud.position.z += dz;

		if (cloud.position.x - playerPos.x > limit) cloud.position.x -= limit * 2;
		if (cloud.position.x - playerPos.x < -limit) cloud.position.x += limit * 2;
		if (cloud.position.z - playerPos.z > limit) cloud.position.z -= limit * 2;
		if (cloud.position.z - playerPos.z < -limit) cloud.position.z += limit * 2;
	}
}
