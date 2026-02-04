<script lang="ts">
import { Collapsible, Slider, Switch } from "bits-ui";
import {
	ChevronDown,
	ChevronRight,
	RotateCcw,
	Save,
	Settings,
	X,
} from "lucide-svelte";
import type { SettingsUpdate } from "$lib/types/orientation";

interface Props {
	open: boolean;
	onClose: () => void;
	onSettingsChange: (update: SettingsUpdate) => void;
}

const { open, onClose, onSettingsChange }: Props = $props();

// ── Local state for all settings ──
let baseSpeed = $state(20);
let rollYawMultiplier = $state(1.5);
let lerpAlpha = $state(0.15);
let fogNear = $state(100);
let fogFar = $state(500);
let cloudDriftEnabled = $state(true);
let viewRadius = $state(2);
let sunIntensity = $state(3.0);
let skyColorTop = $state("#1a6fc4");
let skyColorHorizon = $state("#ffeebb");
let skyColorBottom = $state("#87ceeb");
let ringColor = $state("#f1c40f");
let sunElevation = $state(65);
let ringCountPerChunk = $state(2);
let terrainAmplitude = $state(60);
let terrainFrequency = $state(0.005);
let fogColor = $state("#87ceeb");
let cloudHeight = $state(200);
let waterLevel = $state(5);
let treeDensity = $state(25);
let minClearance = $state(8);

// ── Section open states ──
let flightOpen = $state(true);
let sceneOpen = $state(true);
let terrainOpen = $state(true);

// ── Preset system ──
let presetName = $state("");
let presets = $state<Record<string, Record<string, number | boolean | string>>>(
	{},
);

function getCurrentSettings(): Record<string, number | boolean | string> {
	return {
		baseSpeed,
		rollYawMultiplier,
		lerpAlpha,
		fogNear,
		fogFar,
		cloudDriftEnabled,
		viewRadius,
		sunIntensity,
		skyColorTop,
		skyColorHorizon,
		skyColorBottom,
		ringColor,
		sunElevation,
		ringCountPerChunk,
		terrainAmplitude,
		terrainFrequency,
		fogColor,
		cloudHeight,
		waterLevel,
		treeDensity,
		minClearance,
	};
}

function emit(key: string, value: number | boolean | string): void {
	onSettingsChange({
		type: "settings",
		settings: { [key]: value },
		timestamp: Date.now(),
	});
}

function savePreset(): void {
	if (!presetName.trim()) return;
	presets[presetName.trim()] = getCurrentSettings();
	try {
		localStorage.setItem("icaros-presets", JSON.stringify(presets));
	} catch {
		// Storage full — ignore
	}
	presetName = "";
}

function loadPreset(name: string): void {
	const preset = presets[name];
	if (!preset) return;
	baseSpeed = preset.baseSpeed as number;
	rollYawMultiplier = preset.rollYawMultiplier as number;
	lerpAlpha = preset.lerpAlpha as number;
	fogNear = preset.fogNear as number;
	fogFar = preset.fogFar as number;
	cloudDriftEnabled = preset.cloudDriftEnabled as boolean;
	viewRadius = preset.viewRadius as number;
	sunIntensity = preset.sunIntensity as number;
	skyColorTop = preset.skyColorTop as string;
	skyColorHorizon = preset.skyColorHorizon as string;
	skyColorBottom = preset.skyColorBottom as string;
	ringColor = preset.ringColor as string;
	sunElevation = (preset.sunElevation as number) ?? 65;
	ringCountPerChunk = (preset.ringCountPerChunk as number) ?? 2;
	terrainAmplitude = (preset.terrainAmplitude as number) ?? 60;
	terrainFrequency = (preset.terrainFrequency as number) ?? 0.005;
	fogColor = (preset.fogColor as string) ?? "#87ceeb";
	cloudHeight = (preset.cloudHeight as number) ?? 200;
	waterLevel = (preset.waterLevel as number) ?? 5;
	treeDensity = (preset.treeDensity as number) ?? 25;
	minClearance = (preset.minClearance as number) ?? 8;
	onSettingsChange({
		type: "settings",
		settings: getCurrentSettings(),
		timestamp: Date.now(),
	});
}

function resetDefaults(): void {
	baseSpeed = 20;
	rollYawMultiplier = 1.5;
	lerpAlpha = 0.15;
	fogNear = 100;
	fogFar = 500;
	cloudDriftEnabled = true;
	viewRadius = 2;
	sunIntensity = 3.0;
	skyColorTop = "#1a6fc4";
	skyColorHorizon = "#ffeebb";
	skyColorBottom = "#87ceeb";
	ringColor = "#f1c40f";
	sunElevation = 65;
	ringCountPerChunk = 2;
	terrainAmplitude = 60;
	terrainFrequency = 0.005;
	fogColor = "#87ceeb";
	cloudHeight = 200;
	waterLevel = 5;
	treeDensity = 25;
	minClearance = 8;
	onSettingsChange({
		type: "settings",
		settings: getCurrentSettings(),
		timestamp: Date.now(),
	});
}

// Load presets from localStorage on init
if (typeof localStorage !== "undefined") {
	try {
		const saved = localStorage.getItem("icaros-presets");
		if (saved) presets = JSON.parse(saved);
	} catch {
		// Corrupt data — ignore
	}
}
</script>

<!-- Sidebar Panel -->
{#if open}
	<aside class="sidebar">
		<div class="sidebar-header">
			<span class="sidebar-title">
				<Settings size={14} />
				<span class="mono-label">SETTINGS</span>
			</span>
			<button class="sidebar-close" onclick={onClose}>
				<X size={16} />
			</button>
		</div>

		<div class="sidebar-content">
			<!-- ═══ Flight ═══ -->
			<Collapsible.Root bind:open={flightOpen}>
				<Collapsible.Trigger class="section-trigger">
					<span class="section-trigger-inner">
						{#if flightOpen}<ChevronDown size={14} />{:else}<ChevronRight size={14} />{/if}
						Flight
					</span>
				</Collapsible.Trigger>
				<Collapsible.Content class="section-content">
					<label class="setting-row">
						<span class="setting-label">Speed <span class="setting-value">{baseSpeed}</span></span>
						<Slider.Root type="single" min={5} max={80} step={1} value={baseSpeed} onValueChange={(v: number) => { baseSpeed = v; emit("baseSpeed", v); }} class="slider-root">
							<span class="slider-track"><Slider.Range class="slider-range" /></span>
							<Slider.Thumb class="slider-thumb" index={0} />
						</Slider.Root>
					</label>

					<label class="setting-row">
						<span class="setting-label">Roll-Yaw <span class="setting-value">{rollYawMultiplier.toFixed(1)}</span></span>
						<Slider.Root type="single" min={0.5} max={4} step={0.1} value={rollYawMultiplier} onValueChange={(v: number) => { rollYawMultiplier = v; emit("rollYawMultiplier", v); }} class="slider-root">
							<span class="slider-track"><Slider.Range class="slider-range" /></span>
							<Slider.Thumb class="slider-thumb" index={0} />
						</Slider.Root>
					</label>

					<label class="setting-row">
						<span class="setting-label">Smoothing <span class="setting-value">{lerpAlpha.toFixed(2)}</span></span>
						<Slider.Root type="single" min={0.01} max={0.5} step={0.01} value={lerpAlpha} onValueChange={(v: number) => { lerpAlpha = v; emit("lerpAlpha", v); }} class="slider-root">
							<span class="slider-track"><Slider.Range class="slider-range" /></span>
							<Slider.Thumb class="slider-thumb" index={0} />
						</Slider.Root>
					</label>

					<label class="setting-row">
						<span class="setting-label">Min Clearance <span class="setting-value">{minClearance}</span></span>
						<Slider.Root type="single" min={1} max={30} step={1} value={minClearance} onValueChange={(v: number) => { minClearance = v; emit("minClearance", v); }} class="slider-root">
							<span class="slider-track"><Slider.Range class="slider-range" /></span>
							<Slider.Thumb class="slider-thumb" index={0} />
						</Slider.Root>
					</label>
				</Collapsible.Content>
			</Collapsible.Root>

			<!-- ═══ Scene ═══ -->
			<Collapsible.Root bind:open={sceneOpen}>
				<Collapsible.Trigger class="section-trigger">
					<span class="section-trigger-inner">
						{#if sceneOpen}<ChevronDown size={14} />{:else}<ChevronRight size={14} />{/if}
						Scene
					</span>
				</Collapsible.Trigger>
				<Collapsible.Content class="section-content">
					<label class="setting-row">
						<span class="setting-label">Fog Near <span class="setting-value">{fogNear}</span></span>
						<Slider.Root type="single" min={10} max={300} step={10} value={fogNear} onValueChange={(v: number) => { fogNear = v; emit("fogNear", v); }} class="slider-root">
							<span class="slider-track"><Slider.Range class="slider-range" /></span>
							<Slider.Thumb class="slider-thumb" index={0} />
						</Slider.Root>
					</label>

					<label class="setting-row">
						<span class="setting-label">Fog Far <span class="setting-value">{fogFar}</span></span>
						<Slider.Root type="single" min={200} max={1000} step={10} value={fogFar} onValueChange={(v: number) => { fogFar = v; emit("fogFar", v); }} class="slider-root">
							<span class="slider-track"><Slider.Range class="slider-range" /></span>
							<Slider.Thumb class="slider-thumb" index={0} />
						</Slider.Root>
					</label>

					<label class="setting-row">
						<span class="setting-label">Sun Intensity <span class="setting-value">{sunIntensity.toFixed(1)}</span></span>
						<Slider.Root type="single" min={0.5} max={6} step={0.1} value={sunIntensity} onValueChange={(v: number) => { sunIntensity = v; emit("sunIntensity", v); }} class="slider-root">
							<span class="slider-track"><Slider.Range class="slider-range" /></span>
							<Slider.Thumb class="slider-thumb" index={0} />
						</Slider.Root>
					</label>

					<label class="setting-row">
						<span class="setting-label">Sun Elevation <span class="setting-value">{sunElevation}°</span></span>
						<Slider.Root type="single" min={5} max={90} step={1} value={sunElevation} onValueChange={(v: number) => { sunElevation = v; emit("sunElevation", v); }} class="slider-root">
							<span class="slider-track"><Slider.Range class="slider-range" /></span>
							<Slider.Thumb class="slider-thumb" index={0} />
						</Slider.Root>
					</label>

					<label class="setting-row">
						<span class="setting-label">Fog Color</span>
						<input type="color" value={fogColor} oninput={(e) => { fogColor = e.currentTarget.value; emit("fogColor", fogColor); }} />
					</label>

					<label class="setting-row">
						<span class="setting-label">Cloud Height <span class="setting-value">{cloudHeight}</span></span>
						<Slider.Root type="single" min={80} max={400} step={10} value={cloudHeight} onValueChange={(v: number) => { cloudHeight = v; emit("cloudHeight", v); }} class="slider-root">
							<span class="slider-track"><Slider.Range class="slider-range" /></span>
							<Slider.Thumb class="slider-thumb" index={0} />
						</Slider.Root>
					</label>

					<div class="setting-row">
						<span class="setting-label">Cloud Drift</span>
						<Switch.Root checked={cloudDriftEnabled} onCheckedChange={(v: boolean) => { cloudDriftEnabled = v; emit("cloudDriftEnabled", v); }} class="switch-root">
							<Switch.Thumb class="switch-thumb" />
						</Switch.Root>
					</div>

					<label class="setting-row">
						<span class="setting-label">Sky Top</span>
						<input type="color" value={skyColorTop} oninput={(e) => { skyColorTop = e.currentTarget.value; emit("skyColorTop", skyColorTop); }} />
					</label>

					<label class="setting-row">
						<span class="setting-label">Sky Horizon</span>
						<input type="color" value={skyColorHorizon} oninput={(e) => { skyColorHorizon = e.currentTarget.value; emit("skyColorHorizon", skyColorHorizon); }} />
					</label>

					<label class="setting-row">
						<span class="setting-label">Sky Bottom</span>
						<input type="color" value={skyColorBottom} oninput={(e) => { skyColorBottom = e.currentTarget.value; emit("skyColorBottom", skyColorBottom); }} />
					</label>

					<label class="setting-row">
						<span class="setting-label">Ring Color</span>
						<input type="color" value={ringColor} oninput={(e) => { ringColor = e.currentTarget.value; emit("ringColor", ringColor); }} />
					</label>
				</Collapsible.Content>
			</Collapsible.Root>

			<!-- ═══ Terrain ═══ -->
			<Collapsible.Root bind:open={terrainOpen}>
				<Collapsible.Trigger class="section-trigger">
					<span class="section-trigger-inner">
						{#if terrainOpen}<ChevronDown size={14} />{:else}<ChevronRight size={14} />{/if}
						Terrain
					</span>
				</Collapsible.Trigger>
				<Collapsible.Content class="section-content">
					<label class="setting-row">
						<span class="setting-label">View Radius <span class="setting-value">{viewRadius}</span></span>
						<Slider.Root type="single" min={1} max={4} step={1} value={viewRadius} onValueChange={(v: number) => { viewRadius = v; emit("viewRadius", v); }} class="slider-root">
							<span class="slider-track"><Slider.Range class="slider-range" /></span>
							<Slider.Thumb class="slider-thumb" index={0} />
						</Slider.Root>
					</label>

					<label class="setting-row">
						<span class="setting-label">Ring Count <span class="setting-value">{ringCountPerChunk}</span></span>
						<Slider.Root type="single" min={0} max={8} step={1} value={ringCountPerChunk} onValueChange={(v: number) => { ringCountPerChunk = v; emit("ringCountPerChunk", v); }} class="slider-root">
							<span class="slider-track"><Slider.Range class="slider-range" /></span>
							<Slider.Thumb class="slider-thumb" index={0} />
						</Slider.Root>
					</label>

					<label class="setting-row">
						<span class="setting-label">Amplitude <span class="setting-value">{terrainAmplitude}</span></span>
						<Slider.Root type="single" min={10} max={150} step={5} value={terrainAmplitude} onValueChange={(v: number) => { terrainAmplitude = v; emit("terrainAmplitude", v); }} class="slider-root">
							<span class="slider-track"><Slider.Range class="slider-range" /></span>
							<Slider.Thumb class="slider-thumb" index={0} />
						</Slider.Root>
					</label>

					<label class="setting-row">
						<span class="setting-label">Frequency <span class="setting-value">{terrainFrequency.toFixed(4)}</span></span>
						<Slider.Root type="single" min={0.001} max={0.02} step={0.001} value={terrainFrequency} onValueChange={(v: number) => { terrainFrequency = v; emit("terrainFrequency", v); }} class="slider-root">
							<span class="slider-track"><Slider.Range class="slider-range" /></span>
							<Slider.Thumb class="slider-thumb" index={0} />
						</Slider.Root>
					</label>

					<label class="setting-row">
						<span class="setting-label">Water Level <span class="setting-value">{waterLevel}</span></span>
						<Slider.Root type="single" min={-5} max={30} step={1} value={waterLevel} onValueChange={(v: number) => { waterLevel = v; emit("waterLevel", v); }} class="slider-root">
							<span class="slider-track"><Slider.Range class="slider-range" /></span>
							<Slider.Thumb class="slider-thumb" index={0} />
						</Slider.Root>
					</label>

					<label class="setting-row">
						<span class="setting-label">Tree Density <span class="setting-value">{treeDensity}</span></span>
						<Slider.Root type="single" min={0} max={60} step={5} value={treeDensity} onValueChange={(v: number) => { treeDensity = v; emit("treeDensity", v); }} class="slider-root">
							<span class="slider-track"><Slider.Range class="slider-range" /></span>
							<Slider.Thumb class="slider-thumb" index={0} />
						</Slider.Root>
					</label>
				</Collapsible.Content>
			</Collapsible.Root>

			<!-- ═══ Presets ═══ -->
			<div class="preset-section">
				<div class="preset-save">
					<input type="text" bind:value={presetName} placeholder="Preset name" class="preset-input" />
					<button class="preset-btn" onclick={savePreset}>
						<Save size={12} />
					</button>
				</div>

				{#if Object.keys(presets).length > 0}
					<div class="preset-list">
						{#each Object.keys(presets) as name}
							<button class="preset-tag" onclick={() => loadPreset(name)}>{name}</button>
						{/each}
					</div>
				{/if}

				<button class="reset-btn" onclick={resetDefaults}>
					<RotateCcw size={12} />
					Reset Defaults
				</button>
			</div>
		</div>
	</aside>
{/if}

<style>
	/*
	 * SettingsSidebar Styles
	 * Most base styles (sidebar, slider, switch, collapsible) are in app.css
	 * Only component-specific overrides and presets section here
	 */

	/* ── Presets Section ── */
	.preset-section {
		padding: 0.75rem 1rem;
		border-top: 1px solid var(--border);
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.preset-save {
		display: flex;
		gap: 0.5rem;
	}

	.preset-input {
		flex: 1;
	}

	.preset-btn {
		background: var(--surface);
		border: 1px solid var(--border);
		color: var(--text-muted);
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 36px;
	}

	.preset-btn:hover {
		border-color: var(--text);
		color: var(--text);
	}

	.preset-list {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem;
	}

	.preset-tag {
		background: var(--surface);
		border: 1px solid var(--accent-muted);
		color: var(--accent-muted);
		font-family: var(--font-mono);
		font-size: 0.65rem;
		padding: 0.25rem 0.5rem;
		cursor: pointer;
	}

	.preset-tag:hover {
		background: var(--accent-muted);
		color: var(--bg);
	}

	.reset-btn {
		background: var(--surface);
		border: 1px solid var(--error);
		color: var(--error);
		font-family: var(--font-mono);
		font-size: 0.7rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.03em;
		padding: 0.4rem 0.75rem;
		cursor: pointer;
		display: flex;
		align-items: center;
		gap: 0.4rem;
	}

	.reset-btn:hover {
		background: var(--error);
		color: var(--bg);
	}
</style>
