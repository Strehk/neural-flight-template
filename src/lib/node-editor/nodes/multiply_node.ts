/**
 * Multiply Node — out = clamp01(a × b) (Unified)
 *
 * Signal: 2 inputs multiplied, clamped to 0-1
 * Module: × symbol + output value display
 */

import { MULTIPLY_SIGNAL } from "../components/multiply";
import { MULTIPLY_MODULE } from "../components/multiply_ui";
import { registerNode } from "./registry";
import type { NodeDef } from "./types";

export const MULTIPLY_NODE: NodeDef = {
	type: "multiply",
	label: "Multiply",
	description: "A × B (0-1 clamped)",
	category: "process",
	signal: MULTIPLY_SIGNAL,
	module: MULTIPLY_MODULE,
	syncOutputs: (instance, node) => {
		const out = instance.outputs.out ?? 0.25;
		if (node.data.out === out) return null;
		return { out };
	},
};

registerNode(MULTIPLY_NODE);
