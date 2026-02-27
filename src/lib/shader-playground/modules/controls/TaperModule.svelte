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
	{ key: "amount", label: "Amount", min: -1.0, max: 2.0, step: 0.01 },
];
</script>

<ControlSliders {sliders} {params} {onparamchange} {moduleId} {rack} />
