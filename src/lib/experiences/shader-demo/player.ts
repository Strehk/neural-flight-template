// ============================================================================
// player.ts — Maps ICAROS orientation input to shader uniforms
//
// Called every frame with the latest orientation data from ICAROS device,
// gyroscope, or desktop controller. Map pitch/roll to meaningful shader
// parameters for an immersive body-controlled experience.
//
// CUSTOMIZE: Choose which uniforms respond to pitch and roll.
// ============================================================================

import type { ExperienceState } from "../types";
import type { ShaderDemoState } from "./scene";

export function updatePlayer(
	orientation: { pitch: number; roll: number },
	_speed: { accelerate: boolean; brake: boolean },
	state: ExperienceState,
	_delta: number,
): void {
	const s = state as ShaderDemoState;
	const uniforms = s.material.uniforms;

	// Pitch [-1, 1] -> distortion [0, 2]
	uniforms.uDistortion.value = (orientation.pitch + 1) * 1.0;

	// Roll [-1, 1] -> color shift [0, 6.28]
	uniforms.uColorShift.value = (orientation.roll + 1) * 3.14;
}
