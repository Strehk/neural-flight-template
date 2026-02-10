<script lang="ts">
/**
 * SettingsSidebar — Data-driven parameter UI
 *
 * Renders controls from ParameterDef[] grouped by `group`.
 * Input type is determined by `type`:
 *   "number"  → Slider (default)
 *   "boolean" → Switch
 *   "color"   → Color picker
 *
 * Preset system persists to localStorage for quick switching.
 */

import { Collapsible, Slider, Switch } from "bits-ui";
import {
	ChevronDown,
	ChevronRight,
	RotateCcw,
	Save,
	Settings,
	X,
} from "lucide-svelte";
import type { ParameterDef } from "$lib/experiences/types";
import type { SettingsUpdate } from "$lib/types/orientation";

interface Props {
	open: boolean;
	onClose: () => void;
	onSettingsChange: (update: SettingsUpdate) => void;
	/** Parameters from the active experience manifest */
	parameters: ParameterDef[];
}

const { open, onClose, onSettingsChange, parameters }: Props = $props();

// ── Reactive state for all parameter values ──
// Single object keyed by parameter ID — replaces 22 individual $state variables
let values = $state<Record<string, number | boolean | string>>({});

// Initialize values from parameter defaults when parameters change
$effect(() => {
	const initial: Record<string, number | boolean | string> = {};
	for (const param of parameters) {
		initial[param.id] = param.default;
	}
	values = initial;
});

// ── Group parameters for collapsible sections ──
const grouped = $derived(() => {
	const groups: Record<string, ParameterDef[]> = {};
	for (const param of parameters) {
		(groups[param.group] ??= []).push(param);
	}
	return groups;
});

// ── Section open states (all open by default) ──
let openSections = $state<Record<string, boolean>>({});

function isSectionOpen(group: string): boolean {
	return openSections[group] ?? true;
}

function toggleSection(group: string): void {
	openSections[group] = !isSectionOpen(group);
}

// ── Emit a single setting change over WebSocket ──
function emit(key: string, value: number | boolean | string): void {
	values[key] = value;
	onSettingsChange({
		type: "settings",
		settings: { [key]: value },
		timestamp: Date.now(),
	});
}

// ── Preset system ──
let presetName = $state("");
let presets = $state<Record<string, Record<string, number | boolean | string>>>({});

function savePreset(): void {
	if (!presetName.trim()) return;
	presets[presetName.trim()] = { ...values };
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
	values = { ...preset };
	onSettingsChange({
		type: "settings",
		settings: { ...preset },
		timestamp: Date.now(),
	});
}

function resetDefaults(): void {
	const initial: Record<string, number | boolean | string> = {};
	for (const param of parameters) {
		initial[param.id] = param.default;
	}
	values = initial;
	onSettingsChange({
		type: "settings",
		settings: { ...initial },
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

/**
 * Format a number for display.
 * Shows decimals only when the step suggests precision is needed.
 */
function formatValue(val: number, step: number): string {
	if (step >= 1) return String(Math.round(val));
	const decimals = Math.max(0, -Math.floor(Math.log10(step)));
	return val.toFixed(decimals);
}
</script>

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
			<!-- Dynamic parameter groups from manifest -->
			{#each Object.entries(grouped()) as [group, params]}
				<Collapsible.Root open={isSectionOpen(group)}>
					<Collapsible.Trigger
						class="section-trigger"
						onclick={() => toggleSection(group)}
					>
						<span class="section-trigger-inner">
							{#if isSectionOpen(group)}
								<ChevronDown size={14} />
							{:else}
								<ChevronRight size={14} />
							{/if}
							{group}
						</span>
					</Collapsible.Trigger>
					<Collapsible.Content class="section-content">
						{#each params as param}
							{@const paramType = param.type ?? "number"}

							{#if paramType === "number"}
								<!-- Slider for numeric parameters -->
								<label class="setting-row">
									<span class="setting-label">
										{param.label}
										<span class="setting-value">
											{formatValue(values[param.id] as number ?? param.default, param.step)}{param.unit ?? ""}
										</span>
									</span>
									<Slider.Root
										type="single"
										min={param.min}
										max={param.max}
										step={param.step}
										value={(values[param.id] as number) ?? param.default}
										onValueChange={(v: number) => emit(param.id, v)}
										class="slider-root"
									>
										<span class="slider-track">
											<Slider.Range class="slider-range" />
										</span>
										<Slider.Thumb class="slider-thumb" index={0} />
									</Slider.Root>
								</label>

							{:else if paramType === "boolean"}
								<!-- Switch for boolean parameters -->
								<div class="setting-row">
									<span class="setting-label">{param.label}</span>
									<Switch.Root
										checked={(values[param.id] as boolean) ?? true}
										onCheckedChange={(v: boolean) => emit(param.id, v)}
										class="switch-root"
									>
										<Switch.Thumb class="switch-thumb" />
									</Switch.Root>
								</div>

							{:else if paramType === "color"}
								<!-- Color picker for color parameters -->
								<label class="setting-row">
									<span class="setting-label">{param.label}</span>
									<input
										type="color"
										value={(values[param.id] as string) ?? "#ffffff"}
										oninput={(e) => emit(param.id, e.currentTarget.value)}
									/>
								</label>
							{/if}
						{/each}
					</Collapsible.Content>
				</Collapsible.Root>
			{/each}

			<!-- Presets section -->
			<div class="preset-section">
				<div class="preset-save">
					<input
						type="text"
						bind:value={presetName}
						placeholder="Preset name"
						class="preset-input"
					/>
					<button class="preset-btn" onclick={savePreset}>
						<Save size={12} />
					</button>
				</div>

				{#if Object.keys(presets).length > 0}
					<div class="preset-list">
						{#each Object.keys(presets) as name}
							<button class="preset-tag" onclick={() => loadPreset(name)}>
								{name}
							</button>
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
