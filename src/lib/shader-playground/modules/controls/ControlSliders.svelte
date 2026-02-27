<script lang="ts">
/**
 * ControlSliders — Shared slider rendering for any module.
 *
 * Accepts a slider config array + params → renders labeled sliders.
 * Optionally shows ModulationPill next to each slider when moduleId + rack are provided.
 * Shows ModulationOverlay bar when a param is actively modulated.
 */

import { Slider } from "bits-ui";
import type { ShaderRackState } from "../../state.svelte";
import ModulationPill from "../../components/ModulationPill.svelte";
import ModulationOverlay from "../../components/ModulationOverlay.svelte";

export interface SliderConfig {
	key: string;
	label: string;
	min: number;
	max: number;
	step: number;
}

interface Props {
	sliders: SliderConfig[];
	params: Record<string, number>;
	onparamchange: (name: string, value: number) => void;
	moduleId?: string;
	rack?: ShaderRackState;
}

let { sliders, params, onparamchange, moduleId, rack }: Props = $props();

const showModulation = $derived(!!moduleId && !!rack);
</script>

<div class="control-module">
	{#each sliders as s (s.key)}
		{@const modValue = moduleId && rack ? rack.liveModValues.get(`${moduleId}:${s.key}`) ?? null : null}
		<div class="control-row">
			<span class="control-label">{s.label}</span>
			<div class="control-row-right">
				<span class="control-value">{(params[s.key] ?? 0).toFixed(2)}</span>
				{#if showModulation && moduleId && rack}
					<ModulationPill {rack} {moduleId} paramName={s.key} />
				{/if}
			</div>
		</div>
		<div class="slider-wrap">
			{#if modValue !== null}
				<ModulationOverlay
					baseValue={params[s.key] ?? 0}
					modulatedValue={modValue}
					min={s.min}
					max={s.max}
				/>
			{/if}
			<Slider.Root
				type="single"
				value={params[s.key] ?? 0}
				min={s.min}
				max={s.max}
				step={s.step}
				onValueChange={(v: number) => onparamchange(s.key, v)}
				class="slider-root"
			>
				<Slider.Range class="slider-range" />
				<Slider.Thumb index={0} class="slider-thumb" />
			</Slider.Root>
		</div>
	{/each}
</div>
