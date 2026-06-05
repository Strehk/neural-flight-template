<script lang="ts">
import { ChevronLeft, Copy, Database, Droplets, Save, SlidersHorizontal } from "lucide-svelte";
import { onMount } from "svelte";
import PageHeader from "$lib/components/PageHeader.svelte";
import {
	buildWorldMap,
	cloneWorldPreset,
	colorForBiome,
	getActiveWorldPresetId,
	getWorldPreset,
	listWorldPresets,
	saveCustomWorldPreset,
	setActiveWorldPresetId,
	WORLD_PARAMETER_DEFS,
	WORLD_PRESETS,
} from "$lib/worldgen";
import type {
	BiomeId,
	WorldMap,
	WorldParameterDef,
	WorldParameterPath,
	WorldPreset,
} from "$lib/worldgen";

const PREVIEW_SIZE = 96;
const PREVIEW_SPAN = 1200;

let canvas: HTMLCanvasElement;
let preset = $state<WorldPreset>(cloneWorldPreset(WORLD_PRESETS[0]));
let presetOptions = $state<WorldPreset[]>(WORLD_PRESETS.map(cloneWorldPreset));
let selectedPresetId = $state(WORLD_PRESETS[0].id);
let draftName = $state("");
let saveMessage = $state("");
let previewRevision = $state(0);

const worldMap = $derived(buildWorldMap(preset, PREVIEW_SIZE, PREVIEW_SPAN));
const groupedParameters = $derived(groupParameters(WORLD_PARAMETER_DEFS));

onMount(() => {
	presetOptions = listWorldPresets();
	selectedPresetId = getActiveWorldPresetId();
	preset = getWorldPreset(selectedPresetId);
	draftName = `${preset.name} Copy`;
});

$effect(() => {
	if (!canvas) return;
	previewRevision;
	drawMap(canvas, worldMap);
});

function groupParameters(
	defs: WorldParameterDef[],
): Array<[string, WorldParameterDef[]]> {
	const groups = new Map<string, WorldParameterDef[]>();
	for (const def of defs) {
		const group = groups.get(def.group) ?? [];
		group.push(def);
		groups.set(def.group, group);
	}
	return Array.from(groups.entries());
}

function formatValue(value: number, step: number, unit = ""): string {
	const decimals = step >= 1 ? 0 : Math.max(0, -Math.floor(Math.log10(step)));
	return `${value.toFixed(decimals)}${unit}`;
}

function sanitizeId(name: string): string {
	const id = name
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "");
	return id.length > 0 ? id : `world-${Date.now()}`;
}

function selectPreset(id: string): void {
	selectedPresetId = id;
	preset = getWorldPreset(id);
	draftName = `${preset.name} Copy`;
	setActiveWorldPresetId(id);
	saveMessage = "World preset assigned to VR.";
}

function saveCurrentPreset(): void {
	const name = draftName.trim() || `${preset.name} Copy`;
	const next: WorldPreset = {
		...cloneWorldPreset(preset),
		id: sanitizeId(name),
		name,
		version: "0.1.0",
	};
	saveCustomWorldPreset(next);
	presetOptions = listWorldPresets();
	selectedPresetId = next.id;
	preset = next;
	saveMessage = "Custom world saved and assigned.";
}

function assignCurrentPreset(): void {
	const next: WorldPreset = {
		...cloneWorldPreset(preset),
		id: "active-world-draft",
		name: `${preset.name} Draft`,
		version: "0.1.0",
	};
	saveCustomWorldPreset(next);
	presetOptions = listWorldPresets();
	selectedPresetId = next.id;
	preset = next;
	setActiveWorldPresetId(next.id);
	saveMessage = "Gespeichert — VR-Seite neu laden um Änderungen zu übernehmen.";
}

function updateParameter(path: WorldParameterPath, value: number): void {
	const next = cloneWorldPreset(preset);
	switch (path) {
		case "seed":
			next.seed = value;
			break;
		case "terrain.heightScale":
			next.terrain.heightScale = value;
			break;
		case "terrain.continentScale":
			next.terrain.continentScale = value;
			break;
		case "terrain.ridgeStrength":
			next.terrain.ridgeStrength = value;
			break;
		case "terrain.basinDepth":
			next.terrain.basinDepth = value;
			break;
		case "terrain.detailAmplitude":
			next.terrain.detailAmplitude = value;
			break;
		case "terrain.cliffThreshold":
			next.terrain.cliffThreshold = value;
			break;
		case "climate.temperatureBias":
			next.climate.temperatureBias = value;
			break;
		case "climate.moistureBias":
			next.climate.moistureBias = value;
			break;
		case "climate.rainfallAmount":
			next.climate.rainfallAmount = value;
			break;
		case "climate.windDirectionDeg":
			next.climate.windDirectionDeg = value;
			break;
		case "climate.altitudeCooling":
			next.climate.altitudeCooling = value;
			break;
		case "hydrology.waterLevel":
			next.hydrology.waterLevel = value;
			break;
		case "hydrology.riverSourceCount":
			next.hydrology.riverSourceCount = value;
			break;
		case "hydrology.flowThreshold":
			next.hydrology.flowThreshold = value;
			break;
		case "hydrology.lakeThreshold":
			next.hydrology.lakeThreshold = value;
			break;
		case "hydrology.channelCarveStrength":
			next.hydrology.channelCarveStrength = value;
			break;
		case "hydrology.riverWidth":
			next.hydrology.riverWidth = value;
			break;
		case "biomes.forestWeight":
			next.biomes.forestWeight = value;
			break;
		case "biomes.wetlandWeight":
			next.biomes.wetlandWeight = value;
			break;
		case "biomes.fungalWeight":
			next.biomes.fungalWeight = value;
			break;
		case "biomes.drySteppeWeight":
			next.biomes.drySteppeWeight = value;
			break;
		case "biomes.alpineWeight":
			next.biomes.alpineWeight = value;
			break;
		case "biomes.transitionSoftness":
			next.biomes.transitionSoftness = value;
			break;
		case "vegetation.density":
			next.vegetation.density = value;
			break;
		case "vegetation.clustering":
			next.vegetation.clustering = value;
			break;
		case "vegetation.clearingAmount":
			next.vegetation.clearingAmount = value;
			break;
		case "vegetation.treeRatio":
			next.vegetation.treeRatio = value;
			break;
		case "vegetation.bushRatio":
			next.vegetation.bushRatio = value;
			break;
		case "vegetation.rockRatio":
			next.vegetation.rockRatio = value;
			break;
	}
	preset = next;
	previewRevision += 1;
	saveMessage = "Unsaved changes.";
}

function getParameterValue(path: WorldParameterPath): number {
	switch (path) {
		case "seed":
			return preset.seed;
		case "terrain.heightScale":
			return preset.terrain.heightScale;
		case "terrain.continentScale":
			return preset.terrain.continentScale;
		case "terrain.ridgeStrength":
			return preset.terrain.ridgeStrength;
		case "terrain.basinDepth":
			return preset.terrain.basinDepth;
		case "terrain.detailAmplitude":
			return preset.terrain.detailAmplitude;
		case "terrain.cliffThreshold":
			return preset.terrain.cliffThreshold;
		case "climate.temperatureBias":
			return preset.climate.temperatureBias;
		case "climate.moistureBias":
			return preset.climate.moistureBias;
		case "climate.rainfallAmount":
			return preset.climate.rainfallAmount;
		case "climate.windDirectionDeg":
			return preset.climate.windDirectionDeg;
		case "climate.altitudeCooling":
			return preset.climate.altitudeCooling;
		case "hydrology.waterLevel":
			return preset.hydrology.waterLevel;
		case "hydrology.riverSourceCount":
			return preset.hydrology.riverSourceCount;
		case "hydrology.flowThreshold":
			return preset.hydrology.flowThreshold;
		case "hydrology.lakeThreshold":
			return preset.hydrology.lakeThreshold;
		case "hydrology.channelCarveStrength":
			return preset.hydrology.channelCarveStrength;
		case "hydrology.riverWidth":
			return preset.hydrology.riverWidth;
		case "biomes.forestWeight":
			return preset.biomes.forestWeight;
		case "biomes.wetlandWeight":
			return preset.biomes.wetlandWeight;
		case "biomes.fungalWeight":
			return preset.biomes.fungalWeight;
		case "biomes.drySteppeWeight":
			return preset.biomes.drySteppeWeight;
		case "biomes.alpineWeight":
			return preset.biomes.alpineWeight;
		case "biomes.transitionSoftness":
			return preset.biomes.transitionSoftness;
		case "vegetation.density":
			return preset.vegetation.density;
		case "vegetation.clustering":
			return preset.vegetation.clustering;
		case "vegetation.clearingAmount":
			return preset.vegetation.clearingAmount;
		case "vegetation.treeRatio":
			return preset.vegetation.treeRatio;
		case "vegetation.bushRatio":
			return preset.vegetation.bushRatio;
		case "vegetation.rockRatio":
			return preset.vegetation.rockRatio;
	}
}

function drawMap(target: HTMLCanvasElement, map: WorldMap): void {
	const ctx = target.getContext("2d");
	if (!ctx) return;
	const scale = 3;
	target.width = map.size * scale;
	target.height = map.size * scale;
	ctx.imageSmoothingEnabled = false;
	ctx.clearRect(0, 0, target.width, target.height);

	for (const cell of map.cells) {
		ctx.fillStyle = shadeBiome(
			colorForBiome(cell.biome),
			cell.normalizedHeight,
			cell.waterDepth,
			cell.channelDepth,
		);
		ctx.fillRect(cell.gridX * scale, cell.gridZ * scale, scale, scale);
	}

	ctx.strokeStyle = "rgba(220, 255, 255, 0.75)";
	ctx.lineCap = "round";
	ctx.lineJoin = "round";
	for (const cell of map.cells) {
		if (!cell.isRiver || cell.downstreamIndex === null) continue;
		const downstream = map.cells[cell.downstreamIndex];
		ctx.lineWidth = Math.max(1.4, cell.riverWidth * 0.22 + Math.log1p(cell.flow) * 0.2);
		ctx.beginPath();
		ctx.moveTo(cell.gridX * scale + scale / 2, cell.gridZ * scale + scale / 2);
		ctx.lineTo(
			downstream.gridX * scale + scale / 2,
			downstream.gridZ * scale + scale / 2,
		);
		ctx.stroke();
	}
}

function shadeBiome(hex: string, height: number, waterDepth: number, channelDepth: number): string {
	const rgb = hexToRgb(hex);
	const channelShade = Math.min(0.26, channelDepth * 0.012);
	const shade = 0.72 + height * 0.35 - waterDepth * 0.32 - channelShade;
	return `rgb(${Math.round(rgb.r * shade)}, ${Math.round(rgb.g * shade)}, ${Math.round(rgb.b * shade)})`;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
	const normalized = hex.replace("#", "");
	return {
		r: Number.parseInt(normalized.slice(0, 2), 16),
		g: Number.parseInt(normalized.slice(2, 4), 16),
		b: Number.parseInt(normalized.slice(4, 6), 16),
	};
}

const legend: Array<{ biome: BiomeId; label: string }> = [
	{ biome: "deep-water", label: "Tiefwasser" },
	{ biome: "lake", label: "See" },
	{ biome: "river", label: "Fluss" },
	{ biome: "wetland", label: "Feuchtgebiet" },
	{ biome: "forest", label: "Wald" },
	{ biome: "dry-steppe", label: "Steppe" },
	{ biome: "rock", label: "Fels" },
	{ biome: "alpine", label: "Alpin" },
	{ biome: "meadow", label: "Wiese" },
];
</script>

<svelte:head>
	<title>World Builder | ICAROS VR</title>
</svelte:head>

<div class="worlds-page">
	<PageHeader icon={Droplets} label="World Builder" />

	<main class="worlds-main">
		<a class="back-link" href="/">
			<ChevronLeft size={14} />
			Back to platform
		</a>

		<section class="world-layout">
			<div class="preview-panel">
				<div class="panel-header">
					<div>
						<p class="mono-label">PREVIEW</p>
						<h1>{preset.name}</h1>
					</div>
					<span class="status-pill">{preset.id}</span>
				</div>

				<canvas bind:this={canvas} class="world-canvas" aria-label="Generated world biome preview"></canvas>
				<p class="preview-note">
					Preview: {PREVIEW_SPAN}x{PREVIEW_SPAN} units. Runtime: deterministic 4096-unit regions
					stream forever from the same preset.
				</p>

				<div class="stats-grid">
					<div>
						<span class="stat-label">Dominant</span>
						<strong>{worldMap.stats.dominantBiome}</strong>
					</div>
					<div>
						<span class="stat-label">River Cells</span>
						<strong>{worldMap.stats.riverCells}</strong>
					</div>
					<div>
						<span class="stat-label">Lake Cells</span>
						<strong>{worldMap.stats.lakeCells}</strong>
					</div>
					<div>
						<span class="stat-label">Water Cells</span>
						<strong>{worldMap.stats.waterCells}</strong>
					</div>
				</div>

				<div class="legend">
					{#each legend as item}
						<span class="legend-item">
							<span class="legend-swatch" style={`background: ${colorForBiome(item.biome)}`}></span>
							{item.label}
						</span>
					{/each}
				</div>
			</div>

			<div class="editor-panel">
				<div class="preset-card">
					<div class="section-heading">
						<Database size={14} />
						Preset
					</div>

					<label class="field-label" for="world-preset">Active world</label>
					<select
						id="world-preset"
						class="select-input"
						value={selectedPresetId}
						onchange={(event) => selectPreset(event.currentTarget.value)}
					>
						{#each presetOptions as option}
							<option value={option.id}>{option.name}</option>
						{/each}
					</select>

					<p class="preset-description">{preset.description}</p>

					<div class="save-row">
						<input
							class="text-input"
							bind:value={draftName}
							placeholder="Custom preset name"
						/>
						<button class="icon-button" onclick={saveCurrentPreset} title="Save custom world">
							<Save size={15} />
						</button>
						<button class="icon-button" onclick={assignCurrentPreset} title="Assign to VR">
							<Copy size={15} />
						</button>
					</div>

					{#if saveMessage}
						<p class="save-message">
							{saveMessage}
							{#if saveMessage.includes("Gespeichert") || saveMessage.includes("assigned")}
								<a href="/vr" class="vr-link">VR öffnen →</a>
							{/if}
						</p>
					{/if}
				</div>

				<div class="section-heading">
					<SlidersHorizontal size={14} />
					Regler
				</div>

				<div class="parameter-groups">
					{#each groupedParameters as [group, params]}
						<section class="parameter-group">
							<h2>{group}</h2>
							{#each params as param}
								{@const value = getParameterValue(param.id)}
								<label class="slider-row">
									<span class="slider-label">
										<span>{param.label}</span>
										<strong>{formatValue(value, param.step, param.unit)}</strong>
									</span>
									<input
										type="range"
										min={param.min}
										max={param.max}
										step={param.step}
										value={value}
										oninput={(event) =>
											updateParameter(param.id, event.currentTarget.valueAsNumber)}
									/>
								</label>
							{/each}
						</section>
					{/each}
				</div>
			</div>
		</section>
	</main>
</div>

<style>
	.worlds-page {
		min-height: 100dvh;
		background: var(--bg);
	}

	.worlds-main {
		width: min(1440px, 100%);
		margin: 0 auto;
		padding: var(--space-lg);
	}

	.back-link {
		display: inline-flex;
		align-items: center;
		gap: var(--space-xs);
		color: var(--text-muted);
		text-decoration: none;
		font-size: 0.8125rem;
		margin-bottom: var(--space-md);
	}

	.back-link:hover {
		color: var(--accent);
	}

	.world-layout {
		display: grid;
		grid-template-columns: minmax(360px, 1fr) minmax(360px, 520px);
		gap: var(--space-lg);
		align-items: start;
	}

	.preview-panel,
	.editor-panel,
	.preset-card,
	.parameter-group {
		border: 1px solid var(--border);
		background: var(--surface);
	}

	.preview-panel,
	.editor-panel {
		padding: var(--space-md);
	}

	.panel-header {
		display: flex;
		justify-content: space-between;
		gap: var(--space-md);
		align-items: flex-start;
		margin-bottom: var(--space-md);
	}

	h1 {
		font-size: 1.1rem;
		font-weight: 600;
		margin-top: var(--space-xs);
	}

	.status-pill {
		font-size: 0.6875rem;
		color: var(--accent);
		border: 1px solid var(--border);
		padding: 0.2rem 0.4rem;
		white-space: nowrap;
	}

	.world-canvas {
		display: block;
		width: 100%;
		aspect-ratio: 1;
		border: 1px solid var(--border-subtle);
		background: #030712;
		image-rendering: pixelated;
	}

	.preview-note {
		margin-top: var(--space-sm);
		color: var(--text-subtle);
		font-size: 0.72rem;
	}

	.stats-grid {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: var(--space-sm);
		margin-top: var(--space-md);
	}

	.stats-grid > div {
		border: 1px solid var(--border-subtle);
		padding: var(--space-sm);
		min-width: 0;
	}

	.stat-label {
		display: block;
		font-size: 0.6875rem;
		color: var(--text-subtle);
		text-transform: uppercase;
		margin-bottom: 0.15rem;
	}

	.stats-grid strong {
		font-size: 0.8125rem;
		overflow-wrap: anywhere;
	}

	.legend {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-sm);
		margin-top: var(--space-md);
	}

	.legend-item {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		font-size: 0.6875rem;
		color: var(--text-muted);
	}

	.legend-swatch {
		width: 0.75rem;
		height: 0.75rem;
		border: 1px solid rgba(255, 255, 255, 0.2);
	}

	.editor-panel {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
		max-height: calc(100dvh - 8rem);
		overflow: auto;
	}

	.preset-card {
		padding: var(--space-md);
	}

	.section-heading {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		color: var(--text-muted);
		margin-bottom: var(--space-sm);
	}

	.field-label {
		display: block;
		font-size: 0.75rem;
		color: var(--text-subtle);
		margin-bottom: var(--space-xs);
	}

	.select-input,
	.text-input {
		width: 100%;
		border: 1px solid var(--border);
		background: var(--bg);
		color: var(--text);
		font-family: var(--font-main);
		font-size: 0.8125rem;
		padding: 0.55rem 0.65rem;
	}

	.preset-description,
	.save-message {
		font-size: 0.75rem;
		color: var(--text-muted);
		margin-top: var(--space-sm);
	}

	.save-message {
		color: var(--accent);
	}

	.vr-link {
		display: inline-block;
		margin-left: var(--space-sm);
		color: var(--accent);
		text-decoration: underline;
		font-size: 0.75rem;
	}

	.save-row {
		display: grid;
		grid-template-columns: 1fr auto auto;
		gap: var(--space-sm);
		margin-top: var(--space-md);
	}

	.icon-button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 2.25rem;
		height: 2.25rem;
		border: 1px solid var(--border);
		background: var(--surface-hover);
		color: var(--text);
		cursor: pointer;
	}

	.icon-button:hover {
		border-color: var(--accent);
		color: var(--accent);
	}

	.parameter-groups {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
	}

	.parameter-group {
		padding: var(--space-md);
	}

	.parameter-group h2 {
		font-size: 0.8125rem;
		margin-bottom: var(--space-sm);
	}

	.slider-row {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
		padding: var(--space-sm) 0;
		border-top: 1px solid var(--border-subtle);
	}

	.slider-label {
		display: flex;
		justify-content: space-between;
		gap: var(--space-md);
		font-size: 0.75rem;
		color: var(--text-muted);
	}

	.slider-label strong {
		color: var(--text);
		font-weight: 500;
	}

	input[type="range"] {
		width: 100%;
		accent-color: var(--accent);
	}

	@media (max-width: 900px) {
		.worlds-main {
			padding: var(--space-md);
		}

		.world-layout {
			grid-template-columns: 1fr;
		}

		.editor-panel {
			max-height: none;
		}

		.stats-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}
</style>
