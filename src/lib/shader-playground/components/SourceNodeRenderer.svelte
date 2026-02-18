<script lang="ts">
	/**
	 * SourceNodeRenderer — Custom SvelteFlow node for modulation sources.
	 * Renders 1 output handle. Source type (LFO, Noise, etc.) from data.
	 */

	import { Handle, Position } from "@xyflow/svelte";
	import { getModSource } from "../modulation_nodes";
	import "$lib/node-editor/canvas/canvas.css";

	interface Props {
		id: string;
		data: Record<string, unknown>;
	}

	const { id, data }: Props = $props();

	const sourceType = $derived(data.sourceType as string);
	const sourceDef = $derived(getModSource(sourceType));
	const label = $derived(sourceDef?.label ?? sourceType);
	const outputPort = $derived(sourceDef?.outputPort ?? "out");
</script>

{#if sourceDef}
	{@const Icon = sourceDef.icon}
	<div class="node node--input">
		<header>
			<Icon size={14} />
			<span class="node-title">{label}</span>
		</header>

		<div class="content">
			<span class="source-port-label">{outputPort}</span>
		</div>
	</div>

	<Handle
		type="source"
		position={Position.Right}
		id={outputPort}
		style="top: 50%"
	/>
{/if}

<style>
	.source-port-label {
		font-size: 0.6rem;
		color: var(--text-subtle);
	}
</style>
