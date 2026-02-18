<script lang="ts">
	/**
	 * ShaderSelect — bits-ui Select wrapper for shader playground.
	 */
	import { Select } from "bits-ui";

	interface SelectOption {
		value: string;
		label: string;
	}

	interface Props {
		options: SelectOption[];
		value?: string;
		placeholder?: string;
		onchange: (value: string) => void;
	}

	const {
		options,
		value,
		placeholder = "Select...",
		onchange,
	}: Props = $props();

	const selectedLabel = $derived(
		options.find((o) => o.value === value)?.label ?? placeholder,
	);
</script>

<Select.Root
	type="single"
	value={value}
	onValueChange={onchange}
>
	<Select.Trigger class="sp-select-trigger">
		<span>{selectedLabel}</span>
		<span class="sp-select-chevron">▾</span>
	</Select.Trigger>
	<Select.Content class="sp-select-content">
		{#each options as opt (opt.value)}
			<Select.Item value={opt.value} class="sp-select-item" label={opt.label}>
				{opt.label}
			</Select.Item>
		{/each}
	</Select.Content>
</Select.Root>

<style>
	:global(.sp-select-trigger) {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.25rem;
		background: var(--surface);
		color: var(--text-muted);
		border: 1px solid var(--border);
		padding: 0.25rem 0.5rem;
		font-size: 0.7rem;
		font-family: var(--font-mono);
		cursor: pointer;
	}

	:global(.sp-select-trigger:hover) {
		border-color: var(--text-subtle);
	}

	.sp-select-chevron {
		opacity: 0.5;
		font-size: 0.6rem;
	}

	:global(.sp-select-content) {
		background: var(--surface);
		border: 1px solid var(--border);
		max-height: 200px;
		overflow-y: auto;
		z-index: var(--z-dropdown);
		box-shadow: 2px 2px 0 rgba(0, 0, 0, 0.4);
	}

	:global(.sp-select-item) {
		padding: 0.3rem 0.5rem;
		font-size: 0.7rem;
		font-family: var(--font-mono);
		color: var(--text-muted);
		cursor: pointer;
	}

	:global(.sp-select-item:hover),
	:global(.sp-select-item[data-highlighted]) {
		background: var(--surface-hover);
		color: var(--text);
	}
</style>
