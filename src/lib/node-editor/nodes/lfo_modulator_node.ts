/**
 * LFO Modulator Node — Example Composition
 *
 * Internal pipeline:
 *   Input(signal_in) → LFO(speedMod)
 *   LFO(wave) → Multiply(a)
 *   Slider(signal_amplitude) → Multiply(b)
 *   Multiply(out) → Output(signal_lfo_wave)
 *
 * Exposed ports:
 *   Input:  signal_in (left handle)
 *   Output: signal_lfo_wave (right handle)
 *
 * Components: 3 (LFO + Multiply + Slider)
 */

import { Activity } from "lucide-svelte";
import { COMPONENT_LFO_UI } from "../components/lfo_ui";
import { COMPONENT_MULTIPLY } from "../components/multiply";
import { COMPONENT_SLIDER_UI } from "../components/slider_ui";
import type { NodeDef } from "./types";

export const NODE_LFO_MODULATOR: NodeDef = {
	type: "lfo-modulator",
	label: "LFO Modulator",
	category: "input",
	icon: Activity,

	components: [
		{
			id: "osc",
			signal: COMPONENT_LFO_UI,
			inputWires: { speedMod: "signal_in" },
			outputWires: { wave: "signal_lfo_wave_raw" },
		},
		{
			id: "multiply",
			signal: COMPONENT_MULTIPLY,
			inputWires: { a: "signal_lfo_wave_raw", b: "signal_amplitude" },
			outputWires: { out: "signal_lfo_wave" },
		},
		{
			id: "slider",
			signal: COMPONENT_SLIDER_UI,
			inputWires: {},
			outputWires: { out: "signal_amplitude" },
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
