/**
 * LFO Signal Node — Low Frequency Oscillator
 *
 * Outputs a 0-1 sine wave. Speed can be modulated by another LFO.
 */

import type { SignalNodeDef, ComputeResult, SignalValue } from "../graph/types";
import { clamp01 } from "../graph/types";
import { registerNodeType } from "../graph/engine";

interface LfoState {
	/** Current phase (0-1) */
	phase: number;
	/** Base speed in Hz */
	baseSpeed: number;
}

export const LFO_NODE: SignalNodeDef = {
	type: "lfo",
	label: "LFO",
	inputs: [
		{
			id: "speedMod",
			label: "Speed Mod",
			default: 0.5, // Neutral: no modulation at 0.5
		},
	],
	outputs: [
		{
			id: "wave",
			label: "Wave",
			default: 0.5,
		},
	],
	createState: (): LfoState => ({
		phase: 0,
		baseSpeed: 0.1,
	}),
	compute: (
		inputs: Record<string, SignalValue>,
		state: unknown,
		dt: number,
	): ComputeResult => {
		const s = state as LfoState;

		// SpeedMod: 0 = 0.25x speed, 0.5 = 1x, 1 = 4x speed
		const speedMod = inputs.speedMod ?? 0.5;
		const speedMultiplier = 0.25 + speedMod * 3.75; // Range: 0.25 to 4.0

		const effectiveSpeed = s.baseSpeed * speedMultiplier;
		const newPhase = (s.phase + effectiveSpeed * dt) % 1;

		// Sine wave normalized to 0-1
		const wave = clamp01((Math.sin(newPhase * Math.PI * 2) + 1) / 2);

		return {
			outputs: { wave },
			state: { ...s, phase: newPhase },
		};
	},
};

/** Update LFO base speed (called from UI) */
export function setLfoSpeed(state: LfoState, speed: number): LfoState {
	return { ...state, baseSpeed: Math.max(0.01, speed) };
}

// Auto-register
registerNodeType(LFO_NODE);
