import type { ExperienceState } from "../types";

// ── Player Movement — scaffold stub ────────────────────────────
//
// Intentionally a no-op for now. The scaffold has no movement: it only proves the
// WebGPU + WebXR render pipeline stands up.
//
// LONG-TERM: this is where "Becoming Many" will grow its flight controller to
// mirror Sinneswandler — pitch/roll → orientation, accelerate/brake → speed,
// driving a player rig (see flight-controller.ts in sinneswandler_test1 and the
// shared FlightPlayer in src/lib/three/player.ts for the WebGL reference).
//
// To enable input wiring later: set `interfaces.orientation`/`.speed` in
// manifest.ts and read `orientation`/`speed` here into player state.

export function updatePlayer(
	_orientation: { pitch: number; roll: number },
	_speed: { accelerate: boolean; brake: boolean },
	_state: ExperienceState,
	_delta: number,
): void {
	// no-op (scaffold)
}
