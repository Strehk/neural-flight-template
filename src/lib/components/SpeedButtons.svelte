<script lang="ts">
import { Button } from "bits-ui";
import { CircleStop, Zap } from "lucide-svelte";
import type { SpeedCommand } from "$lib/types/orientation";

interface Props {
	onSpeedCommand: (cmd: SpeedCommand) => void;
}

const { onSpeedCommand }: Props = $props();

let accelActive = $state(false);
let brakeActive = $state(false);

function send(action: "accelerate" | "brake", active: boolean): void {
	if (action === "accelerate") accelActive = active;
	else brakeActive = active;
	onSpeedCommand({ type: "speed", action, active, timestamp: Date.now() });
}
</script>

<div class="speed-buttons">
	<Button.Root
		class="btn-accent speed-btn"
		data-active={accelActive}
		onpointerdown={() => send('accelerate', true)}
		onpointerup={() => send('accelerate', false)}
		onpointerleave={() => { if (accelActive) send('accelerate', false); }}
	>
		<Zap size={14} /> Accelerate
	</Button.Root>
	<Button.Root
		class="btn-accent speed-btn"
		data-active={brakeActive}
		onpointerdown={() => send('brake', true)}
		onpointerup={() => send('brake', false)}
		onpointerleave={() => { if (brakeActive) send('brake', false); }}
	>
		<CircleStop size={14} /> Brake
	</Button.Root>
</div>

<style>
	.speed-buttons {
		display: flex;
		gap: 0.75rem;
		justify-content: center;
	}
	:global(.speed-btn) {
		flex: 1;
		max-width: 200px;
		padding: 0.75rem 1rem;
		font-size: 0.8rem;
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
	}
</style>
