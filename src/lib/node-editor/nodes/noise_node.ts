/**
 * Noise Node — Smooth random signal generator.
 *
 * Internal pipeline:
 *   Slider(out) → Noise(speed)
 *   Noise(noise) → Output(signal_noise)
 *
 * Exposed ports:
 *   Output: signal_noise (right) — no external input needed
 *
 * Components: 2 (Slider_UI + Noise_UI)
 */

import { Sparkles } from "lucide-svelte";
import { COMPONENT_NOISE_UI } from "../components/noise_ui";
import { COMPONENT_SLIDER_UI } from "../components/slider_ui";
import type { NodeDef } from "./types";

export const NODE_NOISE: NodeDef = {
	type: "noise",
	label: "Noise",
	category: "input",
	icon: Sparkles,

	components: [
		{
			id: "speed",
			signal: COMPONENT_SLIDER_UI,
			inputWires: {},
			outputWires: { out: "signal_speed_internal" },
		},
		{
			id: "noise",
			signal: COMPONENT_NOISE_UI,
			inputWires: { speed: "signal_speed_internal" },
			outputWires: { noise: "signal_noise" },
		},
	],

	inputs: [],
	outputs: [
		{
			id: "signal_noise",
			label: "Noise",
			side: "right",
			portType: "number",
		},
	],
};
