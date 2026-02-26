<script lang="ts">
/**
 * PreviewToolbar — Compact toolbar above the 3D preview canvas.
 *
 * Contains scene controls: Compile, Rotation, Lighting, Fullscreen, Geometry.
 * All styling via shader-rack.css — no local <style> block.
 */

import { Select } from "bits-ui";
import {
	ChevronDown,
	Lightbulb,
	LightbulbOff,
	Maximize,
	Minimize,
	Pause,
	Play,
	RotateCcw,
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

<div class="sp-toolbar">
	<div class="sp-toolbar-group">
		<button class="sp-toolbar-btn sp-toolbar-compile" onclick={oncompile} title="Compile (Ctrl+Enter)">
			<Play size={12} />
			<span>Compile</span>
		</button>

		<button
			class="sp-toolbar-btn"
			data-active={rotationEnabled}
			onclick={onrotation}
			title={rotationEnabled ? "Pause Rotation" : "Start Rotation"}
		>
			{#if rotationEnabled}<Pause size={12} />{:else}<RotateCcw size={12} />{/if}
		</button>

		<button
			class="sp-toolbar-btn"
			data-active={lightingEnabled}
			onclick={onlighting}
			title={lightingEnabled ? "Disable Lighting" : "Enable Lighting"}
		>
			{#if lightingEnabled}<LightbulbOff size={12} />{:else}<Lightbulb size={12} />{/if}
		</button>

		<button
			class="sp-toolbar-btn"
			onclick={onfullscreen}
			title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
		>
			{#if isFullscreen}<Minimize size={12} />{:else}<Maximize size={12} />{/if}
		</button>
	</div>

	<div class="sp-toolbar-geo">
		<Select.Root
			type="single"
			value={currentGeometry}
			onValueChange={(v) => { if (v) ongeometry(v as GeometryType); }}
		>
			<Select.Trigger class="sp-toolbar-select-trigger">
				<span>{geometries.find((g) => g.value === currentGeometry)?.label ?? "Sphere"}</span>
				<ChevronDown size={10} />
			</Select.Trigger>
			<Select.Portal>
				<Select.Content class="sp-toolbar-select-content" sideOffset={4} side="bottom">
					<Select.Viewport>
						{#each geometries as g (g.value)}
							<Select.Item value={g.value} label={g.label} class="sp-toolbar-select-item">
								{g.label}
							</Select.Item>
						{/each}
					</Select.Viewport>
				</Select.Content>
			</Select.Portal>
		</Select.Root>
	</div>
</div>
