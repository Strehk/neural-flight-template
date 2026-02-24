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

<style>
	.sp-status-bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 3px var(--space-sm);
		background: var(--bg);
		border-top: 1px solid var(--border-subtle);
		border-bottom: 1px solid var(--border-subtle);
		min-height: 22px;
		gap: var(--space-sm);
		flex-shrink: 0;
	}

	.sp-status-leds {
		display: flex;
		align-items: center;
		gap: 6px;
		flex-wrap: wrap;
	}

	.sp-status-led {
		display: inline-flex;
		align-items: center;
		gap: 3px;
		font-size: 0.5rem;
		font-family: var(--font-mono);
		text-transform: uppercase;
		letter-spacing: 0.04em;
		padding: 1px 5px;
		border-radius: 1px;
	}

	.sp-status-led::before {
		content: "";
		display: inline-block;
		width: 5px;
		height: 5px;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.sp-status-led[data-status="active"]::before {
		background: var(--success);
		box-shadow: 0 0 4px var(--success);
	}

	.sp-status-led[data-status="active"] {
		color: var(--text-muted);
	}

	.sp-status-led[data-status="idle"]::before {
		background: var(--text-subtle);
		opacity: 0.4;
	}

	.sp-status-led[data-status="idle"] {
		color: var(--text-subtle);
		opacity: 0.5;
	}

	.sp-status-led[data-status="error"]::before {
		background: var(--error);
		box-shadow: 0 0 4px var(--error);
	}

	.sp-status-led[data-status="error"] {
		color: var(--error);
	}

	.sp-status-right {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		flex-shrink: 0;
	}

	.sp-status-fps {
		font-size: 0.5625rem;
		font-family: var(--font-mono);
		color: var(--text-subtle);
	}

	.sp-status-compile {
		font-size: 0.5625rem;
		font-family: var(--font-mono);
		font-weight: 700;
	}

	.sp-status-compile[data-ok="true"] {
		color: var(--success);
	}

	.sp-status-compile[data-ok="false"] {
		color: var(--error);
	}
</style>
