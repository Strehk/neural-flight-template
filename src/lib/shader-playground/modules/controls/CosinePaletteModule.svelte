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
	{ key: "a_r", label: "A Red", min: 0.0, max: 1.0, step: 0.01 },
	{ key: "a_g", label: "A Green", min: 0.0, max: 1.0, step: 0.01 },
	{ key: "a_b", label: "A Blue", min: 0.0, max: 1.0, step: 0.01 },
	{ key: "b_r", label: "B Red", min: 0.0, max: 1.0, step: 0.01 },
	{ key: "b_g", label: "B Green", min: 0.0, max: 1.0, step: 0.01 },
	{ key: "b_b", label: "B Blue", min: 0.0, max: 1.0, step: 0.01 },
	{ key: "c_r", label: "C Red", min: 0.0, max: 3.0, step: 0.01 },
	{ key: "c_g", label: "C Green", min: 0.0, max: 3.0, step: 0.01 },
	{ key: "c_b", label: "C Blue", min: 0.0, max: 3.0, step: 0.01 },
	{ key: "d_r", label: "D Red", min: 0.0, max: 1.0, step: 0.01 },
	{ key: "d_g", label: "D Green", min: 0.0, max: 1.0, step: 0.01 },
	{ key: "d_b", label: "D Blue", min: 0.0, max: 1.0, step: 0.01 },
];
</script>

<ControlSliders {sliders} {params} {onparamchange} {moduleId} {rack} />
