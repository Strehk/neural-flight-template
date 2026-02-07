import { X } from "lucide-svelte";
import MultiplyContent from "./MultiplyContent.svelte";
import type { ModuleDef } from "./types";

export const MULTIPLY_MODULE: ModuleDef = {
	type: "multiply",
	label: "Multiply",
	icon: X,
	variant: "process",
	component: MultiplyContent,
	inputs: [
		{ id: "a", label: "A", side: "left", handleClass: "handle-input" },
		{ id: "b", label: "B", side: "left", handleClass: "handle-input" },
	],
	outputs: [{ id: "out", label: "Out", side: "right", handleClass: "handle-output" }],
	defaultData: { out: 0.25 },
};
