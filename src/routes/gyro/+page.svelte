<script lang="ts">
import { Crosshair, Plane, RotateCcw, Smartphone } from "lucide-svelte";
import { onDestroy } from "svelte";
import IcarosPreview from "$lib/components/IcarosPreview.svelte";
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
	<header class="header-bar">
		<span class="mono-label" style="font-size: 0.85rem; color: var(--text); display: flex; align-items: center; gap: 0.4rem;">
			<Smartphone size={16} />
			ICAROS GYRO
		</span>
		<span class="mono-label">
			<span class="status-dot" data-status={ws.status}></span>
			{ws.status}
		</span>
	</header>

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
				<button class="btn btn-primary btn-large" onclick={() => gyro.calibrate()}>
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

<style>
	.gyro-page {
		min-height: 100dvh;
		display: flex;
		flex-direction: column;
		touch-action: none;
		user-select: none;
		-webkit-user-select: none;
	}

	.gyro-main {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1.5rem;
		padding: 1.5rem 1rem;
	}

	/* Status cards for error/permission states */
	.status-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
		padding: 2rem;
		text-align: center;
		max-width: 320px;
	}

	.status-card h2 {
		margin: 0;
		font-size: 1.25rem;
		font-weight: 600;
	}

	.status-card p {
		margin: 0;
		color: var(--text-muted);
		font-size: 0.9rem;
	}

	.status-card.error {
		border-color: var(--error, #ef4444);
	}

	/* Preview section */
	.preview-section {
		padding: 1rem;
	}

	/* Data display */
	.data-section {
		display: flex;
		gap: 2rem;
		font-family: var(--font-mono, monospace);
	}

	.data-row {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.25rem;
	}

	.data-label {
		font-size: 0.75rem;
		color: var(--text-muted);
		letter-spacing: 0.05em;
	}

	.data-value {
		font-size: 1.5rem;
		font-weight: 600;
		min-width: 5ch;
		text-align: center;
	}

	.data-value.positive {
		color: var(--success, #22c55e);
	}

	.data-value.negative {
		color: var(--warning, #f59e0b);
	}

	/* Calibration prompt */
	.calibration-prompt {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
	}

	.calibration-hint {
		color: var(--warning, #f59e0b);
		font-size: 0.9rem;
		text-align: center;
	}

	.calibration-hint.pulse {
		animation: pulse 2s ease-in-out infinite;
	}

	@keyframes pulse {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.6; }
	}

	/* Controls */
	.controls-section {
		display: flex;
		gap: 1rem;
		flex-wrap: wrap;
		justify-content: center;
	}

	/* Buttons */
	.btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 0.75rem 1.25rem;
		border-radius: 0.5rem;
		font-size: 0.9rem;
		font-weight: 500;
		cursor: pointer;
		border: none;
		transition: all 0.15s ease;
		text-decoration: none;
	}

	.btn-primary {
		background: var(--primary, #a78bfa);
		color: var(--bg, #09090b);
	}

	.btn-primary:hover {
		background: var(--primary-hover, #c4b5fd);
	}

	.btn-secondary {
		background: var(--surface, #27272a);
		color: var(--text);
		border: 1px solid var(--border);
	}

	.btn-secondary:hover {
		background: var(--surface-hover, #3f3f46);
	}

	.btn-ghost {
		background: transparent;
		color: var(--text-muted);
	}

	.btn-ghost:hover {
		color: var(--text);
		background: var(--surface, #27272a);
	}

	.btn-large {
		padding: 1rem 2rem;
		font-size: 1rem;
	}

	/* Spinner */
	.spinner {
		width: 32px;
		height: 32px;
		border: 3px solid var(--border);
		border-top-color: var(--primary, #a78bfa);
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}
</style>
