/**
 * ⚠️ TEMPORARY DEFAULTS — Will move to experience manifest (Step 2).
 * These values currently mirror config/flight.ts TERRAIN.WATER_* constants.
 * After migration: each experience passes its own config, no defaults here.
 */
import * as THREE from "three";

export interface WaterConfig {
	size?: number;
	color?: number;
	opacity?: number;
	y?: number;
}

const DEFAULTS: Required<WaterConfig> = {
	size: 4000,
	color: 0x2980b9,
	opacity: 0.6,
	y: 5,
};

/** Create a flat, transparent water plane. */
export function createWater(config?: WaterConfig): THREE.Mesh {
	const c = { ...DEFAULTS, ...config };

	const geo = new THREE.PlaneGeometry(c.size, c.size);
	const mat = new THREE.MeshStandardMaterial({
		color: c.color,
		transparent: true,
		opacity: c.opacity,
		side: THREE.DoubleSide,
	});
	const mesh = new THREE.Mesh(geo, mat);
	mesh.receiveShadow = true;
	mesh.rotation.x = -Math.PI / 2;
	mesh.position.y = c.y;
	return mesh;
}
