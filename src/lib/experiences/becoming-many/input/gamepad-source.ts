// ── Becoming Many — Gamepad / XR Controller Source ─────────────
//
// Quest hand-controller (and desktop gamepad) flight, ported from the legacy
// controller mapping (sinneswandler_test1/controller-input.ts):
//   Right stick (axes 2/3) → roll + pitch (analog, deadzoned)
//   Trigger (button 0 > 0.5) on either hand → boost
//   A (button 4) / B (button 5) on the right → next / prev sense (edge)
//
// Gamepads are found from the active WebXR session's input sources first (always
// fresh inside a session), falling back to navigator.getGamepads() on desktop.
// The source abstains on orientation (returns null axes) when the stick is
// centred, so a connected-but-idle controller never overrides the keyboard or
// network source.

import type { AnyRenderer } from "../../types";
import type { FlightIntent, InputAction, InputSource } from "./types";

const PITCH_CLIMB = 15; // stick up (ry < 0)
const PITCH_DESCEND = 28; // stick down (ry > 0)
const ROLL_MAX = 40;
const BOOST_THRESHOLD = 0.5;
const DEADZONE = 0.15;

function applyDeadzone(v: number, dz: number): number {
	if (Math.abs(v) < dz) return 0;
	return (v - Math.sign(v) * dz) / (1 - dz);
}

function findGamepads(renderer: AnyRenderer): {
	left: Gamepad | null;
	right: Gamepad | null;
} {
	// WebXR path — input sources are always current inside a session.
	const session = renderer.xr?.getSession?.() ?? null;
	if (session) {
		let left: Gamepad | null = null;
		let right: Gamepad | null = null;
		for (const source of session.inputSources) {
			if (!source.gamepad) continue;
			if (source.handedness === "right") right = source.gamepad;
			else if (source.handedness === "left") left = source.gamepad;
		}
		if (left || right) return { left, right };
	}

	// Desktop fallback — split by handedness hint in the id, else by order.
	if (typeof navigator === "undefined" || !navigator.getGamepads) {
		return { left: null, right: null };
	}
	let left: Gamepad | null = null;
	let right: Gamepad | null = null;
	const all: Gamepad[] = [];
	for (const gp of navigator.getGamepads()) {
		if (!gp) continue;
		all.push(gp);
		const id = gp.id.toLowerCase();
		if (id.includes("right")) right = gp;
		else if (id.includes("left")) left = gp;
	}
	if (!right && !left) {
		left = all[0] ?? null;
		right = all[1] ?? all[0] ?? null;
	} else if (!right) {
		right = all.find((g) => g !== left) ?? null;
	} else if (!left) {
		left = all.find((g) => g !== right) ?? null;
	}
	return { left, right };
}

export class GamepadSource implements InputSource {
	readonly id = "gamepad";
	readonly priority = 20;

	private readonly renderer: AnyRenderer;
	private prevA = false;
	private prevB = false;

	constructor(renderer: AnyRenderer) {
		this.renderer = renderer;
	}

	poll(): Partial<FlightIntent> | null {
		const { left, right } = findGamepads(this.renderer);
		if (!left && !right) return null;

		const rTrigger = right?.buttons[0]?.value ?? 0;
		const lTrigger = left?.buttons[0]?.value ?? 0;
		const boost = rTrigger > BOOST_THRESHOLD || lTrigger > BOOST_THRESHOLD;

		// Orientation only when the stick is actually pushed (abstain otherwise).
		const rx = applyDeadzone(right?.axes[2] ?? 0, DEADZONE);
		const ry = applyDeadzone(right?.axes[3] ?? 0, DEADZONE);
		let pitch: number | null = null;
		let roll: number | null = null;
		if (rx !== 0 || ry !== 0) {
			pitch = ry < 0 ? ry * PITCH_CLIMB : ry * PITCH_DESCEND;
			roll = rx * ROLL_MAX;
		}

		// Edge-triggered sense cycling on A / B.
		const actions: InputAction[] = [];
		const aPressed = right?.buttons[4]?.pressed ?? false;
		if (aPressed && !this.prevA) actions.push({ kind: "senseNext" });
		this.prevA = aPressed;
		const bPressed = right?.buttons[5]?.pressed ?? false;
		if (bPressed && !this.prevB) actions.push({ kind: "sensePrev" });
		this.prevB = bPressed;

		return { pitch, roll, accelerate: false, brake: false, boost, actions };
	}

	dispose(): void {
		// No listeners — gamepads are polled.
	}
}
