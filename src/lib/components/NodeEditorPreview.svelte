<script lang="ts">
import { Background, type Edge, type Node, SvelteFlow } from "@xyflow/svelte";
import { onMount } from "svelte";
import "@xyflow/svelte/dist/style.css";
import { FLOW_READONLY_PROPS } from "$lib/flow/config";

let mounted = $state(false);
onMount(() => (mounted = true));

/** Static preview nodes: LFO → Remap → Fog Output */
const nodes: Node[] = [
	{
		id: "lfo",
		type: "default",
		position: { x: 50, y: 60 },
		data: { label: "LFO\nwave: 0.5\nspeed: 0.1Hz" },
		class: "node-input",
	},
	{
		id: "remap",
		type: "default",
		position: { x: 220, y: 60 },
		data: { label: "REMAP\nout: 125.0\n[50-200]" },
		class: "node-server",
	},
	{
		id: "fog",
		type: "default",
		position: { x: 390, y: 60 },
		data: { label: "FOG OUTPUT\nNear: 125.0\nFar: 500.0" },
		class: "node-output",
	},
];

const edges: Edge[] = [
	{ id: "e1", source: "lfo", target: "remap", animated: true },
	{ id: "e2", source: "remap", target: "fog", animated: true },
];
</script>

<div class="node-preview">
	{#if mounted}
		<SvelteFlow {nodes} {edges} colorMode="dark" fitView {...FLOW_READONLY_PROPS}>
			<Background />
		</SvelteFlow>
	{/if}
</div>

<style>
	.node-preview {
		height: 180px;
		border-radius: 0.5rem;
		overflow: hidden;
		border: 1px solid var(--color-border);
	}

	/* Node category colors */
	:global(.node-input .svelte-flow__node) {
		border-color: var(--color-success);
	}

	:global(.node-server .svelte-flow__node) {
		border-color: var(--color-primary);
	}

	:global(.node-output .svelte-flow__node) {
		border-color: var(--color-warning);
	}
</style>
