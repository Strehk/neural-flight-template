/**
 * Parameter Nodes — Dynamic generation from PARAMETER_PRESETS
 *
 * Each preset becomes its own NodeDef + catalog entry.
 * All share SLIDER_SIGNAL (type: "slider") for the compute graph.
 */

import { SLIDER_SIGNAL } from "../components/slider";
import { createParamSliderModule } from "../components/param_slider_ui";
import { PARAMETER_PRESETS } from "../parameters/registry";
import { remap } from "../graph/types";
import { registerNode } from "./registry";
import type { NodeDef } from "./types";

for (const [key, preset] of Object.entries(PARAMETER_PRESETS)) {
	const nodeType = `param-${key}`;

	const paramNode: NodeDef = {
		type: nodeType,
		label: preset.label,
		description: `${preset.label} (${preset.min}–${preset.max})`,
		category: "process",
		signal: SLIDER_SIGNAL,
		module: createParamSliderModule(preset, nodeType),
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

	registerNode(paramNode);
}
