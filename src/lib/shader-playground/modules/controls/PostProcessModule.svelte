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
	{ key: "vignette", label: "Vignette", min: 0.0, max: 2.0, step: 0.01 },
	{ key: "gamma", label: "Gamma", min: 0.1, max: 3.0, step: 0.01 },
];
</script>

<ControlSliders {sliders} {params} {onparamchange} {moduleId} {rack} />
