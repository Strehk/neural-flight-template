<script lang="ts">
import { Gamepad2, Settings } from "lucide-svelte";
import { onDestroy } from "svelte";
import ControlPad from "$lib/components/ControlPad.svelte";
import IcarosPreview from "$lib/components/IcarosPreview.svelte";
import PageHeader from "$lib/components/PageHeader.svelte";
import SettingsSidebar from "$lib/components/SettingsSidebar.svelte";
import SpeedButtons from "$lib/components/SpeedButtons.svelte";
import { getExperience } from "$lib/experiences/catalog";
import { getActiveExperienceId } from "$lib/experiences/loader";
import type {
	OrientationData,
	SettingsUpdate,
	SpeedCommand,
} from "$lib/types/orientation";
import { createWebSocketClient } from "$lib/ws/client.svelte";

// Load parameters from the active experience manifest
const manifest = getExperience(getActiveExperienceId());
const parameters = manifest.parameters;

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

<SettingsSidebar open={sidebarOpen} onClose={toggleSidebar} onSettingsChange={handleSettings} {parameters} />

<div class="controller-page">
	<PageHeader icon={Gamepad2} label="ICAROS" status={ws.status}>
		{#snippet actions()}
			<button class="header-settings-btn" onclick={toggleSidebar} aria-label="Toggle settings">
				<Settings size={16} />
			</button>
		{/snippet}
	</PageHeader>

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
