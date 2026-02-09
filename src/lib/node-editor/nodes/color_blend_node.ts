/**
 * Color Blend Node — Gate-controlled color crossfade
 *
 * Internal pipeline:
 *   Color_A(r/g/b) → Switch_R/G/B(a)
 *   Color_B(r/g/b) → Switch_R/G/B(b)
 *   External(signal_gate) → Switch_R/G/B(gate) [fan-out]
 *   Switch_R(out) → Output(signal_r)
 *   Switch_G(out) → Output(signal_g)
 *   Switch_B(out) → Output(signal_b)
 *
 * Exposed ports:
 *   Input:  signal_gate (left handle)
 *   Output: signal_r, signal_g, signal_b (right handles)
 *
 * Components: 5 (2× Color_UI + 3× Switch headless)
 */

import { Palette } from "lucide-svelte";
import { COMPONENT_COLOR_UI } from "../components/color_ui";
import { COMPONENT_SWITCH } from "../components/switch";
import type { NodeDef } from "./types";

export const NODE_COLOR_BLEND: NodeDef = {
	type: "color-blend",
	label: "Color Blend",
	category: "process",
	icon: Palette,

	components: [
		{
			id: "colorA",
			signal: COMPONENT_COLOR_UI,
			inputWires: { r: null, g: null, b: null },
			outputWires: {
				r: "signal_a_r",
				g: "signal_a_g",
				b: "signal_a_b",
			},
		},
		{
			id: "colorB",
			signal: COMPONENT_COLOR_UI,
			inputWires: { r: null, g: null, b: null },
			outputWires: {
				r: "signal_b_r",
				g: "signal_b_g",
				b: "signal_b_b",
			},
		},
		{
			id: "switchR",
			signal: COMPONENT_SWITCH,
			inputWires: {
				gate: "signal_gate",
				a: "signal_a_r",
				b: "signal_b_r",
			},
			outputWires: { out: "signal_r" },
		},
		{
			id: "switchG",
			signal: COMPONENT_SWITCH,
			inputWires: {
				gate: "signal_gate",
				a: "signal_a_g",
				b: "signal_b_g",
			},
			outputWires: { out: "signal_g" },
		},
		{
			id: "switchB",
			signal: COMPONENT_SWITCH,
			inputWires: {
				gate: "signal_gate",
				a: "signal_a_b",
				b: "signal_b_b",
			},
			outputWires: { out: "signal_b" },
		},
	],

	inputs: [
		{
			id: "signal_gate",
			label: "Gate",
			side: "left",
			portType: "trigger",
		},
	],
	outputs: [
		{ id: "signal_r", label: "R", side: "right", portType: "number" },
		{ id: "signal_g", label: "G", side: "right", portType: "number" },
		{ id: "signal_b", label: "B", side: "right", portType: "number" },
	],
};
