/**
 * System Nodes — Auto-generated endpoint nodes
 *
 * Output Nodes: 1 input port (sink), 0 components.
 * Generated from PARAMETER_PRESETS — each VR parameter gets a node.
 */

import {
	PARAMETER_PRESETS,
	type ParameterPreset,
} from "../parameters/registry";
import type { NodeDef } from "./types";

function createOutputNode(key: string, preset: ParameterPreset): NodeDef {
	return {
		type: `output-${key}`,
		label: preset.label,
		category: "output",
		icon: preset.icon,
		components: [],
		inputs: [{ id: "value", label: "Value", side: "left", portType: "number" }],
		outputs: [],
	};
}

export const OUTPUT_NODES: NodeDef[] = Object.entries(PARAMETER_PRESETS).map(
	([key, preset]) => createOutputNode(key, preset),
);
