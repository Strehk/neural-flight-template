import { Palette } from "lucide-svelte";
import ColorContent from "./ColorContent.svelte";
import type { ModuleDef } from "./types";

export const COLOR_MODULE: ModuleDef = {
	type: "color",
	label: "Color",
	icon: Palette,
	variant: "output",
	component: ColorContent,
	inputs: [
		{ id: "r", label: "R", side: "left", handleClass: "handle-r", position: "30%" },
		{ id: "g", label: "G", side: "left", handleClass: "handle-g", position: "55%" },
		{ id: "b", label: "B", side: "left", handleClass: "handle-b", position: "80%" },
	],
	outputs: [
		{ id: "r", label: "R", side: "right", handleClass: "handle-r", position: "30%" },
		{ id: "g", label: "G", side: "right", handleClass: "handle-g", position: "55%" },
		{ id: "b", label: "B", side: "right", handleClass: "handle-b", position: "80%" },
	],
	defaultData: { label: "Color", param: "ringColor", value: "#f1c40f" },
};
