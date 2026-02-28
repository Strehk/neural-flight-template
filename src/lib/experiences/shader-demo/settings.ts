// ============================================================================
// settings.ts — Maps parameter IDs to shader uniform updates
//
// Called when the user changes a slider in the Settings Sidebar or when the
// Node Editor sends a new value. Each case must match a parameter.id from
// manifest.ts and update the corresponding uniform or state field.
//
// CUSTOMIZE: Add a case for each parameter you define in manifest.ts.
// ============================================================================

import type * as THREE from "three";
import type { ExperienceState } from "../types";
import type { ShaderDemoState } from "./scene";

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
