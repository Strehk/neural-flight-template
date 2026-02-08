/**
 * LFO Modulator Node — Example Composition
 *
 * Combines external signal input with a manual offset slider,
 * feeds the sum into an LFO oscillator.
 *
 * Internal pipeline:
 *   Input(signal_in) → SignalAdder(a)
 *   Slider(signal_offset) → SignalAdder(b)
 *   SignalAdder(signal_speed) → LFO(speedMod) → Output(signal_lfo_wave)
 *
 * Exposed ports:
 *   Input:  signal_in (left handle)
 *   Output: signal_lfo_wave (right handle)
 *
 * Components: 3 (SignalAdder + Slider + LFO)
 */

import { Activity } from "lucide-svelte";
import { COMPONENT_LFO_UI } from "../components/lfo_ui";
import { COMPONENT_ADDER } from "../components/signal_adder";
import { COMPONENT_SLIDER_UI } from "../components/slider_ui";
import type { NodeDef } from "./types";

export const NODE_LFO_MODULATOR: NodeDef = {
	type: "lfo-modulator",
	label: "LFO Modulator",
	category: "input",
	icon: Activity,

	components: [
		{
			id: "adder",
			signal: COMPONENT_ADDER,
			inputWires: { a: "signal_in", b: "signal_offset" },
			outputWires: { sum: "signal_speed" },
		},
		{
			id: "slider",
			signal: COMPONENT_SLIDER_UI,
			inputWires: {},
			outputWires: { out: "signal_offset" },
		},
		{
			id: "osc",
			signal: COMPONENT_LFO_UI,
			inputWires: { speedMod: "signal_speed" },
			outputWires: { wave: "signal_lfo_wave" },
		},
	],

	inputs: [
		{ id: "signal_in", label: "Signal In", side: "left", portType: "number" },
	],
	outputs: [
		{
			id: "signal_lfo_wave",
			label: "LFO Wave",
			side: "right",
			portType: "number",
		},
	],
};
