/**
 * System Nodes — Dynamically generated endpoint nodes
 *
 * Output Nodes: 1 input port (sink), 0 components.
 * Generated from the active experience's manifest parameters.
 * Each number-type parameter gets its own output node.
 */

import {
	getParameterPresets,
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

/** Generate output nodes from the active experience manifest */
export function generateOutputNodes(): NodeDef[] {
	return Object.entries(getParameterPresets()).map(([key, preset]) =>
		createOutputNode(key, preset),
	);
}

// Backward compat: initial static export for consumers that read OUTPUT_NODES at import time
export let OUTPUT_NODES: NodeDef[] = generateOutputNodes();

/** Refresh OUTPUT_NODES from current manifest — call when experience changes */
export function refreshOutputNodes(): void {
	OUTPUT_NODES = generateOutputNodes();
}
