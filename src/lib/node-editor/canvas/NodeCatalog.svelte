<script lang="ts">
/**
 * NodeCatalog — Drag & Drop sidebar for adding nodes
 *
 * Reads ALL_NODES from registry, groups by category, draggable items.
 * Drag sets nodeType in DataTransfer → EditorCanvas handles the drop.
 *
 * Styles: sidebar → app.css, catalog-specific → canvas.css
 */

import { Activity, X } from "lucide-svelte";
import { getAllNodes } from "../nodes/registry";
import type { NodeDef } from "../nodes/types";
import "./canvas.css";

interface Props {
	open: boolean;
	onClose: () => void;
}

const { open, onClose }: Props = $props();

const grouped = $derived(
	getAllNodes().reduce<Record<string, NodeDef[]>>((acc, node) => {
		(acc[node.category] ??= []).push(node);
		return acc;
	}, {}),
);

function handleDragStart(e: DragEvent, nodeType: string) {
	e.dataTransfer?.setData("application/reactflow", nodeType);
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
			{#each Object.entries(grouped) as [category, nodes]}
				<div class="catalog-group">
					<span class="catalog-group-label">{category}</span>
					{#each nodes as node}
						{@const Icon = node.icon}
						<div
							class="catalog-item"
							draggable="true"
							ondragstart={(e) => handleDragStart(e, node.type)}
							role="button"
							tabindex="0"
						>
							<Icon size={14} />
							<span>{node.label}</span>
						</div>
					{/each}
				</div>
			{/each}
		</div>
	</aside>
{/if}
