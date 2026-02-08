<script lang="ts">
/**
 * ValueDisplay Control — Formatted number display
 */

interface Props {
	value: number;
	precision?: number;
	driven?: boolean;
}

const { value, precision = 2, driven = false }: Props = $props();

const formatted = $derived(value.toFixed(precision));
</script>

<div class="value-display" class:driven>
	{formatted}
</div>

<style>
	.value-display {
		text-align: center;
		color: var(--text);
		font-size: 0.9rem;
		font-weight: 600;
	}

	.value-display.driven {
		color: var(--accent);
	}
</style>
