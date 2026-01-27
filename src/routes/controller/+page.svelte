<script lang="ts">
import { onDestroy } from "svelte";
import ControlPad from "$lib/components/ControlPad.svelte";
import IcarosPreview from "$lib/components/IcarosPreview.svelte";
import SpeedButtons from "$lib/components/SpeedButtons.svelte";
import type { OrientationData, SpeedCommand } from "$lib/types/orientation";
import { createWebSocketClient } from "$lib/ws/client.svelte";

const ws = createWebSocketClient();

let pitch = $state(0);
let roll = $state(0);

function handleOrientation(data: OrientationData): void {
	pitch = data.pitch;
	roll = data.roll;
	ws.send(data);
}

function handleSpeed(cmd: SpeedCommand): void {
	ws.send(cmd);
}

onDestroy(() => ws.disconnect());
</script>

<svelte:head>
	<title>ICAROS Controller</title>
</svelte:head>

<div class="controller-page">
	<header class="header-bar">
		<span class="mono-label" style="font-size: 0.85rem; color: var(--text);">
			✈️ ICAROS
		</span>
		<span class="mono-label">
			<span class="status-dot" data-status={ws.status}></span>
			{ws.status}
		</span>
	</header>

	<main class="controller-main">
		<section class="preview-section surface-panel">
			<IcarosPreview {pitch} {roll} />
		</section>

		<section class="pad-section">
			<ControlPad onOrientationChange={handleOrientation} />
		</section>

		<section class="speed-section">
			<SpeedButtons onSpeedCommand={handleSpeed} />
		</section>
	</main>
</div>

<style>
	.controller-page {
		min-height: 100dvh;
		display: flex;
		flex-direction: column;
	}
	.controller-main {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1.5rem;
		padding: 1.5rem 1rem;
	}
	.preview-section {
		padding: 1rem;
	}
	.pad-section,
	.speed-section {
		width: 100%;
		max-width: 320px;
	}
</style>
