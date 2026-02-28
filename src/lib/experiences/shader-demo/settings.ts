import type * as THREE from "three";
import type { ExperienceState } from "../types";
import type { ShaderDemoState } from "./scene";

/** Map parameter IDs from manifest to shader uniform updates. */
export function applySettings(
	id: string,
	value: number | boolean | string,
	state: ExperienceState,
	_scene: THREE.Scene,
): void {
	const s = state as ShaderDemoState;
	const uniforms = s.material.uniforms;

	switch (id) {
		case "noiseScale":
			uniforms.uNoiseScale.value = value as number;
			break;
		case "speed":
			s.animSpeed = value as number;
			break;
		case "colorShift":
			uniforms.uColorShift.value = value as number;
			break;
		case "distortion":
			uniforms.uDistortion.value = value as number;
			break;
		case "brightness":
			uniforms.uBrightness.value = value as number;
			break;
		default:
			break;
	}
}
