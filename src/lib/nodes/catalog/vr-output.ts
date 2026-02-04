/**
 * VR Output Node
 * Sends values to the VR scene via WebSocket
 */

import type { NodeDef } from "../types";
import { sendSettings } from "../bridge";

/** Available VR scene parameters */
export type VRParameter =
	| "fogNear"
	| "fogFar"
	| "sunIntensity"
	| "baseSpeed"
	| "cloudCount";

export const vrOutputNode: NodeDef = {
	type: "vr-output",
	category: "output",
	label: "VR Output",
	inputs: [{ id: "value", label: "Value", type: "number", default: 100 }],
	outputs: [],
	tick: (inputs, state) => {
		const value = inputs.value ?? 100;
		const param = (state.param as unknown as VRParameter) ?? "fogNear";

		// Send to VR scene
		sendSettings({ [param]: value });

		return {
			outputs: {},
			state,
		};
	},
};
