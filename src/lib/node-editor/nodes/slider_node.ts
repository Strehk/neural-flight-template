/**
 * Slider Node — Simple parameter source with modulation input.
 *
 * Internal pipeline:
 *   Slider(out) → Adder(b)
 *   External(signal_mod) → Adder(a)
 *   Adder(sum) → Output(signal_out)
 *
 * Exposed ports:
 *   Input:  signal_mod (left) — external modulation
 *   Output: signal_out (right) — slider + modulation sum
 *
 * Components: 2 (Slider_UI + Adder)
 */

import { SlidersHorizontal } from "lucide-svelte";
import { COMPONENT_ADDER } from "../components/signal_adder";
import { COMPONENT_SLIDER_UI } from "../components/slider_ui";
import type { NodeDef } from "./types";

export const NODE_SLIDER: NodeDef = {
	type: "slider",
	label: "Slider",
	category: "input",
	icon: SlidersHorizontal,

	components: [
		{
			id: "slider",
			signal: COMPONENT_SLIDER_UI,
			inputWires: {},
			outputWires: { out: "signal_slider_raw" },
		},
		{
			id: "adder",
			signal: COMPONENT_ADDER,
			inputWires: { a: "signal_mod", b: "signal_slider_raw" },
			outputWires: { sum: "signal_out" },
		},
	],

	inputs: [
		{ id: "signal_mod", label: "Mod In", side: "left", portType: "number" },
	],
	outputs: [
		{ id: "signal_out", label: "Out", side: "right", portType: "number" },
	],
};
