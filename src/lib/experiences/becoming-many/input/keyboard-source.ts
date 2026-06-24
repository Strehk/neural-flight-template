// ── Becoming Many — Keyboard Source ────────────────────────────
//
// Desktop control: WASD fly, Shift boosts; the number row + N/P switch senses,
// Space/R drive the clock transport. Ported from the legacy keyboard mapping
// (sinneswandler_test1/keyboard-input.ts), with one change agreed for this repo:
// boost moved off Space (now pause/transport) onto Shift, so nothing collides.
//
// Held keys (steering/boost) live in a Set and are reported every poll(); the
// discrete keys (sense/transport) queue edge-triggered actions drained on poll.

import type { FlightIntent, InputAction, InputSource } from "./types";

const PITCH_CLIMB = -15; // W: nose up → climb
const PITCH_DESCEND = 28; // S: nose down → descend (never reverses)
const ROLL_AMOUNT = 40; // A / D
const BOOST_MULTIPLIER_KEYS = ["ShiftLeft", "ShiftRight"];
const STEER_KEYS = ["KeyW", "KeyS", "KeyA", "KeyD", ...BOOST_MULTIPLIER_KEYS];

// Discrete keys → the action they raise (Digit1–7 handled separately).
const ACTION_KEYS: Record<string, InputAction> = {
	KeyN: { kind: "senseNext" },
	KeyP: { kind: "sensePrev" },
	Space: { kind: "transportToggle" },
	KeyR: { kind: "transportReset" },
};

export class KeyboardSource implements InputSource {
	readonly id = "keyboard";
	readonly priority = 10;

	private readonly held = new Set<string>();
	private pending: InputAction[] = [];
	private readonly target: Window;
	private readonly onDown: (e: KeyboardEvent) => void;
	private readonly onUp: (e: KeyboardEvent) => void;

	constructor(target: Window = window) {
		this.target = target;
		this.onDown = (e) => {
			if (STEER_KEYS.includes(e.code)) this.held.add(e.code);

			if (e.repeat) return; // edge-triggered only below

			// Digit1–7 → jump to sense index 0–6.
			if (e.code.startsWith("Digit")) {
				const n = Number(e.code.slice(5));
				if (n >= 1 && n <= 7) this.pending.push({ kind: "sense", index: n - 1 });
				return;
			}
			const action = ACTION_KEYS[e.code];
			if (action) {
				if (e.code === "Space") e.preventDefault(); // no page scroll
				this.pending.push(action);
			}
		};
		this.onUp = (e) => this.held.delete(e.code);
		target.addEventListener("keydown", this.onDown);
		target.addEventListener("keyup", this.onUp);
	}

	poll(): Partial<FlightIntent> | null {
		const actions = this.pending;
		this.pending = [];

		const fwd = this.held.has("KeyW");
		const back = this.held.has("KeyS");
		const left = this.held.has("KeyA");
		const right = this.held.has("KeyD");
		const boost = BOOST_MULTIPLIER_KEYS.some((k) => this.held.has(k));
		const steering = fwd || back || left || right;

		if (!steering && !boost && actions.length === 0) return null;

		return {
			// Abstain on the axes unless a steer key is down, so a lone Shift or a
			// sense keypress doesn't yank the look back to level.
			pitch: steering ? (fwd ? PITCH_CLIMB : back ? PITCH_DESCEND : 0) : null,
			roll: steering ? (left ? -ROLL_AMOUNT : 0) + (right ? ROLL_AMOUNT : 0) : null,
			accelerate: fwd, // S only descends, never reverses
			boost,
			actions,
		};
	}

	dispose(): void {
		this.target.removeEventListener("keydown", this.onDown);
		this.target.removeEventListener("keyup", this.onUp);
		this.held.clear();
		this.pending = [];
	}
}
