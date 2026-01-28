<script lang="ts">
import { Collapsible, Slider, Switch } from "bits-ui";
import { Settings, X, ChevronDown, ChevronRight, Save, RotateCcw } from "lucide-svelte";
import type { SettingsUpdate } from "$lib/types/orientation";

interface Props {
	open: boolean;
	onClose: () => void;
	onSettingsChange: (update: SettingsUpdate) => void;
}

let { open, onClose, onSettingsChange }: Props = $props();

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

// ── Section open states ──
let flightOpen = $state(true);
let sceneOpen = $state(true);
let terrainOpen = $state(true);

// ── Preset system ──
let presetName = $state("");
let presets = $state<Record<string, Record<string, number | boolean | string>>>({});

function getCurrentSettings(): Record<string, number | boolean | string> {
	return {
		baseSpeed, rollYawMultiplier, lerpAlpha,
		fogNear, fogFar, cloudDriftEnabled,
		viewRadius, sunIntensity,
		skyColorTop, skyColorHorizon, skyColorBottom, ringColor,
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
	/* ── Collapsible fix ── */
	:global([data-collapsible-content][data-state="closed"]) {
		display: none;
	}

	.sidebar {
		position: fixed;
		top: 0;
		right: 0;
		bottom: 0;
		width: 280px;
		z-index: 99;
		background: var(--bg);
		border-left: 1px solid var(--border);
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.sidebar-header {
		height: 3.5rem;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0 1rem;
		border-bottom: 1px solid var(--border);
		flex-shrink: 0;
	}

	.sidebar-title {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		color: var(--text-muted);
	}

	.sidebar-close {
		background: none;
		border: none;
		color: var(--text-muted);
		cursor: pointer;
		padding: 0.25rem;
		display: flex;
		align-items: center;
	}

	.sidebar-close:hover {
		color: var(--text);
	}

	.sidebar-content {
		flex: 1;
		overflow-y: auto;
		padding: 0.5rem 0;
	}

	:global(.section-trigger) {
		width: 100%;
		background: none;
		border: none;
		border-bottom: 1px solid var(--border);
		color: var(--text);
		font-family: var(--font-mono);
		font-size: 0.75rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		padding: 0.75rem 1rem;
		cursor: pointer;
		text-align: left;
	}

	:global(.section-trigger:hover) {
		background: var(--surface);
	}

	.section-trigger-inner {
		display: flex;
		align-items: center;
		gap: 0.4rem;
	}

	:global(.section-content) {
		padding: 0.75rem 1rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.setting-row {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.setting-label {
		font-family: var(--font-mono);
		font-size: 0.7rem;
		color: var(--text-muted);
		text-transform: uppercase;
		letter-spacing: 0.03em;
		display: flex;
		justify-content: space-between;
	}

	.setting-value {
		color: #8b7ec8;
	}

	/* ── Slider ── */
	:global(.slider-root) {
		position: relative;
		display: flex;
		align-items: center;
		width: 100%;
		height: 20px;
		touch-action: none;
	}

	.slider-track {
		position: relative;
		height: 1px;
		width: 100%;
		flex-grow: 1;
		background: var(--border);
		overflow: hidden;
		cursor: pointer;
	}

	:global(.slider-range) {
		position: absolute;
		height: 100%;
		background: #8b7ec8;
	}

	:global(.slider-thumb) {
		display: block;
		width: 10px;
		height: 10px;
		background: #8b7ec8;
		border: none;
		border-radius: 0;
		cursor: grab;
		flex-shrink: 0;
	}

	:global(.slider-thumb:active) {
		cursor: grabbing;
		background: #a598d8;
	}

	/* ── Switch ── */
	:global(.switch-root) {
		width: 40px;
		height: 22px;
		background: var(--border);
		border: none;
		padding: 2px;
		cursor: pointer;
		display: flex;
		align-items: center;
	}

	:global(.switch-root[data-state="checked"]) {
		background: #8b7ec8;
	}

	:global(.switch-thumb) {
		display: block;
		width: 18px;
		height: 18px;
		background: var(--text);
		transition: transform 0.15s;
	}

	:global(.switch-root[data-state="checked"] .switch-thumb) {
		transform: translateX(18px);
	}

	/* ── Color Input ── */
	input[type="color"] {
		width: 100%;
		height: 28px;
		border: none;
		background: var(--surface);
		cursor: pointer;
		padding: 0;
	}

	/* ── Presets ── */
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
		background: var(--surface);
		border: 1px solid var(--border);
		color: var(--text);
		font-family: var(--font-mono);
		font-size: 0.75rem;
		padding: 0.4rem 0.5rem;
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
		border: 1px solid #8b7ec8;
		color: #8b7ec8;
		font-family: var(--font-mono);
		font-size: 0.65rem;
		padding: 0.25rem 0.5rem;
		cursor: pointer;
	}

	.preset-tag:hover {
		background: #8b7ec8;
		color: var(--bg);
	}

	.reset-btn {
		background: var(--surface);
		border: 1px solid #f87171;
		color: #f87171;
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
		background: #f87171;
		color: var(--bg);
	}
</style>
