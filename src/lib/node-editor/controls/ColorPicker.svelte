<script lang="ts">
	/**
	 * ColorPicker Control — Color input with preview
	 */

	interface Props {
		value: string;
		disabled?: boolean;
		onchange: (color: string) => void;
	}

	const { value, disabled = false, onchange }: Props = $props();

	function handleInput(e: Event) {
		const target = e.target as HTMLInputElement;
		onchange(target.value);
	}
</script>

<div class="color-picker">
	<input
		type="color"
		{value}
		{disabled}
		oninput={handleInput}
		class="nodrag color-input"
	/>
	<div class="preview" style="background: {value}"></div>
	<span class="hex">{value}</span>
</div>

<style>
	.color-picker {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.color-input {
		width: 100%;
		height: 32px;
		border: 1px solid var(--border);
		background: var(--surface);
		cursor: pointer;
		padding: 2px;
	}

	.color-input:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.preview {
		height: 4px;
		width: 100%;
	}

	.hex {
		text-align: center;
		color: var(--text-subtle);
		font-size: 0.65rem;
		text-transform: uppercase;
	}
</style>
