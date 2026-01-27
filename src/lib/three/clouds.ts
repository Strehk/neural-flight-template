import * as THREE from "three";
import { CLOUDS } from "$lib/config/flight";

function seededRandom(seed: number): number {
	let h = (seed * 2654435761) | 0;
	h = ((h >>> 16) ^ h) * 0x45d9f3b;
	h = ((h >>> 16) ^ h) * 0x45d9f3b;
	h = (h >>> 16) ^ h;
	return (h & 0x7fffffff) / 0x7fffffff;
}

/** Create low-poly cloud groups as a single merged mesh. */
export function createClouds(): THREE.Group {
	const group = new THREE.Group();
	const mat = new THREE.MeshStandardMaterial({
		color: CLOUDS.COLOR,
		flatShading: true,
		transparent: true,
		opacity: CLOUDS.OPACITY,
	});

	for (let c = 0; c < CLOUDS.COUNT; c++) {
		const cx = (seededRandom(c * 7) - 0.5) * CLOUDS.SPREAD * 2;
		const cz = (seededRandom(c * 7 + 1) - 0.5) * CLOUDS.SPREAD * 2;
		const cy = CLOUDS.HEIGHT_MIN + seededRandom(c * 7 + 2) * (CLOUDS.HEIGHT_MAX - CLOUDS.HEIGHT_MIN);

		const blobCount =
			CLOUDS.BLOB_COUNT[0] +
			Math.floor(seededRandom(c * 7 + 3) * (CLOUDS.BLOB_COUNT[1] - CLOUDS.BLOB_COUNT[0] + 1));

		const cloudGroup = new THREE.Group();
		cloudGroup.position.set(cx, cy, cz);

		for (let b = 0; b < blobCount; b++) {
			const radius =
				CLOUDS.BLOB_RADIUS[0] +
				seededRandom(c * 100 + b) * (CLOUDS.BLOB_RADIUS[1] - CLOUDS.BLOB_RADIUS[0]);
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
