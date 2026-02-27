<script lang="ts">
import ControlSliders from "./ControlSliders.svelte";

import type { ShaderRackState } from "../../state.svelte";

interface Props {
	params: Record<string, number>;
	onparamchange: (name: string, value: number) => void;
	moduleId?: string;
	rack?: ShaderRackState;
}

let { params, onparamchange, moduleId, rack }: Props = $props();

const sliders = [
	{ key: "amplitude", label: "Amplitude", min: 0.0, max: 1.0, step: 0.01 },
	{ key: "frequency", label: "Frequency", min: 0.1, max: 20.0, step: 0.1 },
];
</script>

<ControlSliders {sliders} {params} {onparamchange} {moduleId} {rack} />
