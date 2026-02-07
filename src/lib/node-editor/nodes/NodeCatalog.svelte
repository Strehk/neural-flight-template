<script lang="ts">
	/**
	 * NodeCatalog — Drag & Drop sidebar for adding nodes
	 *
	 * Draggable items that can be dropped onto the SvelteFlow canvas.
	 * Uses native HTML5 Drag & Drop API.
	 */

	import { X, Activity } from "lucide-svelte";
	import type { ComponentType } from "svelte";
	import type { ModuleVariant } from "../components/types";
	import { getAllNodeDefs } from "./registry";

	interface NodeCatalogItem {
		type: string;
		label: string;
		icon: ComponentType;
		description: string;
		color: string;
	}

	interface Props {
		open: boolean;
		onClose: () => void;
	}

	const { open, onClose }: Props = $props();

	const VARIANT_COLORS: Record<ModuleVariant, string> = {
		input: "var(--success)",
		process: "var(--text-muted)",
		trigger: "var(--warning)",
		logic: "var(--info)",
		output: "var(--accent)",
	};

	const CATALOG: NodeCatalogItem[] = getAllNodeDefs().map((def) => ({
		type: def.type,
		label: def.label,
		icon: def.module.icon as ComponentType,
		description: def.description,
		color: VARIANT_COLORS[def.module.variant] ?? "var(--text-muted)",
	}));

	function handleDragStart(e: DragEvent, item: NodeCatalogItem): void {
		if (!e.dataTransfer) return;
		e.dataTransfer.setData("application/reactflow", item.type);
		e.dataTransfer.effectAllowed = "move";
	}
</script>

{#if open}
	<aside class="sidebar">
		<div class="sidebar-header">
			<span class="sidebar-title">
				<Activity size={14} />
				<span class="mono-label">NODES</span>
			</span>
			<button class="sidebar-close" onclick={onClose} type="button">
				<X size={16} />
			</button>
		</div>

		<div class="sidebar-content">
			<p class="sidebar-hint">Drag nodes to canvas</p>

			<div class="catalog-list">
				{#each CATALOG as item}
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<div
						class="catalog-item"
						draggable="true"
						ondragstart={(e) => handleDragStart(e, item)}
						style="--item-color: {item.color}"
					>
						<div class="item-icon">
							<item.icon size={16} />
						</div>
						<div class="item-info">
							<span class="item-label">{item.label}</span>
							<span class="item-desc">{item.description}</span>
						</div>
					</div>
				{/each}
			</div>
		</div>
	</aside>
{/if}

<style>
	.sidebar {
		position: fixed;
		top: 0;
		right: 0;
		width: 240px;
		height: 100dvh;
		background: var(--surface);
		border-left: 1px solid var(--border);
		z-index: 100;
		display: flex;
		flex-direction: column;
	}

	.sidebar-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.75rem 1rem;
		border-bottom: 1px solid var(--border);
	}

	.sidebar-title {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		color: var(--text);
	}

	.mono-label {
		font-family: var(--font-mono);
		font-size: 0.7rem;
		font-weight: 700;
		letter-spacing: 0.05em;
	}

	.sidebar-close {
		background: transparent;
		border: none;
		color: var(--text-muted);
		cursor: pointer;
		padding: 0.25rem;
	}

	.sidebar-close:hover {
		color: var(--text);
	}

	.sidebar-content {
		flex: 1;
		overflow-y: auto;
		padding: 0.75rem;
	}

	.sidebar-hint {
		color: var(--text-muted);
		font-size: 0.7rem;
		margin-bottom: 0.75rem;
		text-align: center;
	}

	.catalog-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.catalog-item {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.5rem;
		background: var(--bg);
		border: 1px solid var(--border);
		cursor: grab;
		transition:
			border-color 0.15s ease,
			transform 0.15s ease;
	}

	.catalog-item:hover {
		border-color: var(--item-color);
		transform: translateX(2px);
	}

	.catalog-item:active {
		cursor: grabbing;
	}

	.item-icon {
		width: 32px;
		height: 32px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--surface);
		color: var(--item-color);
	}

	.item-info {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
	}

	.item-label {
		font-family: var(--font-mono);
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--text);
	}

	.item-desc {
		font-size: 0.6rem;
		color: var(--text-muted);
		line-height: 1.3;
	}
</style>
