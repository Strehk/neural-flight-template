/**
 * Sky Output Node
 * Controls sky gradient colors via WebSocket
 */

import type { NodeDef } from "../types";
import { sendSettings } from "../bridge";

export const skyOutputNode: NodeDef = {
	type: "sky-output",
	category: "output",
	label: "Sky Output",
	inputs: [
		{ id: "skyColorTop", label: "Top", type: "string", default: "#1a6fc4" },
		{ id: "skyColorHorizon", label: "Horizon", type: "string", default: "#ffeebb" },
		{ id: "skyColorBottom", label: "Bottom", type: "string", default: "#87ceeb" },
	],
	outputs: [],
	tick: (inputs) => {
		const skyColorTop = inputs.skyColorTop as string;
		const skyColorHorizon = inputs.skyColorHorizon as string;
		const skyColorBottom = inputs.skyColorBottom as string;

		sendSettings({ skyColorTop, skyColorHorizon, skyColorBottom });

		return { outputs: {}, state: {} };
	},
};
