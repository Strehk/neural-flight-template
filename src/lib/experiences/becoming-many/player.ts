import type { ExperienceState } from "../types";
import type { NetworkSource } from "./input/network-source";
import type { BecomingManyState } from "./scene";

// ── Player Movement — network input bridge ─────────────────────
//
// The platform feeds device orientation (phone gyro / ICAROS / controller app)
// + speed commands here once per frame, *before* tick(). We don't run physics
// here — we just hand the values to the modular input system's NetworkSource,
// which the hub merges with the keyboard/gamepad sources. The actual flight
// integration happens in tick() off the clock spine (so pause / timeScale affect
// movement too). See input/ and flight-controller.ts.

export function updatePlayer(
	orientation: { pitch: number; roll: number },
	speed: { accelerate: boolean; brake: boolean },
	state: ExperienceState,
	_delta: number,
): void {
	const s = state as BecomingManyState;
	const net = s.input.get("network") as NetworkSource | undefined;
	net?.setNet(orientation, speed);
}
