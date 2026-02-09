/**
 * Mixer UI — Multi-channel signal mixer with per-channel gain
 *
 * Self-contained: own compute(), mixes up to 8 channels.
 * Inputs: ch1-ch8 (signal), gain1-gain8 (gain per channel), channelCount (2-8)
 * Output: mix (0-1, weighted sum)
 * Widget: mixer_ui.svelte
 */

import type { ComputeResult, SignalDef, SignalValue } from "../graph/types";
import { clampSignal } from "../graph/types";
import MixerUi from "./mixer_ui.svelte";

const MAX_CHANNELS = 8;

export const COMPONENT_MIXER_UI: SignalDef = {
	type: "mixer",
	label: "Mixer",
	inputs: [
		...Array.from({ length: MAX_CHANNELS }, (_, i) => ({
			id: `ch${i + 1}`,
			label: `Ch ${i + 1}`,
			default: 0,
		})),
		...Array.from({ length: MAX_CHANNELS }, (_, i) => ({
			id: `gain${i + 1}`,
			label: `Gain ${i + 1}`,
			default: 0.5,
		})),
		{ id: "channelCount", label: "Channels", default: 0.25 },
	],
	outputs: [{ id: "mix", label: "Mix", default: 0 }],
	createState: () => null,
	compute: (
		inputs: Record<string, SignalValue>,
		_state: unknown,
		_dt: number,
	): ComputeResult => {
		// channelCount is stored as raw integer via inputOverrides
		const count = Math.min(
			MAX_CHANNELS,
			Math.max(1, Math.round(inputs.channelCount ?? 2)),
		);

		let sum = 0;
		for (let i = 1; i <= count; i++) {
			sum += (inputs[`ch${i}`] ?? 0) * (inputs[`gain${i}`] ?? 0.5);
		}

		return {
			outputs: { mix: clampSignal(sum) },
			state: null,
		};
	},
	widget: MixerUi,
};
