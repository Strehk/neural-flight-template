import SliderContent from "./SliderContent.svelte";
import { registerModule } from "./registry";
import type { ModuleDef } from "./types";
import { PARAMETER_PRESETS, type ParameterPreset } from "../parameters/registry";

export function createParamSliderModule(preset: ParameterPreset): ModuleDef {
	return {
		type: "slider",
		label: preset.label,
		icon: preset.icon,
		variant: "process",
		component: SliderContent,
		inputs: [{ id: "value", label: "In", side: "left", handleClass: "handle-input" }],
		outputs: [],
		defaultData: { ...preset, driven: false },
	};
}

registerModule(createParamSliderModule(PARAMETER_PRESETS.terrainAmplitude));
