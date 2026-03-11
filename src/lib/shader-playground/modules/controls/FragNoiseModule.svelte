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
	{ key: "frequency", label: "Frequency", min: 0.1, max: 20.0, step: 0.1 },
	{ key: "amplitude", label: "Amplitude", min: 0.0, max: 1.0, step: 0.01 },
	{ key: "speed", label: "Speed", min: 0.0, max: 5.0, step: 0.1 },
];
</script>

<ControlSliders {sliders} {params} {onparamchange} {moduleId} {rack} />
