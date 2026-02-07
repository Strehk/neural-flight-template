/**
 * Color Node — RGB color mixer (Unified)
 *
 * Signal: 3 channels (r, g, b) each 0-1
 * Module: Color picker + hex display
 */

import { COLOR_SIGNAL } from "../components/color";
import { COLOR_MODULE } from "../components/color_ui";
import { registerNode } from "./registry";
import type { NodeDef } from "./types";

export const COLOR_NODE: NodeDef = {
	type: "color",
	label: "Color",
	description: "Color picker for scene colors",
	category: "output",
	signal: COLOR_SIGNAL,
	module: COLOR_MODULE,
	syncOutputs: (instance, node, edges) => {
		const r = Math.round((instance.outputs.r ?? 0.5) * 255);
		const g = Math.round((instance.outputs.g ?? 0.5) * 255);
		const b = Math.round((instance.outputs.b ?? 0.5) * 255);
		const hex = `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
		const hasInput = edges.some((e) => e.target === node.id);

		if (!hasInput || node.data.value === hex) return null;
		return { value: hex };
	},
};

registerNode(COLOR_NODE);
