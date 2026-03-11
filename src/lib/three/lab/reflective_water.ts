/**
 * TSL Reflective Water — Dark mirror surface with animated wave distortion.
 *
 * Uses MeshPhysicalNodeMaterial with environment-map-based reflections
 * instead of planar Reflector addon. Wave distortion applied via normalNode.
 */

import { cos, Fn, float, normalLocal, sin, time, uniform, uv } from "three/tsl";
import * as THREE from "three/webgpu";

export interface ReflectiveWaterConfig {
	size?: number;
	waveSpeed?: number;
	waveScale?: number;
	tintColor?: THREE.Color;
}

const DEFAULTS: Required<ReflectiveWaterConfig> = {
	size: 60,
	waveSpeed: 0.4,
	waveScale: 12.0,
	tintColor: new THREE.Color(0x020208),
};

export interface ReflectiveWaterResult {
	mesh: THREE.Mesh;
	update: (time: number) => void;
	dispose: () => void;
}

const waveNormal = Fn(
	([t, speed, scale]: [THREE.Node, THREE.Node, THREE.Node]) => {
		const u = uv();
		const wave1 = sin(u.x.mul(scale).add(t.mul(speed))).mul(0.15);
		const wave2 = cos(u.y.mul(scale.mul(0.7)).add(t.mul(speed.mul(1.3)))).mul(
			0.1,
		);
		return normalLocal.add(float(wave1.add(wave2)));
	},
);

export function createReflectiveWater(
	config?: ReflectiveWaterConfig,
): ReflectiveWaterResult {
	const c = { ...DEFAULTS, ...config };

	const geometry = new THREE.PlaneGeometry(c.size, c.size, 1, 1);

	const uSpeed = uniform(c.waveSpeed);
	const uScale = uniform(c.waveScale);

	const mat = new THREE.MeshPhysicalNodeMaterial();
	mat.color.copy(c.tintColor);
	mat.transmission = 0.6;
	mat.roughness = 0.15;
	mat.metalness = 0.9;
	mat.ior = 1.33;
	mat.normalNode = waveNormal(time, uSpeed, uScale);

	const mesh = new THREE.Mesh(geometry, mat);
	mesh.rotation.x = -Math.PI / 2;

	function update(_time: number): void {
		// TSL time auto-updates — no manual uniform needed
	}

	function dispose(): void {
		geometry.dispose();
		mat.dispose();
	}

	return { mesh, update, dispose };
}
