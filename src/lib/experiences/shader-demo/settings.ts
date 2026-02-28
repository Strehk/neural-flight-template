// ============================================================================
// settings.ts — Map parameter IDs to shader uniform / state updates
//
// Called when the user changes a slider in the Settings Sidebar or when the
// Node Editor sends a new value. Each case must match a parameter.id from
// manifest.ts.
//
// Parameter → uniform flow:
//   1. User moves slider (or Node Editor sends signal)
//   2. Loader calls applySettings(id, value, state, scene)
//   3. This function updates the corresponding uniform or FlightPlayer property
//   4. Next tick() renders with the new value (shaders read uniforms each frame)
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
	const terrain = s.terrain.material.uniforms;
	const water = s.water.material.uniforms;

	switch (id) {
		// ── Flight ──────────────────────────────────────
		// These mutate FlightPlayer properties — tick() reads them each frame
		case "baseSpeed":
			s.player.baseSpeed = value as number;
			break;

		case "lerpAlpha":
			s.player.lerpAlpha = value as number;
			break;

		case "minClearance":
			s.player.minClearance = value as number;
			break;

		// ── Terrain ─────────────────────────────────────
		case "terrainHeight":
			terrain.uTerrainHeight.value = value as number;
			break;

		case "terrainScale":
			// UI "scale" is intuitive (bigger = bigger features).
			// The shader uniform is the noise frequency (inverse relationship).
			// scale=2 → freq=0.005, scale=0.5 → freq=0.02, scale=5 → freq=0.002
			terrain.uTerrainScale.value = 0.01 / (value as number);
			break;

		case "colorSpeed":
			terrain.uColorSpeed.value = value as number;
			break;

		case "brightness":
			// Brightness affects both terrain and water for consistent look
			terrain.uBrightness.value = value as number;
			water.uBrightness.value = value as number;
			break;

		// ── Water ───────────────────────────────────────
		case "waterLevel":
			s.water.mesh.position.y = value as number;
			break;

		case "waveAmplitude":
			water.uWaveAmplitude.value = value as number;
			break;

		case "waveSpeed":
			water.uWaveSpeed.value = value as number;
			break;

		// ── Atmosphere ──────────────────────────────────
		// Fog uniforms exist on both terrain and water materials
		case "fogNear":
			terrain.uFogNear.value = value as number;
			water.uFogNear.value = value as number;
			break;

		case "fogFar":
			terrain.uFogFar.value = value as number;
			water.uFogFar.value = value as number;
			break;

		default:
			break;
	}
}
