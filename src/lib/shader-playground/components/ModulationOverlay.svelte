<script lang="ts">
/**
 * ModulationOverlay — CSS bar behind a slider showing live modulated range.
 *
 * Positioned absolute inside a relative wrapper around the slider.
 * Green bar pulses with modulation output (e.g. LFO).
 */

interface Props {
	baseValue: number;
	modulatedValue: number;
	min: number;
	max: number;
}

let { baseValue, modulatedValue, min, max }: Props = $props();

const range = $derived(max - min);
const basePct = $derived(range > 0 ? ((baseValue - min) / range) * 100 : 0);
const modPct = $derived(range > 0 ? ((modulatedValue - min) / range) * 100 : 0);

const leftPct = $derived(Math.max(0, Math.min(basePct, modPct)));
const widthPct = $derived(Math.min(100, Math.abs(modPct - basePct)));
</script>

<div
	class="mod-overlay-bar"
	style:left="{leftPct}%"
	style:width="{widthPct}%"
></div>
