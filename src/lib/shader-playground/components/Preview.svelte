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
let observer: ResizeObserver | undefined;

onMount(() => {
	if (!canvasEl) return;
	createPlaygroundRenderer(canvasEl).then((r) => {
		renderer = r;
		onrenderer?.(r);
	});

	observer = new ResizeObserver(() => renderer?.resize());
	observer.observe(canvasEl);
});

onDestroy(() => {
	observer?.disconnect();
	renderer?.dispose();
});
</script>

<div class="sp-preview-container">
	<canvas bind:this={canvasEl}></canvas>
</div>
