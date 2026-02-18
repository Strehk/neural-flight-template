<script lang="ts">
	/**
	 * ColorPicker — Native color input with label for vec3 color uniforms.
	 */

	interface Props {
		value: string;
		label?: string;
		onchange: (hex: string) => void;
	}

	const { value, label, onchange }: Props = $props();
</script>

<div class="sp-color-picker">
	<input
		type="color"
		{value}
		oninput={(e) => onchange((e.target as HTMLInputElement).value)}
	/>
	{#if label}
		<span class="sp-color-label">{label}</span>
	{/if}
	<span class="sp-color-hex">{value}</span>
</div>

<style>
	.sp-color-picker {
		display: flex;
		align-items: center;
		gap: 0.4rem;
	}

	.sp-color-picker input[type="color"] {
		width: 24px;
		height: 24px;
		border: 1px solid var(--border);
		cursor: pointer;
		padding: 0;
		background: none;
	}

	.sp-color-label {
		font-size: 0.65rem;
		color: var(--text-muted);
		font-family: var(--font-mono);
	}

	.sp-color-hex {
		font-size: 0.6rem;
		color: var(--text-subtle);
		font-family: var(--font-mono);
	}
</style>
