// ============================================================================
// player.ts — Forward ICAROS orientation/speed to FlightPlayer
//
// This file delegates all input to FlightPlayer (shared lib). The pattern is
// identical to mountain-flight/player.ts. FlightPlayer handles:
//   - Pitch/roll → heading + forward vector
//   - Accelerate (2× boost) / brake (0.25× speed)
//   - Terrain clamping (minClearance above heightmap)
//
// Actual physics run in tick() via player.tick(delta) — this function only
// stores the latest input values for the next physics step.
//
// CUSTOMIZE: For non-flight experiences, replace this with custom input mapping
// (e.g. pitch → shader uniform instead of camera movement).
// ============================================================================

import type { ExperienceState } from "../types";
import type { ShaderDemoState } from "./scene";

export function updatePlayer(
	orientation: { pitch: number; roll: number },
	speed: { accelerate: boolean; brake: boolean },
	state: ExperienceState,
	_delta: number,
): void {
	const s = state as ShaderDemoState;

	// Forward orientation — FlightPlayer lerps toward these targets each tick
	s.player.updateOrientation({
		type: "orientation",
		pitch: orientation.pitch,
		roll: orientation.roll,
		timestamp: 0,
	});

	// Forward speed commands — boost/brake/cruise
	if (speed.accelerate) {
		s.player.updateSpeed({
			type: "speed",
			action: "accelerate",
			active: true,
			timestamp: 0,
		});
	} else if (speed.brake) {
		s.player.updateSpeed({
			type: "speed",
			action: "brake",
			active: true,
			timestamp: 0,
		});
	} else {
		s.player.updateSpeed({
			type: "speed",
			action: "accelerate",
			active: false,
			timestamp: 0,
		});
	}
}
