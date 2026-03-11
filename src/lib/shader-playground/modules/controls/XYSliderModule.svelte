<script lang="ts">
/**
 * XYSliderModule — 2D canvas pad with crosshair + modulation pills for X/Y.
 */

import ModulationPill from "../../components/ModulationPill.svelte";
import type { ShaderRackState } from "../../state.svelte";

interface Props {
	params: Record<string, number>;
	onparamchange: (name: string, value: number) => void;
	moduleId?: string;
	rack?: ShaderRackState;
}

let { params, onparamchange, moduleId, rack }: Props = $props();

const showModulation = $derived(!!moduleId && !!rack);

let padEl: HTMLDivElement | undefined = $state();
let dragging = $state(false);

function updateFromEvent(e: MouseEvent): void {
	if (!padEl) return;
	const rect = padEl.getBoundingClientRect();
	const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
	const y = Math.max(0, Math.min(1, 1 - (e.clientY - rect.top) / rect.height));
	onparamchange("x", x);
	onparamchange("y", y);
}

function handlePointerDown(e: PointerEvent): void {
	dragging = true;
	padEl?.setPointerCapture(e.pointerId);
	updateFromEvent(e);
}

function handlePointerMove(e: PointerEvent): void {
	if (dragging) updateFromEvent(e);
}

function handlePointerUp(): void {
	dragging = false;
}
</script>

<div class="control-module">
	<div class="control-row">
		<span class="control-label">X: {(params.x ?? 0.5).toFixed(2)}</span>
		<div class="control-row-right">
			{#if showModulation && moduleId && rack}
				<ModulationPill {rack} {moduleId} paramName="x" />
			{/if}
		</div>
	</div>
	<div class="control-row">
		<span class="control-label">Y: {(params.y ?? 0.5).toFixed(2)}</span>
		<div class="control-row-right">
			{#if showModulation && moduleId && rack}
				<ModulationPill {rack} {moduleId} paramName="y" />
			{/if}
		</div>
	</div>
	<div
		class="xy-pad"
		bind:this={padEl}
		onpointerdown={handlePointerDown}
		onpointermove={handlePointerMove}
		onpointerup={handlePointerUp}
		role="slider"
		aria-label="XY Pad"
		aria-valuenow={Math.round((params.x ?? 0.5) * 100)}
		tabindex="0"
	>
		<div
			class="xy-crosshair"
			style:left="{(params.x ?? 0.5) * 100}%"
			style:bottom="{(params.y ?? 0.5) * 100}%"
		></div>
	</div>
</div>
