<script lang="ts">
	import { onMount, onDestroy } from "svelte";
	import {
		createPlaygroundRenderer,
		DEFAULT_FRAGMENT,
	} from "../engine/renderer";
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

		// Initial shader
		renderer.updateShader(DEFAULT_FRAGMENT, null);

		// Notify parent
		onrenderer?.(renderer);

		// Resize observer
		const observer = new ResizeObserver(() => {
			renderer?.resize();
		});
		observer.observe(canvasEl);

		return () => {
			observer.disconnect();
		};
	});

	onDestroy(() => {
		renderer?.dispose();
	});
</script>

<div class="sp-preview-container">
	<canvas bind:this={canvasEl}></canvas>
</div>

<style>
	.sp-preview-container {
		width: 100%;
		height: 100%;
		min-height: 200px;
		position: relative;
		background: var(--bg);
		border-radius: var(--radius-none);
		overflow: hidden;
	}

	.sp-preview-container canvas {
		width: 100%;
		height: 100%;
		display: block;
	}
</style>
