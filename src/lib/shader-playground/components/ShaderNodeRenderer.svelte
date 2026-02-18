<script lang="ts">
	/**
	 * ShaderNodeRenderer — Custom SvelteFlow node for the central Shader sink.
	 * Renders dynamic input handles from @endpoint uniforms.
	 */

	import { Handle, Position } from "@xyflow/svelte";
	import { Code } from "lucide-svelte";
	import "$lib/node-editor/canvas/canvas.css";

	interface Props {
		id: string;
		data: Record<string, unknown>;
	}

	const { id, data }: Props = $props();

	const label = $derived((data.label as string) ?? "Shader");
	const inputs = $derived(
		(data.inputs as { id: string; label: string }[]) ?? [],
	);
</script>

<div class="node node--process shader-node">
	<header>
		<Code size={14} />
		<span class="node-title">{label}</span>
	</header>

	<div class="content">
		{#if inputs.length === 0}
			<span class="shader-hint">No @endpoint uniforms</span>
		{:else}
			{#each inputs as port}
				<div class="shader-port-label">{port.label}</div>
			{/each}
		{/if}
	</div>
</div>

{#each inputs as port, i}
	<Handle
		type="target"
		position={Position.Left}
		id={port.id}
		style="top: {((i + 1) / (inputs.length + 1)) * 100}%"
	/>
{/each}

<style>
	.shader-node {
		min-width: 180px;
		--node-color: var(--accent-muted);
		border: 2px solid var(--node-color);
	}

	.shader-hint {
		font-size: 0.6rem;
		color: var(--text-subtle);
		font-style: italic;
	}

	.shader-port-label {
		font-size: 0.65rem;
		color: var(--text-muted);
		padding: 0.1rem 0;
	}
</style>
