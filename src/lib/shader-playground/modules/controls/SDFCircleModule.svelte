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
	{ key: "radius", label: "Radius", min: 0.01, max: 0.8, step: 0.01 },
	{ key: "smoothness", label: "Smoothness", min: 0.001, max: 0.2, step: 0.001 },
];
</script>

<ControlSliders {sliders} {params} {onparamchange} {moduleId} {rack} />
