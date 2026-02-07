import SliderContent from "./SliderContent.svelte";
import type { ModuleDef } from "./types";
import type { ParameterPreset } from "../parameters/registry";

export function createParamSliderModule(
	preset: ParameterPreset,
	nodeType: string,
): ModuleDef {
	return {
		type: nodeType,
		label: preset.label,
		icon: preset.icon,
		variant: "process",
		component: SliderContent,
		inputs: [{ id: "value", label: "In", side: "left", handleClass: "handle-input" }],
		outputs: [],
		defaultData: { ...preset, driven: false },
	};
}
