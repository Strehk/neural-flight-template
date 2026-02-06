import { Zap } from "lucide-svelte";
import GateContent from "./GateContent.svelte";
import { registerModule } from "./registry";
import type { ModuleDef } from "./types";

export const GATE_MODULE: ModuleDef = {
	type: "gate",
	label: "Gate",
	icon: Zap,
	variant: "trigger",
	component: GateContent,
	inputs: [{ id: "trigger", label: "Trigger", side: "left", handleClass: "handle-input" }],
	outputs: [{ id: "gate", label: "Gate", side: "right", handleClass: "handle-output" }],
	defaultData: { open: false, duration: 0.5, eventType: "ring-pass" },
};

registerModule(GATE_MODULE);
