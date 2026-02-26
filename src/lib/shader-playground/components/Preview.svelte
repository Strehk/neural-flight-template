<script lang="ts">
import { onDestroy, onMount } from "svelte";
import { createPlaygroundRenderer } from "../engine/renderer";
import type { PlaygroundRenderer } from "../types";

interface Props {
	onrenderer?: (renderer: PlaygroundRenderer) => void;
}

let { onrenderer }: Props = $props();

let canvasEl: HTMLCanvasElement | undefined = $state();
let renderer: PlaygroundRenderer | undefined = $state();

onMount(() => {
	if (!canvasEl) return;
	renderer = createPlaygroundRenderer(canvasEl);
	onrenderer?.(renderer);

	const observer = new ResizeObserver(() => renderer?.resize());
	observer.observe(canvasEl);
	return () => observer.disconnect();
});

onDestroy(() => renderer?.dispose());
</script>

<div class="sp-preview-container">
	<canvas bind:this={canvasEl}></canvas>
</div>
