<script lang="ts">
import type { ComponentType, Snippet } from "svelte";

interface Props {
	icon: ComponentType;
	label: string;
	status?: "connected" | "connecting" | "disconnected" | "error";
	actions?: Snippet;
}

const { icon: Icon, label, status, actions }: Props = $props();
</script>

<header class="header-bar">
	<span class="header-label">
		<Icon size={16} />
		{label}
	</span>
	{#if status}
		<span class="header-status">
			<span class="status-dot" data-status={status}></span>
			{status}
		</span>
	{/if}
	{#if actions}
		{@render actions()}
	{/if}
</header>

<style>
	.header-label {
		font-family: var(--font-mono);
		font-size: 0.85rem;
		font-weight: 500;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--text);
		display: flex;
		align-items: center;
		gap: 0.4rem;
	}

	.header-status {
		font-family: var(--font-mono);
		font-size: 0.75rem;
		font-weight: 500;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--text-muted);
		display: flex;
		align-items: center;
	}
</style>
