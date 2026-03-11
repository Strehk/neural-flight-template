/**
 * ReflectiveGround — Mirror-like ground plane with configurable roughness
 *
 * Uses MeshPhysicalMaterial for realistic PBR reflections.
 * More generic alternative to water.ts — works for abstract/futuristic scenes.
 *
 * @example
 * const ground = createReflectiveGround({ roughness: 0.1, color: 0x111111 });
 * scene.add(ground);
 */
import * as THREE from "three";

export interface ReflectiveGroundConfig {
	size?: number;
	color?: number;
	roughness?: number;
	metalness?: number;
	opacity?: number;
	yPosition?: number;
}

const DEFAULTS: Required<ReflectiveGroundConfig> = {
	size: 200,
	color: 0x111122,
	roughness: 0.15,
	metalness: 0.9,
	opacity: 0.8,
	yPosition: 0,
};

export function createReflectiveGround(
	config?: ReflectiveGroundConfig,
): THREE.Mesh {
	const c = { ...DEFAULTS, ...config };

	const geo = new THREE.PlaneGeometry(c.size, c.size);
	geo.rotateX(-Math.PI / 2);

	const mat = new THREE.MeshPhysicalMaterial({
		color: c.color,
		roughness: c.roughness,
		metalness: c.metalness,
		transparent: c.opacity < 1.0,
		opacity: c.opacity,
		envMapIntensity: 1.0,
		clearcoat: 0.3,
		clearcoatRoughness: 0.1,
	});

	const mesh = new THREE.Mesh(geo, mat);
	mesh.position.y = c.yPosition;
	mesh.receiveShadow = true;
	return mesh;
}
