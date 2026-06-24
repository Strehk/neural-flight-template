// ── Becoming Many — Input Contract ─────────────────────────────
//
// The one language every control speaks. A control source (keyboard, XR
// controller, network/ICAROS, or anything you add later) implements
// `InputSource` and returns a `FlightIntent` each frame; the `InputHub` merges
// all sources into one resolved intent, and the scene maps that onto the flight
// controller / senses / clock. Adding a control is one file + hub.add(); the
// rest of the system never needs to know the source exists.

/** A discrete, edge-triggered command (fire once, not held). String-tagged so
 *  new commands are a one-line union extension. */
export type InputAction =
	| { kind: "sense"; index: number } // jump to a specific sense (keys 1–7)
	| { kind: "senseNext" }
	| { kind: "sensePrev" }
	| { kind: "transportToggle" } // pause / resume the clock
	| { kind: "transportReset" }; // restart the timeline

/**
 * What a control wants this frame. Orientation axes are nullable: `null` means
 * "this source has no opinion right now" (idle stick, silent network) so it
 * won't stomp a lower-priority source that does. Speed flags + boost are plain
 * booleans (a source either asserts them or leaves them false).
 */
export interface FlightIntent {
	/** Desired pitch in degrees, or null to abstain. */
	pitch: number | null;
	/** Desired roll in degrees, or null to abstain. */
	roll: number | null;
	accelerate: boolean;
	brake: boolean;
	boost: boolean;
	/** Edge-triggered commands raised this frame (consumed by the scene). */
	actions: InputAction[];
}

/** A neutral, do-nothing intent — the merge starting point. */
export function emptyIntent(): FlightIntent {
	return {
		pitch: null,
		roll: null,
		accelerate: false,
		brake: false,
		boost: false,
		actions: [],
	};
}

/**
 * A pluggable control. Sources are polled once per frame and merged by
 * ascending `priority` (higher wins on conflicting orientation/speed).
 */
export interface InputSource {
	/** Stable id — used by hub.get()/remove(). */
	readonly id: string;
	/** Merge priority; higher overrides lower on conflicting axes/flags. */
	readonly priority: number;
	/** Sample the source for this frame. Return a partial intent (only the
	 *  fields it cares about) or null to contribute nothing. */
	poll(dt: number): Partial<FlightIntent> | null;
	/** Detach listeners / free resources. */
	dispose(): void;
}
