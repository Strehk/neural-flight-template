/**
 * Slider Node — Generic parameter output (Unified)
 *
 * Signal: Passthrough 0-1 value
 * Module: Slider widget with min/max remapping
 *
 * The Slider is a generic building block (Lego principle).
 * Parameter name, min/max come from node.data (set via preset on drop).
 */

import { SLIDER_SIGNAL } from "../components/slider";
import { createParamSliderModule } from "../components/param_slider_ui";
import { PARAMETER_PRESETS } from "../parameters/registry";
import { remap } from "../graph/types";
import { registerNode } from "./registry";
import type { NodeDef } from "./types";

export const SLIDER_NODE: NodeDef = {
	type: "slider",
	label: "Slider",
	description: "Parameter with min/max range",
	category: "process",
	signal: SLIDER_SIGNAL,
	module: createParamSliderModule(PARAMETER_PRESETS.terrainAmplitude),
	syncOutputs: (instance, node, edges) => {
		const normalizedValue = instance.outputs.out ?? 0.5;
		const min = node.data.min as number;
		const max = node.data.max as number;
		const value = remap(normalizedValue, min, max);
		const hasInput = edges.some(
			(e) => e.target === node.id && e.targetHandle === "value",
		);

		if (node.data.value === value && node.data.driven === hasInput)
			return null;
		return { value, driven: hasInput };
	},
};

registerNode(SLIDER_NODE);
