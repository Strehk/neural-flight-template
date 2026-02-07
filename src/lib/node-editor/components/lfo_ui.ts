import { Activity } from "lucide-svelte";
import LfoContent from "./LfoContent.svelte";
import type { ModuleDef } from "./types";

export const LFO_MODULE: ModuleDef = {
	type: "lfo",
	label: "LFO",
	icon: Activity,
	variant: "input",
	component: LfoContent,
	inputs: [{ id: "speedMod", label: "Speed", side: "left", handleClass: "handle-input" }],
	outputs: [{ id: "wave", label: "Wave", side: "right", handleClass: "handle-output" }],
	defaultData: { wave: 0, speed: 0.1 },
};
