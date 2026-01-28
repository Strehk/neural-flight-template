<script lang="ts">
import { onDestroy } from "svelte";
import ControlPad from "$lib/components/ControlPad.svelte";
import IcarosPreview from "$lib/components/IcarosPreview.svelte";
import SpeedButtons from "$lib/components/SpeedButtons.svelte";
import SettingsSidebar from "$lib/components/SettingsSidebar.svelte";
import type { OrientationData, SettingsUpdate, SpeedCommand } from "$lib/types/orientation";
import { createWebSocketClient } from "$lib/ws/client.svelte";
import { Plane, Settings } from "lucide-svelte";

const ws = createWebSocketClient();

let pitch = $state(0);
let roll = $state(0);
let sidebarOpen = $state(false);

function handleOrientation(data: OrientationData): void {
	pitch = data.pitch;
	roll = data.roll;
	ws.send(data);
}

function handleSpeed(cmd: SpeedCommand): void {
	ws.send(cmd);
}

function handleSettings(update: SettingsUpdate): void {
	ws.send(update);
}

function toggleSidebar(): void {
	sidebarOpen = !sidebarOpen;
}

onDestroy(() => ws.disconnect());
</script>

<svelte:head>
	<title>ICAROS Controller</title>
</svelte:head>

<SettingsSidebar open={sidebarOpen} onClose={toggleSidebar} onSettingsChange={handleSettings} />

<div class="controller-page">
	<header class="header-bar">
		<span class="mono-label" style="font-size: 0.85rem; color: var(--text); display: flex; align-items: center; gap: 0.4rem;">
			<Plane size={16} />
			ICAROS
		</span>
		<span class="mono-label">
			<span class="status-dot" data-status={ws.status}></span>
			{ws.status}
		</span>
		<button class="header-settings-btn" onclick={toggleSidebar} aria-label="Toggle settings">
			<Settings size={16} />
		</button>
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
	.header-settings-btn {
		background: none;
		border: none;
		color: var(--text-muted);
		cursor: pointer;
		padding: 0.25rem;
		display: flex;
		align-items: center;
	}
	.header-settings-btn:hover {
		color: var(--text);
	}
	.pad-section,
	.speed-section {
		width: 100%;
		max-width: 320px;
	}
</style>
