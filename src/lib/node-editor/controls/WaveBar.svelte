<script lang="ts">
	/**
	 * WaveBar Control — Vertical bar visualization (0-1 as height)
	 */

	interface Props {
		value: number;
		height?: number;
		color?: string;
	}

	const { value, height = 32, color = "var(--success)" }: Props = $props();

	const fillHeight = $derived(Math.round(Math.max(0, Math.min(1, value)) * 100));
</script>

<div class="wave-bar" style="height: {height}px">
	<div class="fill" style="height: {fillHeight}%; background: {color}"></div>
</div>

<style>
	.wave-bar {
		width: 100%;
		background: var(--border);
		position: relative;
		overflow: hidden;
	}

	.fill {
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		opacity: 0.6;
		transition: height 0.05s ease-out;
	}
</style>
