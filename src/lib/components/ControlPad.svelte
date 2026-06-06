<script lang="ts">
import { CONTROLS } from "$lib/config/flight";
import type { OrientationData } from "$lib/types/orientation";

interface Props {
	onOrientationChange: (data: OrientationData) => void;
}

const { onOrientationChange }: Props = $props();

const PAD_SIZE = 280;
const RADIUS = PAD_SIZE / 2;
const DOT_RADIUS = 10;

const [minPitch, maxPitch] = CONTROLS.PITCH_RANGE;
const [minRoll, maxRoll] = CONTROLS.ROLL_RANGE;

let padElement = $state<HTMLButtonElement | null>(null);
let pitch = $state(0);
let roll = $state(0);
let locked = $state(false);
let hovering = $state(false);
let dotX = $state(0);
let dotY = $state(0);

function emit(): void {
	onOrientationChange({
		type: "orientation",
		pitch,
		roll,
		timestamp: Date.now(),
	});
}

function resetOrientation(): void {
	pitch = 0;
	roll = 0;
	dotX = 0;
	dotY = 0;
	emit();
}

function updateFromMouse(event: MouseEvent): void {
	if (!padElement || locked) return;

	const rect = padElement.getBoundingClientRect();
	const x = event.clientX - rect.left - rect.width / 2;
	const y = event.clientY - rect.top - rect.height / 2;
	const distance = Math.hypot(x, y);

	if (distance > RADIUS) {
		hovering = false;
		resetOrientation();
		return;
	}

	hovering = true;
	dotX = x;
	dotY = y;

	const normalizedX = x / RADIUS;
	const normalizedY = y / RADIUS;

	roll = normalizedX < 0 ? normalizedX * -minRoll : normalizedX * maxRoll;
	pitch = normalizedY < 0 ? normalizedY * -minPitch : normalizedY * maxPitch;
	emit();
}

function handleMouseEnter(event: MouseEvent): void {
	if (locked) return;
	updateFromMouse(event);
}

function handleMouseMove(event: MouseEvent): void {
	updateFromMouse(event);
}

function handleMouseLeave(): void {
	if (locked) return;
	hovering = false;
	resetOrientation();
}

function toggleLock(event: MouseEvent): void {
	if (locked) {
		locked = false;
		updateFromMouse(event);
		return;
	}

	if (!hovering) return;
	locked = true;
	emit();
}
</script>

<div class="control-pad">
	<button
		bind:this={padElement}
		type="button"
		class="pad-surface"
		data-locked={locked}
		onmouseenter={handleMouseEnter}
		onmousemove={handleMouseMove}
		onmouseleave={handleMouseLeave}
		onclick={toggleLock}
		aria-label="ICAROS orientation control"
	>
		<svg viewBox={`0 0 ${PAD_SIZE} ${PAD_SIZE}`} class="pad-svg" aria-hidden="true">
			<circle class="pad-ring" cx={RADIUS} cy={RADIUS} r={RADIUS - 2} />
			<line class="pad-axis" x1={RADIUS} y1={12} x2={RADIUS} y2={PAD_SIZE - 12} />
			<line class="pad-axis" x1={12} y1={RADIUS} x2={PAD_SIZE - 12} y2={RADIUS} />
			<circle class="pad-center" cx={RADIUS} cy={RADIUS} r="4" />
			<circle
				class="pad-dot"
				cx={RADIUS + dotX}
				cy={RADIUS + dotY}
				r={DOT_RADIUS}
				data-active={locked || hovering}
			/>
		</svg>
	</button>

	<div class="pad-status mono-label">
		<span class="lock-indicator" data-locked={locked}></span>
		<span>{locked ? "Locked" : hovering ? "Tracking" : "Idle"}</span>
		<span>{Math.round(pitch)}° / {Math.round(roll)}°</span>
	</div>
</div>

<style>
	.control-pad {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.75rem;
	}

	.pad-surface {
		width: 280px;
		height: 280px;
		padding: 0;
		border: 0;
		border-radius: 999px;
		background: transparent;
		cursor: crosshair;
		display: block;
	}

	.pad-surface:focus-visible {
		outline: 2px solid var(--accent);
		outline-offset: 4px;
	}

	.pad-svg {
		display: block;
		width: 100%;
		height: 100%;
	}

	.pad-ring {
		fill: color-mix(in srgb, var(--surface-2) 92%, black);
		stroke: var(--border);
		stroke-width: 2;
	}

	.pad-axis {
		stroke: var(--border);
		stroke-width: 1.5;
		stroke-dasharray: 6 6;
		opacity: 0.8;
	}

	.pad-center {
		fill: var(--text-muted);
	}

	.pad-dot {
		fill: var(--accent);
		stroke: white;
		stroke-width: 2;
		opacity: 0;
		transform-origin: center;
		transition: opacity 120ms ease;
	}

	.pad-dot[data-active="true"] {
		opacity: 1;
	}

	.pad-status {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		font-size: 0.8rem;
		color: var(--text-muted);
	}

	.lock-indicator {
		width: 0.65rem;
		height: 0.65rem;
		border-radius: 999px;
		background: var(--text-muted);
		box-shadow: 0 0 0 1px var(--border);
	}

	.lock-indicator[data-locked="true"] {
		background: var(--accent);
		box-shadow: 0 0 0 1px var(--accent);
	}
</style>
