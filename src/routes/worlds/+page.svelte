<script lang="ts">
import { ChevronLeft, Copy, Database, Droplets, Save, SlidersHorizontal } from "lucide-svelte";
import { onMount } from "svelte";
import PageHeader from "$lib/components/PageHeader.svelte";
import {
	cloneWorldPreset,
	getActiveWorldPresetId,
	getWorldPreset,
	listWorldPresets,
	saveCustomWorldPreset,
	setActiveWorldPresetId,
	TerrainSampler,
	worldPresetToTerrainConfig,
	WORLD_PARAMETER_DEFS,
	WORLD_PRESETS,
} from "$lib/worldgen";
import type {
	TerrainBiomeId,
	WorldParameterDef,
	WorldParameterPath,
	WorldPreset,
} from "$lib/worldgen";

const PREVIEW_SIZE = 110;
const PREVIEW_SPAN = 1800;

// Preview now samples the SAME pipeline the flight streams (TerrainSampler),
// so the map shows the real macro layer: biomes, mountains, rivers and lakes.
// The flight then adds high-frequency detail on top.
const TERRAIN_BIOME_COLORS: Record<TerrainBiomeId, string> = {
	forest: "#3f7d54",
	grassland: "#8fae5e",
	mountains: "#8a8f99",
	snow: "#e9eef6",
	desert: "#cdb069",
	barrens: "#9c8a6e",
};
const WATER_COLOR = { r: 38, g: 98, b: 168 };

function previewColorForBiome(biome: TerrainBiomeId): string {
	return TERRAIN_BIOME_COLORS[biome];
}

interface PreviewCell {
	biome: TerrainBiomeId;
	height: number;
	isWater: boolean;
}
interface PreviewMap {
	size: number;
	cells: PreviewCell[];
	minHeight: number;
	maxHeight: number;
	dominantBiome: TerrainBiomeId;
	waterFraction: number;
}

/**
 * Build the top-down preview by sampling the real TerrainSampler over a grid —
 * the macro layer of the actual streamed world (biomes + height + rivers/lakes).
 */
function buildPreview(source: WorldPreset): PreviewMap {
	const sampler = new TerrainSampler(worldPresetToTerrainConfig(source));
	const cells: PreviewCell[] = [];
	const step = PREVIEW_SPAN / Math.max(1, PREVIEW_SIZE - 1);
	const half = PREVIEW_SPAN / 2;
	let minHeight = Infinity;
	let maxHeight = -Infinity;
	let waterCount = 0;
	const biomeCounts = new Map<TerrainBiomeId, number>();
	for (let z = 0; z < PREVIEW_SIZE; z++) {
		for (let x = 0; x < PREVIEW_SIZE; x++) {
			const p = sampler.sample(x * step - half, z * step - half);
			cells.push({ biome: p.dominantBiome, height: p.height, isWater: p.isWater });
			if (p.height < minHeight) minHeight = p.height;
			if (p.height > maxHeight) maxHeight = p.height;
			if (p.isWater) waterCount++;
			biomeCounts.set(p.dominantBiome, (biomeCounts.get(p.dominantBiome) ?? 0) + 1);
		}
	}
	let dominantBiome: TerrainBiomeId = "grassland";
	let best = -1;
	for (const [biome, count] of biomeCounts) {
		if (count > best) {
			best = count;
			dominantBiome = biome;
		}
	}
	return {
		size: PREVIEW_SIZE,
		cells,
		minHeight,
		maxHeight,
		dominantBiome,
		waterFraction: waterCount / Math.max(1, cells.length),
	};
}

let canvas: HTMLCanvasElement;
let preset = $state<WorldPreset>(cloneWorldPreset(WORLD_PRESETS[0]));
let presetOptions = $state<WorldPreset[]>(WORLD_PRESETS.map(cloneWorldPreset));
let selectedPresetId = $state(WORLD_PRESETS[0].id);
let draftName = $state("");
let saveMessage = $state("");
let previewRevision = $state(0);
let activeParameterGroup = $state("Terrain");

const worldMap = $derived(buildPreview(preset));
const groupedParameters = $derived(groupParameters(WORLD_PARAMETER_DEFS));
const activeParameterTitle = $derived(
	groupedParameters.some(([group]) => group === activeParameterGroup)
		? activeParameterGroup
		: (groupedParameters[0]?.[0] ?? ""),
);
const activeParameters = $derived(
	groupedParameters.find(([group]) => group === activeParameterTitle)?.[1] ?? [],
);

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
	saveMessage = "Terrain preset assigned to VR.";
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
	saveMessage = "Custom terrain preset saved and assigned.";
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
	saveMessage = "Gespeichert — unterstützte Experiences übernehmen dieses Terrain nach dem VR-Neuladen.";
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
		case "terrain.waterLevel":
			next.terrain.waterLevel = value;
			break;
		case "biomes.forestWeight":
			next.biomes.forestWeight = value;
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
		case "terrain.waterLevel":
			return preset.terrain.waterLevel;
		case "biomes.forestWeight":
			return preset.biomes.forestWeight;
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

function drawMap(target: HTMLCanvasElement, map: PreviewMap): void {
	const ctx = target.getContext("2d");
	if (!ctx) return;
	const scale = 3;
	target.width = map.size * scale;
	target.height = map.size * scale;
	ctx.imageSmoothingEnabled = false;
	ctx.clearRect(0, 0, target.width, target.height);

	const range = Math.max(1e-3, map.maxHeight - map.minHeight);
	for (let i = 0; i < map.cells.length; i++) {
		const cell = map.cells[i];
		const gridX = i % map.size;
		const gridZ = Math.floor(i / map.size);
		const nh = (cell.height - map.minHeight) / range;
		ctx.fillStyle = cell.isWater
			? shadeWater(nh)
			: shadeBiome(previewColorForBiome(cell.biome), nh);
		ctx.fillRect(gridX * scale, gridZ * scale, scale, scale);
	}
}

function shadeBiome(hex: string, height: number): string {
	const rgb = hexToRgb(hex);
	const shade = 0.62 + height * 0.5;
	return `rgb(${Math.round(rgb.r * shade)}, ${Math.round(rgb.g * shade)}, ${Math.round(rgb.b * shade)})`;
}

function shadeWater(height: number): string {
	const shade = 0.6 + height * 0.5;
	return `rgb(${Math.round(WATER_COLOR.r * shade)}, ${Math.round(WATER_COLOR.g * shade)}, ${Math.round(WATER_COLOR.b * shade)})`;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
	const normalized = hex.replace("#", "");
	return {
		r: Number.parseInt(normalized.slice(0, 2), 16),
		g: Number.parseInt(normalized.slice(2, 4), 16),
		b: Number.parseInt(normalized.slice(4, 6), 16),
	};
}

const legend: Array<{ color: string; label: string }> = [
	{ color: TERRAIN_BIOME_COLORS.forest, label: "Wald" },
	{ color: TERRAIN_BIOME_COLORS.grassland, label: "Wiese" },
	{ color: TERRAIN_BIOME_COLORS.mountains, label: "Berge" },
	{ color: TERRAIN_BIOME_COLORS.snow, label: "Schnee" },
	{ color: TERRAIN_BIOME_COLORS.desert, label: "Wüste" },
	{ color: TERRAIN_BIOME_COLORS.barrens, label: "Ödland" },
	{ color: `rgb(${WATER_COLOR.r}, ${WATER_COLOR.g}, ${WATER_COLOR.b})`, label: "Wasser" },
];
</script>

<svelte:head>
	<title>Terrain Builder | ICAROS VR</title>
</svelte:head>

<div class="worlds-page">
	<PageHeader icon={Droplets} label="Terrain Builder" />

	<main class="worlds-main">
		<a class="back-link" href="/">
			<ChevronLeft size={14} />
			Back to platform
		</a>

		<section class="world-layout">
			<div class="preview-panel">
				<div class="panel-header">
					<div>
						<p class="mono-label">TERRAIN PREVIEW</p>
						<h1>{preset.name}</h1>
					</div>
					<span class="status-pill">{preset.id}</span>
				</div>

				<canvas bind:this={canvas} class="world-canvas" aria-label="Generated world biome preview"></canvas>
				<p class="preview-note">
					Preview: {PREVIEW_SPAN}x{PREVIEW_SPAN} units. Supported experiences receive this
					preset through the shared worldgen terrain module.
				</p>

				<div class="stats-grid">
					<div>
						<span class="stat-label">Dominant</span>
						<strong>{worldMap.dominantBiome}</strong>
					</div>
					<div>
						<span class="stat-label">Wasser</span>
						<strong>{(worldMap.waterFraction * 100).toFixed(1)}%</strong>
					</div>
				</div>

				<div class="legend">
					{#each legend as item}
						<span class="legend-item">
							<span class="legend-swatch" style={`background: ${item.color}`}></span>
							{item.label}
						</span>
					{/each}
				</div>
			</div>

			<div class="editor-panel">
				<div class="preset-card">
					<div class="section-heading">
						<Database size={14} />
						Terrain Preset
					</div>

					<label class="field-label" for="world-preset">Aktives Terrain</label>
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
							placeholder="Custom terrain preset name"
						/>
						<button class="icon-button" onclick={saveCurrentPreset} title="Save custom terrain preset">
							<Save size={15} />
						</button>
						<button class="icon-button" onclick={assignCurrentPreset} title="Assign terrain preset to VR">
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
					Weltparameter
				</div>

				<div class="parameter-tabs" role="tablist" aria-label="Parametergruppen">
					{#each groupedParameters as [group, params]}
						<button
							type="button"
							class:active={group === activeParameterTitle}
							role="tab"
							aria-selected={group === activeParameterTitle}
							onclick={() => (activeParameterGroup = group)}
						>
							<span>{group}</span>
							<small>{params.length}</small>
						</button>
					{/each}
				</div>

				<section class="parameter-group" aria-label={activeParameterTitle}>
					<div class="parameter-group-header">
						<h2>{activeParameterTitle}</h2>
						<span>{activeParameters.length} Regler</span>
					</div>
					{#each activeParameters as param}
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

	.parameter-tabs {
		display: grid;
		grid-template-columns: repeat(5, minmax(0, 1fr));
		gap: var(--space-xs);
		margin-bottom: var(--space-sm);
	}

	.parameter-tabs button {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-xs);
		border: 1px solid var(--border-subtle);
		background: var(--bg);
		color: var(--text-muted);
		font-family: var(--font-main);
		font-size: 0.7rem;
		padding: 0.45rem 0.5rem;
		cursor: pointer;
		min-width: 0;
	}

	.parameter-tabs button span {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.parameter-tabs button small {
		color: var(--text-subtle);
		font-size: 0.625rem;
	}

	.parameter-tabs button:hover,
	.parameter-tabs button.active {
		border-color: var(--accent);
		color: var(--text);
		background: var(--surface-hover);
	}

	.parameter-tabs button.active small {
		color: var(--accent);
	}

	.parameter-group {
		padding: var(--space-md);
	}

	.parameter-group-header {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		gap: var(--space-sm);
		margin-bottom: var(--space-sm);
	}

	.parameter-group-header h2 {
		font-size: 0.8125rem;
	}

	.parameter-group-header span {
		font-size: 0.6875rem;
		color: var(--text-subtle);
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

		.parameter-tabs {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}
</style>
