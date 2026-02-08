<script lang="ts">
import { Background, SvelteFlow } from "@xyflow/svelte";
import { onMount } from "svelte";
import "@xyflow/svelte/dist/style.css";
import {
	createArchitectureEdges,
	createArchitectureNodes,
	FLOW_READONLY_PROPS,
} from "$lib";

let mounted = $state(false);
onMount(() => (mounted = true));

const nodes = createArchitectureNodes();
const edges = createArchitectureEdges();
</script>

<div class="architecture-diagram">
	{#if mounted}
		<SvelteFlow
			{nodes}
			{edges}
			colorMode="dark"
			fitView
			{...FLOW_READONLY_PROPS}
		>
			<Background />
		</SvelteFlow>
	{/if}
</div>
