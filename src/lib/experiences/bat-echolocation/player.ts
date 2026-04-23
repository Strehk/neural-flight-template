import type { ExperienceState } from "../types";
import type { BatEcholocationState } from "./scene";

export function updatePlayer(
	orientation: { pitch: number; roll: number },
	speed: { accelerate: boolean; brake: boolean },
	state: ExperienceState,
	_delta: number,
): void {
	const s = state as BatEcholocationState;
	s.player.setOrientation(orientation.pitch, orientation.roll);
	s.player.setSpeed(speed.accelerate, speed.brake);
}
