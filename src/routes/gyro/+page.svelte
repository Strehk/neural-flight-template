<script lang="ts">
import { Crosshair, RotateCcw, Smartphone } from "lucide-svelte";
import { onDestroy } from "svelte";
import IcarosPreview from "$lib/components/IcarosPreview.svelte";
import PageHeader from "$lib/components/PageHeader.svelte";
import { createGyroClient } from "$lib/gyro/orientation.svelte";
import type { OrientationData } from "$lib/types/orientation";
import { createWebSocketClient } from "$lib/ws/client.svelte";

const gyro = createGyroClient();
const ws = createWebSocketClient();

let lastSendTime = 0;
const SEND_INTERVAL_MS = 33; // ~30Hz

// Send orientation data to VR scene
$effect(() => {
	const now = Date.now();
	if (now - lastSendTime < SEND_INTERVAL_MS) return;
	if (gyro.status !== "active") return;

	lastSendTime = now;
	const data: OrientationData = {
		type: "orientation",
		pitch: gyro.pitch,
		roll: gyro.roll,
		timestamp: now,
	};
	ws.send(data);
});

// Wake Lock to prevent screen from sleeping
let wakeLock: WakeLockSentinel | null = null;

async function requestWakeLock(): Promise<void> {
	if ("wakeLock" in navigator) {
		try {
			wakeLock = await navigator.wakeLock.request("screen");
		} catch {
			// Wake lock request failed (e.g., low battery)
		}
	}
}

// Request wake lock when gyro becomes active
$effect(() => {
	if (gyro.status === "active" && !wakeLock) {
		requestWakeLock();
	}
});

onDestroy(() => {
	gyro.destroy();
	ws.disconnect();
	wakeLock?.release();
});
</script>

<svelte:head>
	<title>ICAROS Gyro</title>
	<meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no" />
</svelte:head>

<div class="gyro-page">
	<PageHeader icon={Smartphone} label="ICAROS GYRO" status={ws.status} />

	<main class="gyro-main">
		{#if gyro.status === "not-supported"}
			<!-- Device doesn't support gyro -->
			<section class="status-card surface-panel error">
				<Smartphone size={48} />
				<h2>Gyroscope Not Supported</h2>
				<p>Your device doesn't support the Device Orientation API.</p>
				<a href="/controller" class="btn btn-primary">Use Touch Controller</a>
			</section>

		{:else if gyro.status === "permission-required"}
			<!-- iOS: needs user gesture for permission -->
			<section class="status-card surface-panel">
				<Smartphone size={48} />
				<h2>Enable Gyroscope</h2>
				<p>Tap the button below to enable motion sensors.</p>
				<button class="btn btn-primary" onclick={() => gyro.requestPermission()}>
					<Smartphone size={18} />
					Enable Gyroscope
				</button>
			</section>

		{:else if gyro.status === "error"}
			<!-- Permission denied or error -->
			<section class="status-card surface-panel error">
				<Smartphone size={48} />
				<h2>Permission Denied</h2>
				<p>{gyro.errorMessage}</p>
				<a href="/controller" class="btn btn-secondary">Use Touch Controller</a>
			</section>

		{:else if gyro.status === "not-calibrated"}
			<!-- Gyro working but needs calibration -->
			<section class="preview-section surface-panel">
				<IcarosPreview pitch={gyro.pitch} roll={gyro.roll} />
			</section>

			<section class="data-section">
				<div class="data-row">
					<span class="data-label">RAW BETA</span>
					<span class="data-value">{gyro.rawBeta}°</span>
				</div>
				<div class="data-row">
					<span class="data-label">RAW GAMMA</span>
					<span class="data-value">{gyro.rawGamma}°</span>
				</div>
			</section>

			<section class="calibration-prompt">
				<p class="calibration-hint pulse">⚠️ Place phone flat on ICAROS, then calibrate</p>
				<button class="btn btn-cta btn-lg" onclick={() => gyro.calibrate()}>
					<Crosshair size={20} />
					CALIBRATE NOW
				</button>
			</section>

		{:else if gyro.status === "active"}
			<!-- Fully active -->
			<section class="preview-section surface-panel">
				<IcarosPreview pitch={gyro.pitch} roll={gyro.roll} />
			</section>

			<section class="data-section">
				<div class="data-row">
					<span class="data-label">PITCH</span>
					<span class="data-value" class:positive={gyro.pitch > 0} class:negative={gyro.pitch < 0}>
						{gyro.pitch > 0 ? "+" : ""}{gyro.pitch}°
					</span>
				</div>
				<div class="data-row">
					<span class="data-label">ROLL</span>
					<span class="data-value" class:positive={gyro.roll > 0} class:negative={gyro.roll < 0}>
						{gyro.roll > 0 ? "+" : ""}{gyro.roll}°
					</span>
				</div>
			</section>

			<section class="controls-section">
				<button class="btn btn-secondary" onclick={() => gyro.calibrate()}>
					<Crosshair size={18} />
					Re-Calibrate
				</button>
				<button class="btn btn-ghost" onclick={() => gyro.resetCalibration()}>
					<RotateCcw size={18} />
					Reset
				</button>
			</section>

		{:else}
			<!-- Initializing -->
			<section class="status-card surface-panel">
				<div class="spinner"></div>
				<p>Initializing gyroscope...</p>
			</section>
		{/if}
	</main>
</div>
