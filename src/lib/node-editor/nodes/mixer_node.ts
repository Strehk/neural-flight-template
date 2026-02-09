/**
 * Mixer Node — Multi-channel signal mixer
 *
 * Internal pipeline:
 *   Input(signal_ch1..ch8) → Mixer(ch1..ch8)
 *   Mixer(mix) → Output(signal_mix)
 *
 * Dynamic port visibility: only first N inputs shown via _channelCount.
 * All 8 channels defined in NodeDef but ModuleRenderer slices to _channelCount.
 *
 * Components: 1 (Mixer UI)
 */

import { Sliders } from "lucide-svelte";
import { COMPONENT_MIXER_UI } from "../components/mixer_ui";
import type { NodeDef } from "./types";

export const NODE_MIXER: NodeDef = {
	type: "mixer",
	label: "Mixer",
	category: "process",
	icon: Sliders,

	components: [
		{
			id: "mixer",
			signal: COMPONENT_MIXER_UI,
			inputWires: {
				ch1: "signal_ch1",
				ch2: "signal_ch2",
				ch3: "signal_ch3",
				ch4: "signal_ch4",
				ch5: "signal_ch5",
				ch6: "signal_ch6",
				ch7: "signal_ch7",
				ch8: "signal_ch8",
			},
			outputWires: { mix: "signal_mix" },
		},
	],

	inputs: [
		{ id: "signal_ch1", label: "Ch 1", side: "left", portType: "number" },
		{ id: "signal_ch2", label: "Ch 2", side: "left", portType: "number" },
		{ id: "signal_ch3", label: "Ch 3", side: "left", portType: "number" },
		{ id: "signal_ch4", label: "Ch 4", side: "left", portType: "number" },
		{ id: "signal_ch5", label: "Ch 5", side: "left", portType: "number" },
		{ id: "signal_ch6", label: "Ch 6", side: "left", portType: "number" },
		{ id: "signal_ch7", label: "Ch 7", side: "left", portType: "number" },
		{ id: "signal_ch8", label: "Ch 8", side: "left", portType: "number" },
	],
	outputs: [
		{ id: "signal_mix", label: "Mix", side: "right", portType: "number" },
	],
};
