import * as THREE from "three";
import { TERRAIN } from "$lib/config/flight";

/** Create a flat, transparent water plane. */
export function createWater(): THREE.Mesh {
	const geo = new THREE.PlaneGeometry(TERRAIN.WATER_SIZE, TERRAIN.WATER_SIZE);
	const mat = new THREE.MeshStandardMaterial({
		color: TERRAIN.WATER_COLOR,
		transparent: true,
		opacity: TERRAIN.WATER_OPACITY,
		side: THREE.DoubleSide,
	});
	const mesh = new THREE.Mesh(geo, mat);
	mesh.receiveShadow = true;
	mesh.rotation.x = -Math.PI / 2;
	mesh.position.y = TERRAIN.WATER_Y;
	return mesh;
}
