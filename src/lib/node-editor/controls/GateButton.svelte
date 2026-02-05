<script lang="ts">
	/**
	 * GateButton Control — Trigger button with HIGH/LOW state
	 */

	interface Props {
		open: boolean;
		onclick: () => void;
	}

	const { open, onclick }: Props = $props();
</script>

<button class="gate-button" class:open onclick={onclick} type="button">
	{open ? "HIGH" : "LOW"}
</button>

<style>
	.gate-button {
		background: var(--bg);
		border: 1px solid var(--border);
		color: var(--text-muted);
		font-family: var(--font-mono);
		font-size: 0.8rem;
		font-weight: 700;
		padding: 0.5rem;
		cursor: pointer;
		text-align: center;
		transition: all 0.1s ease;
		width: 100%;
	}

	.gate-button:hover {
		border-color: var(--warning);
	}

	.gate-button.open {
		background: var(--success);
		border-color: var(--success);
		color: var(--bg);
	}
</style>
