<script lang="ts">
	/**
	 * PreviewToolbar — Compact toolbar above the 3D preview canvas.
	 *
	 * Contains scene controls: Compile, Rotation, Lighting, Fullscreen, Geometry.
	 * Follows the "controls at the viewport" pattern (like Blender/Reason).
	 */

	import {
		Play,
		RotateCcw,
		Pause,
		Lightbulb,
		LightbulbOff,
		Maximize,
		Minimize,
	} from "lucide-svelte";
	import type { GeometryType } from "../types";

	interface Props {
		oncompile: () => void;
		rotationEnabled: boolean;
		onrotation: () => void;
		lightingEnabled: boolean;
		onlighting: () => void;
		isFullscreen: boolean;
		onfullscreen: () => void;
		currentGeometry: GeometryType;
		ongeometry: (type: GeometryType) => void;
	}

	let {
		oncompile,
		rotationEnabled,
		onrotation,
		lightingEnabled,
		onlighting,
		isFullscreen,
		onfullscreen,
		currentGeometry,
		ongeometry,
	}: Props = $props();

	const geometries: { value: GeometryType; label: string }[] = [
		{ value: "plane", label: "Plane" },
		{ value: "sphere", label: "Sphere" },
		{ value: "cube", label: "Cube" },
		{ value: "torus", label: "Torus" },
		{ value: "cylinder", label: "Cylinder" },
	];
</script>

<div class="sp-preview-toolbar">
	<div class="sp-pt-group">
		<button class="sp-pt-btn sp-pt-compile" onclick={oncompile} title="Compile (Ctrl+Enter)">
			<Play size={12} />
			<span>Compile</span>
		</button>

		<button
			class="sp-pt-btn"
			class:active={rotationEnabled}
			onclick={onrotation}
			title={rotationEnabled ? "Pause Rotation" : "Start Rotation"}
		>
			{#if rotationEnabled}<Pause size={12} />{:else}<RotateCcw size={12} />{/if}
		</button>

		<button
			class="sp-pt-btn"
			class:active={lightingEnabled}
			onclick={onlighting}
			title={lightingEnabled ? "Disable Lighting" : "Enable Lighting"}
		>
			{#if lightingEnabled}<LightbulbOff size={12} />{:else}<Lightbulb size={12} />{/if}
		</button>

		<button
			class="sp-pt-btn"
			onclick={onfullscreen}
			title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
		>
			{#if isFullscreen}<Minimize size={12} />{:else}<Maximize size={12} />{/if}
		</button>
	</div>

	<div class="sp-pt-geo">
		<select
			class="sp-pt-select"
			value={currentGeometry}
			onchange={(e) => ongeometry(e.currentTarget.value as GeometryType)}
		>
			{#each geometries as g (g.value)}
				<option value={g.value}>{g.label}</option>
			{/each}
		</select>
	</div>
</div>

<style>
	.sp-preview-toolbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.25rem 0.5rem;
		background: var(--bg);
		border-bottom: 1px solid var(--border-subtle);
		gap: 0.5rem;
		flex-shrink: 0;
	}

	.sp-pt-group {
		display: flex;
		align-items: center;
		gap: 2px;
	}

	.sp-pt-btn {
		all: unset;
		display: flex;
		align-items: center;
		gap: 4px;
		padding: 3px 6px;
		font-size: 0.625rem;
		font-family: var(--font-mono);
		color: var(--text-subtle);
		cursor: pointer;
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.sp-pt-btn:hover {
		color: var(--text-muted);
	}

	.sp-pt-btn.active {
		color: var(--accent);
	}

	.sp-pt-compile {
		color: var(--text-muted);
		background: var(--border-subtle);
		padding: 3px 8px;
	}

	.sp-pt-compile:hover {
		background: var(--accent-muted);
		color: var(--text);
	}

	.sp-pt-select {
		all: unset;
		font-size: 0.625rem;
		font-family: var(--font-mono);
		color: var(--text-subtle);
		cursor: pointer;
		padding: 2px 4px;
		text-transform: uppercase;
	}

	.sp-pt-select:hover {
		color: var(--text-muted);
	}

	.sp-pt-geo {
		display: flex;
		align-items: center;
	}
</style>
