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
	{ key: "strength", label: "Strength", min: 0.0, max: 0.5, step: 0.01 },
	{ key: "frequency", label: "Frequency", min: 0.1, max: 20.0, step: 0.1 },
	{ key: "speed", label: "Speed", min: 0.0, max: 5.0, step: 0.1 },
];
</script>

<ControlSliders {sliders} {params} {onparamchange} {moduleId} {rack} />
