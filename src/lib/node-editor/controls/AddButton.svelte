<script lang="ts">
/**
 * AddButton Control — bits-ui Button for dynamic node controls
 */
import { Button } from "bits-ui";

interface Props {
	onclick: () => void;
	disabled?: boolean;
	label?: string;
}

const { onclick, disabled = false, label = "+" }: Props = $props();
</script>

<Button.Root
	class="add-button nodrag"
	{disabled}
	{onclick}
>
	{label}
</Button.Root>

<style>
	:global(.add-button) {
		align-self: flex-start;
		background: var(--border);
		border: none;
		color: var(--text-muted);
		font-size: 0.7rem;
		padding: 0.1rem 0.4rem;
		cursor: pointer;
		border-radius: 2px;
	}

	:global(.add-button:hover) {
		background: var(--accent-muted);
		color: var(--bg);
	}

	:global(.add-button:disabled) {
		opacity: 0.4;
		cursor: not-allowed;
	}
</style>
