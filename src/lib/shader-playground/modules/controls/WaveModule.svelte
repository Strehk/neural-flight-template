<script lang="ts">
import type { ShaderRackState } from "../../state.svelte";
import ControlSliders from "./ControlSliders.svelte";

interface Props {
	params: Record<string, number>;
	onparamchange: (name: string, value: number) => void;
	moduleId?: string;
	rack?: ShaderRackState;
}

let { params, onparamchange, moduleId, rack }: Props = $props();

const sliders = [
	{ key: "height", label: "Height", min: 0.0, max: 1.0, step: 0.01 },
	{ key: "freq_x", label: "Freq X", min: 0.1, max: 20.0, step: 0.1 },
	{ key: "freq_y", label: "Freq Y", min: 0.1, max: 20.0, step: 0.1 },
];
</script>

<ControlSliders {sliders} {params} {onparamchange} {moduleId} {rack} />
