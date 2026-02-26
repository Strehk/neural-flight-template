<script lang="ts">
/**
 * StatusBar — Module-LEDs + FPS + Compile Status.
 *
 * Sits between the Focus zone and Control zone in the Rack.
 * Shows at-a-glance system health.
 */

import type { RackControlModule } from "../rack/types";

interface Props {
	controlModules: RackControlModule[];
	fps: number;
	compileOk: boolean;
	errorCount: number;
}

let { controlModules, fps, compileOk, errorCount }: Props = $props();
</script>

<div class="sp-status-bar">
	<div class="sp-status-leds">
		<span class="sp-status-led" data-status={compileOk ? "active" : "error"}>
			{compileOk ? "SYS" : "ERR"}
		</span>
		{#each controlModules as mod (mod.id)}
			<span
				class="sp-status-led"
				data-status={mod.enabled ? "active" : "idle"}
				title="{mod.title} → {mod.targetUniform}"
			>
				{mod.title}
			</span>
		{/each}
	</div>

	<div class="sp-status-right">
		<span class="sp-status-fps">FPS: {fps}</span>
		<span class="sp-status-compile" data-ok={compileOk}>
			{#if compileOk}
				✓ OK
			{:else}
				ERR ({errorCount})
			{/if}
		</span>
	</div>
</div>

