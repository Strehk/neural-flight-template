/**
 * LFO (Low Frequency Oscillator) Node
 * Generates a sine wave from 0-1 at configurable speed
 */

import type { NodeDef } from "../types";

export const lfoNode: NodeDef = {
	type: "lfo",
	category: "input",
	label: "LFO",
	inputs: [{ id: "speed", label: "Speed (Hz)", type: "number", default: 0.3 }],
	outputs: [{ id: "wave", label: "Wave", type: "number", default: 0 }],
	tick: (inputs, state, dt) => {
		const speed = (inputs.speed as number) ?? 0.3;
		const prevPhase = typeof state.phase === "number" ? state.phase : 0;
		const phase = (prevPhase + speed * dt) % 1;

		// Sine wave mapped to 0-1 range
		const wave = (Math.sin(phase * Math.PI * 2) + 1) / 2;

		return {
			outputs: { wave },
			state: { phase },
		};
	},
};
