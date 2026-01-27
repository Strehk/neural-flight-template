<script lang="ts">
import { Button } from "bits-ui";
import type { OrientationData } from "$lib/types/orientation";
import { CONTROLS } from "$lib/config/flight";

interface Props {
	onOrientationChange: (data: OrientationData) => void;
}

const { onOrientationChange }: Props = $props();

let pitch = $state(0);
let roll = $state(0);

function emit(): void {
	onOrientationChange({
		type: "orientation",
		pitch,
		roll,
		timestamp: Date.now(),
	});
}

function press(button: keyof typeof CONTROLS.BUTTONS): void {
	const dir = CONTROLS.BUTTONS[button];
	const [minPitch, maxPitch] = CONTROLS.PITCH_RANGE;
	const [minRoll, maxRoll] = CONTROLS.ROLL_RANGE;

	pitch = Math.max(minPitch, Math.min(maxPitch, pitch + dir.pitch * CONTROLS.STEP_DEGREES));
	roll = Math.max(minRoll, Math.min(maxRoll, roll + dir.roll * CONTROLS.STEP_DEGREES));
	emit();
}

function release(): void {
	pitch = 0;
	roll = 0;
	emit();
}

function handleKey(e: KeyboardEvent): void {
	const map: Record<string, keyof typeof CONTROLS.BUTTONS> = {
		ArrowUp: "UP",
		ArrowDown: "DOWN",
		ArrowLeft: "LEFT",
		ArrowRight: "RIGHT",
	};
	const button = map[e.key];
	if (button) press(button);
}

function handleKeyUp(): void {
	release();
}
</script>

<svelte:window onkeydown={handleKey} onkeyup={handleKeyUp} />

<div class="control-pad">
	<div class="pad-row">
		<div class="pad-spacer"></div>
		<Button.Root
			class="btn-primary pad-btn"
			onpointerdown={() => press('UP')}
			onpointerup={release}
		>
			▲
		</Button.Root>
		<div class="pad-spacer"></div>
	</div>
	<div class="pad-row">
		<Button.Root
			class="btn-primary pad-btn"
			onpointerdown={() => press('LEFT')}
			onpointerup={release}
		>
			◀
		</Button.Root>
		<div class="pad-center mono-label">
			{pitch}° / {roll}°
		</div>
		<Button.Root
			class="btn-primary pad-btn"
			onpointerdown={() => press('RIGHT')}
			onpointerup={release}
		>
			▶
		</Button.Root>
	</div>
	<div class="pad-row">
		<div class="pad-spacer"></div>
		<Button.Root
			class="btn-primary pad-btn"
			onpointerdown={() => press('DOWN')}
			onpointerup={release}
		>
			▼
		</Button.Root>
		<div class="pad-spacer"></div>
	</div>
</div>

<style>
	.control-pad {
		display: flex;
		flex-direction: column;
		gap: 4px;
		align-items: center;
	}
	.pad-row {
		display: grid;
		grid-template-columns: 64px 64px 64px;
		gap: 4px;
	}
	.pad-spacer {
		width: 64px;
		height: 64px;
	}
	:global(.pad-btn) {
		width: 64px;
		height: 64px;
		font-size: 1.25rem;
	}
	.pad-center {
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.65rem;
		color: var(--text-muted);
	}
</style>
