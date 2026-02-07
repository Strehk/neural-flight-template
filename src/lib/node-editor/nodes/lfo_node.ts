/**
 * LFO Node — Low Frequency Oscillator (Unified)
 *
 * Signal: Sine wave 0-1, speed-modulatable
 * Module: WaveBar visualization + speed knob
 */

import { LFO_SIGNAL, setLfoSpeed } from "../components/lfo";
import { LFO_MODULE } from "../components/lfo_ui";
import { registerNode } from "./registry";
import type { NodeDef } from "./types";

export const LFO_NODE: NodeDef = {
	type: "lfo",
	label: "LFO",
	description: "Low frequency oscillator (0-1)",
	category: "input",
	signal: LFO_SIGNAL,
	module: LFO_MODULE,
	syncOutputs: (instance, node) => {
		const wave = instance.outputs.wave ?? 0.5;
		const state = instance.state as { phase: number };
		if (node.data.wave === wave) return null;
		return { wave, phase: state.phase };
	},
	syncInputs: (node, instance) => {
		const speed = (node.data.speed as number) ?? 0.1;
		instance.state = setLfoSpeed(
			instance.state as { phase: number; baseSpeed: number },
			speed,
		);
	},
};

registerNode(LFO_NODE);
