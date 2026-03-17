import type { ExperienceState } from "../types";
import type { CloudTowersState } from "./scene";

export function updatePlayer(
	orientation: { pitch: number; roll: number },
	speed: { accelerate: boolean; brake: boolean },
	state: ExperienceState,
	_delta: number,
): void {
	const s = state as CloudTowersState;

	s.player.updateOrientation({
		type: "orientation",
		pitch: orientation.pitch,
		roll: orientation.roll,
		timestamp: 0,
	});

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
