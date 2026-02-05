import { ToggleLeft } from "lucide-svelte";
import SwitchContent from "./SwitchContent.svelte";
import { registerModule } from "./registry";
import type { ModuleDef } from "./types";

export const SWITCH_MODULE: ModuleDef = {
	type: "switch",
	label: "Switch",
	icon: ToggleLeft,
	variant: "logic",
	component: SwitchContent,
	inputs: [
		{ id: "gate", label: "Gate", side: "left", handleClass: "handle-gate", position: "25%" },
		{ id: "a", label: "A", side: "left", handleClass: "handle-input", position: "55%" },
		{ id: "b", label: "B", side: "left", handleClass: "handle-input", position: "85%" },
	],
	outputs: [{ id: "out", label: "Out", side: "right", handleClass: "handle-output" }],
	defaultData: { a: 0.25, b: 0.75, out: 0.25, gateActive: false },
};

registerModule(SWITCH_MODULE);
