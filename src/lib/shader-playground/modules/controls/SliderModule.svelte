<script lang="ts">
/**
 * SliderModule — Single value control with min/max range.
 *
 * Uses ControlSliders for modulation pill + overlay support.
 */

import type { ShaderRackState } from "../../state.svelte";
import ControlSliders, { type SliderConfig } from "./ControlSliders.svelte";

interface Props {
	params: Record<string, number>;
	onparamchange: (name: string, value: number) => void;
	moduleId?: string;
	rack?: ShaderRackState;
}

let { params, onparamchange, moduleId, rack }: Props = $props();

const sliders: SliderConfig[] = $derived([
	{
		key: "value",
		label: "Value",
		min: params.min ?? 0,
		max: params.max ?? 1,
		step: 0.01,
	},
]);
</script>

<ControlSliders {sliders} {params} {onparamchange} {moduleId} {rack} />
