<script lang="ts">
	import type { ComponentType } from 'svelte';

	interface Props {
		href: string;
		icon: ComponentType;
		path: string;
		title: string;
		description: string;
		planned?: boolean;
	}

	const { href, icon: Icon, path, title, description, planned = false }: Props = $props();
</script>

{#if planned}
	<div class="link-card link-card--planned">
		<span class="link-card-icon">
			<Icon size={20} />
		</span>
		<div class="link-card-info">
			<span class="link-card-path">
				{path}
				<span class="badge">planned</span>
			</span>
			<span class="link-card-title">{title}</span>
			<span class="link-card-description">{description}</span>
		</div>
	</div>
{:else}
	<a {href} class="link-card">
		<span class="link-card-icon">
			<Icon size={20} />
		</span>
		<div class="link-card-info">
			<span class="link-card-path">{path}</span>
			<span class="link-card-title">{title}</span>
			<span class="link-card-description">{description}</span>
		</div>
	</a>
{/if}

<style>
	.link-card {
		display: flex;
		align-items: flex-start;
		gap: 1rem;
		padding: 1rem;
		background: var(--surface);
		border: 1px solid var(--border);
		text-decoration: none;
		color: var(--text);
		transition:
			border-color 0.15s,
			box-shadow 0.15s;
	}

	.link-card:hover {
		border-color: var(--accent);
		box-shadow: 2px 2px 0 var(--accent);
	}

	.link-card--planned {
		opacity: 0.6;
		cursor: default;
	}

	.link-card--planned:hover {
		border-color: var(--border);
		box-shadow: none;
	}

	.link-card-icon {
		flex-shrink: 0;
		color: var(--text-muted);
	}

	.link-card:hover .link-card-icon {
		color: var(--accent);
	}

	.link-card-info {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.link-card-path {
		font-family: var(--font-mono);
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--accent);
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.link-card-title {
		font-weight: 500;
		font-size: 0.9375rem;
	}

	.link-card-description {
		font-size: 0.8125rem;
		color: var(--text-muted);
	}
</style>
