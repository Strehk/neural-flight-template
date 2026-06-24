// ── Becoming Many — Network Source ─────────────────────────────
//
// The platform input path (phone gyro / ICAROS / controller app), arriving over
// the WebSocket as orientation + speed and handed to us via the manifest's
// updatePlayer() hook. Here it's just another swappable control: updatePlayer
// calls setNet(), and poll() reports the latest values. Lowest priority, so a
// local keyboard/controller overrides it when present.

import type { FlightIntent, InputSource } from "./types";

export class NetworkSource implements InputSource {
	readonly id = "network";
	readonly priority = 5;

	private pitch = 0;
	private roll = 0;
	private accelerate = false;
	private brake = false;
	/** Stays false until the first real message, so we abstain before any input. */
	private active = false;

	/** Fed each frame by updatePlayer() with the latest WebSocket values. */
	setNet(
		orientation: { pitch: number; roll: number },
		speed: { accelerate: boolean; brake: boolean },
	): void {
		this.pitch = orientation.pitch;
		this.roll = orientation.roll;
		this.accelerate = speed.accelerate;
		this.brake = speed.brake;
		this.active = true;
	}

	poll(): Partial<FlightIntent> | null {
		if (!this.active) return null;
		return {
			pitch: this.pitch,
			roll: this.roll,
			accelerate: this.accelerate,
			brake: this.brake,
			boost: false,
			actions: [],
		};
	}

	dispose(): void {
		this.active = false;
	}
}
