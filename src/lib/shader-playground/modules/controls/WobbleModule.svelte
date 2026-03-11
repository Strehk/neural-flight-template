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
	{ key: "speed", label: "Speed", min: 0.1, max: 10.0, step: 0.1 },
	{ key: "amount", label: "Amount", min: 0.0, max: 0.5, step: 0.01 },
];
</script>

<ControlSliders {sliders} {params} {onparamchange} {moduleId} {rack} />
