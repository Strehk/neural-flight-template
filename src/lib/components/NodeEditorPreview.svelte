<script lang="ts">
import { Background, type Edge, type Node, SvelteFlow } from "@xyflow/svelte";
import { onMount } from "svelte";
import "@xyflow/svelte/dist/style.css";
import { FLOW_READONLY_PROPS } from "$lib/flow/config";

let mounted = $state(false);
onMount(() => (mounted = true));

/** Static preview: LFO + Slider → Mixer → Flight Speed Output */
const nodes: Node[] = [
	{
		id: "lfo",
		type: "default",
		position: { x: 30, y: 20 },
		data: { label: "LFO\nwave: 0.5\nspeed: 0.1Hz" },
		class: "node-input",
	},
	{
		id: "slider",
		type: "default",
		position: { x: 30, y: 110 },
		data: { label: "SLIDER\nvalue: 0.6" },
		class: "node-input",
	},
	{
		id: "mixer",
		type: "default",
		position: { x: 220, y: 55 },
		data: { label: "MIXER\nA: 50%  B: 50%\nout: 0.55" },
		class: "node-server",
	},
	{
		id: "speed",
		type: "default",
		position: { x: 410, y: 55 },
		data: { label: "FLIGHT SPEED\n42 m/s\n[5-80]" },
		class: "node-output",
	},
];

const edges: Edge[] = [
	{ id: "e1", source: "lfo", target: "mixer", animated: true },
	{ id: "e2", source: "slider", target: "mixer", animated: true },
	{ id: "e3", source: "mixer", target: "speed", animated: true },
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
		border-radius: 0 rem;
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
