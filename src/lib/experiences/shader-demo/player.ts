import type { ExperienceState } from "../types";
import type { ShaderDemoState } from "./scene";

/**
 * Map orientation input to shader uniforms.
 * pitch → distortion amount, roll → color shift.
 */
export function updatePlayer(
	orientation: { pitch: number; roll: number },
	_speed: { accelerate: boolean; brake: boolean },
	state: ExperienceState,
	_delta: number,
): void {
	const s = state as ShaderDemoState;
	const uniforms = s.material.uniforms;

	// Pitch [-1, 1] → distortion [0, 2]
	uniforms.uDistortion.value = (orientation.pitch + 1) * 1.0;

	// Roll [-1, 1] → color shift [0, 6.28]
	uniforms.uColorShift.value = (orientation.roll + 1) * 3.14;
}
