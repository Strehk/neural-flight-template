/**
 * Gradient Prism — Animated prismatic surface shaders for InstancedMesh
 *
 * Both shaders manually apply `instanceMatrix` because Three.js
 * only auto-injects instance transforms for built-in materials, not ShaderMaterial.
 *
 * Two materials:
 * 1. Gradient cubes — vivid, self-illuminated with slow color cycling + brightness pulse
 * 2. Dark cubes — rough stone-like surfaces with animated noise crawl
 *
 * Both include manual fog integration (Three.js fog doesn't work on ShaderMaterial).
 */
import * as THREE from "three";
import darkFrag from "./shaders/dark.frag?raw";
import darkVert from "./shaders/dark.vert?raw";
import gradientFrag from "./shaders/gradient.frag?raw";
import gradientVert from "./shaders/gradient.vert?raw";

export function createGradientCubeMaterial(
	fogNear: number,
	fogFar: number,
	fogColor: THREE.Color,
): THREE.ShaderMaterial {
	return new THREE.ShaderMaterial({
		vertexShader: gradientVert,
		fragmentShader: gradientFrag,
		transparent: true,
		depthWrite: true,
		uniforms: {
			uTime: { value: 0 },
			uHueShift: { value: 0 },
			uPlayerY: { value: 0 },
			uFogNear: { value: fogNear },
			uFogFar: { value: fogFar },
			uFogColor: { value: fogColor },
		},
	});
}

export function createDarkCubeMaterial(
	fogNear: number,
	fogFar: number,
	fogColor: THREE.Color,
): THREE.ShaderMaterial {
	return new THREE.ShaderMaterial({
		vertexShader: darkVert,
		fragmentShader: darkFrag,
		uniforms: {
			uBaseColor: { value: new THREE.Color(0.28, 0.26, 0.32) },
			uPlayerY: { value: 0 },
			uTime: { value: 0 },
			uFogNear: { value: fogNear },
			uFogFar: { value: fogFar },
			uFogColor: { value: fogColor },
		},
	});
}
