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
	{ key: "r2", label: "Red B", min: 0.0, max: 1.0, step: 0.01 },
	{ key: "g2", label: "Green B", min: 0.0, max: 1.0, step: 0.01 },
	{ key: "b2", label: "Blue B", min: 0.0, max: 1.0, step: 0.01 },
];
</script>

<ControlSliders {sliders} {params} {onparamchange} {moduleId} {rack} />
