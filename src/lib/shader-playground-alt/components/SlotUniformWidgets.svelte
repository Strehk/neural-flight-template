<script lang="ts">
/**
 * SlotUniformWidgets — Slider + ColorPicker widgets for user uniforms.
 *
 * Renders inline controls for @endpoint uniforms within a Rack module.
 * Values are sent directly to the renderer (no recompile needed).
 */

import { untrack } from "svelte";
import ColorPicker from "../controls/ColorPicker.svelte";
import ShaderSlider from "../controls/ShaderSlider.svelte";
import type { UniformDef } from "../types";

interface Props {
	uniforms: UniformDef[];
	onchange: (name: string, value: number | number[] | boolean) => void;
}

let { uniforms, onchange }: Props = $props();

// Local value tracking — survives between slider drags, resets on recompile
let values: Record<string, number | number[] | boolean> = $state({});

$effect(() => {
	// Track uniforms changes, read values without tracking to avoid loop
	const current = untrack(() => values);
	const next: Record<string, number | number[] | boolean> = {};
	for (const u of uniforms) {
		next[u.name] = current[u.name] ?? u.value;
	}
	values = next;
});

function handleSlider(name: string, v: number): void {
	values[name] = v;
	onchange(name, v);
}

function handleColor(name: string, hex: string): void {
	const h = hex.replace("#", "");
	const vec3 = [
		Number.parseInt(h.substring(0, 2), 16) / 255,
		Number.parseInt(h.substring(2, 4), 16) / 255,
		Number.parseInt(h.substring(4, 6), 16) / 255,
	];
	values[name] = vec3;
	onchange(name, vec3);
}

function vec3ToHex(v: number | number[] | boolean): string {
	if (!Array.isArray(v)) return "#808080";
	const r = Math.round((v[0] ?? 0) * 255)
		.toString(16)
		.padStart(2, "0");
	const g = Math.round((v[1] ?? 0) * 255)
		.toString(16)
		.padStart(2, "0");
	const b = Math.round((v[2] ?? 0) * 255)
		.toString(16)
		.padStart(2, "0");
	return `#${r}${g}${b}`;
}

function numVal(v: number | number[] | boolean): number {
	return typeof v === "number" ? v : 0;
}
</script>

{#if uniforms.length > 0}
	<div class="sp-slot-widgets">
		{#each uniforms as u (u.name)}
			<div class="sp-slot-widget-row">
				{#if u.color && u.type === "vec3"}
					<ColorPicker
						value={vec3ToHex(values[u.name] ?? u.value)}
						label={u.label ?? u.name}
						onchange={(hex) => handleColor(u.name, hex)}
					/>
				{:else if u.type === "float" || u.type === "int"}
					<ShaderSlider
						value={numVal(values[u.name] ?? u.value)}
						min={u.min ?? 0}
						max={u.max ?? 1}
						step={u.step ?? 0.01}
						label={u.label ?? u.name}
						onchange={(v) => handleSlider(u.name, v)}
					/>
				{:else}
					<span class="sp-slot-widget-label">{u.label ?? u.name}: {u.type}</span>
				{/if}
			</div>
		{/each}
	</div>
{/if}

