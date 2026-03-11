<script lang="ts">
/**
 * LFOModule — Rate + Shape (Sine → Triangle → Square → Random).
 *
 * Shape slides continuously between 4 waveforms (0–3).
 */

import type { ShaderRackState } from "../../state.svelte";
import ControlSliders, { type SliderConfig } from "./ControlSliders.svelte";

interface Props {
	params: Record<string, number>;
	onparamchange: (name: string, value: number) => void;
	moduleId?: string;
	rack?: ShaderRackState;
}

let { params, onparamchange, moduleId, rack }: Props = $props();

const SHAPE_LABELS = ["Sin", "Tri", "Sqr", "Rnd"] as const;
const shapeLabel = $derived(
	SHAPE_LABELS[Math.round(params.shape ?? 0)] ?? "Sin",
);

const sliders: SliderConfig[] = [
	{ key: "rate", label: "Rate (Hz)", min: 0.1, max: 10.0, step: 0.1 },
	{ key: "shape", label: "Shape", min: 0.0, max: 3.0, step: 0.01 },
];
</script>

<ControlSliders {sliders} {params} {onparamchange} {moduleId} {rack} />
<div class="lfo-shape-label">{shapeLabel}</div>

<style>
	.lfo-shape-label {
		font-size: 0.5rem;
		font-family: var(--font-mono);
		color: var(--text-subtle);
		text-transform: uppercase;
		text-align: right;
		margin-top: -2px;
		letter-spacing: 0.06em;
	}
</style>
