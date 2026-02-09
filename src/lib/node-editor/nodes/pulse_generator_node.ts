/**
 * Pulse Generator Node — LFO-driven pulse train
 *
 * Inspired by VCV Rack pulse generators (LittleUtils, Buchla 140).
 * Simple clock/trigger generator with Rate + Width controls.
 *
 * Internal pipeline:
 *   LFO_UI(wave) → Comparator(signal)
 *   Slider_UI(out) → Comparator(threshold)  ← "Width" (duty cycle)
 *   External(signal_rate_mod) → LFO_UI(speedMod)
 *   Comparator(gate) → Output(signal_pulse)
 *
 * Exposed ports:
 *   Input:  signal_rate_mod (left handle)
 *   Output: signal_pulse (right handle)
 *
 * Components: 3 (LFO_UI + Slider_UI + Comparator headless)
 */

import { HeartPulse } from "lucide-svelte";
import { COMPONENT_COMPARATOR } from "../components/comparator";
import { COMPONENT_LFO_UI } from "../components/lfo_ui";
import { COMPONENT_SLIDER_UI } from "../components/slider_ui";
import type { NodeDef } from "./types";

export const NODE_PULSE_GENERATOR: NodeDef = {
	type: "pulse-generator",
	label: "Pulse Generator",
	category: "trigger",
	icon: HeartPulse,

	components: [
		{
			id: "lfo",
			signal: COMPONENT_LFO_UI,
			inputWires: { speedMod: "signal_rate_mod" },
			outputWires: { wave: "signal_lfo_out" },
		},
		{
			id: "width",
			signal: COMPONENT_SLIDER_UI,
			inputWires: {},
			outputWires: { out: "signal_threshold" },
		},
		{
			id: "cmp",
			signal: COMPONENT_COMPARATOR,
			inputWires: {
				signal: "signal_lfo_out",
				threshold: "signal_threshold",
			},
			outputWires: { gate: "signal_pulse" },
		},
	],

	inputs: [
		{
			id: "signal_rate_mod",
			label: "Speed",
			side: "left",
			portType: "number",
		},
	],
	outputs: [
		{
			id: "signal_pulse",
			label: "Pulse",
			side: "right",
			portType: "number",
		},
	],
};
