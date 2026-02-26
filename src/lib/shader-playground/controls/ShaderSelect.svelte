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

const { options, value, placeholder = "Select...", onchange }: Props = $props();

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

