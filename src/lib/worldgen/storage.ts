import {
	cloneWorldPreset,
	DEFAULT_WORLD_PRESET_ID,
	getBuiltInWorldPreset,
	WORLD_PRESETS,
} from "./presets";
import type { WorldPreset } from "./types";

const ACTIVE_WORLD_KEY = "active-world-preset";
const CUSTOM_WORLDS_KEY = "worldgen-custom-presets";

function hasLocalStorage(): boolean {
	return typeof localStorage !== "undefined";
}

function isStoredPreset(value: unknown): value is WorldPreset {
	if (!value || typeof value !== "object") return false;
	const record = value as Record<string, unknown>;
	return (
		typeof record.id === "string" &&
		typeof record.name === "string" &&
		typeof record.seed === "number" &&
		typeof record.terrain === "object" &&
		typeof record.climate === "object" &&
		typeof record.hydrology === "object"
	);
}

export function getActiveWorldPresetId(): string {
	if (!hasLocalStorage()) return DEFAULT_WORLD_PRESET_ID;
	return localStorage.getItem(ACTIVE_WORLD_KEY) ?? DEFAULT_WORLD_PRESET_ID;
}

export function setActiveWorldPresetId(id: string): void {
	if (!hasLocalStorage()) return;
	localStorage.setItem(ACTIVE_WORLD_KEY, id);
}

export function loadCustomWorldPresets(): WorldPreset[] {
	if (!hasLocalStorage()) return [];
	const saved = localStorage.getItem(CUSTOM_WORLDS_KEY);
	if (!saved) return [];

	try {
		const parsed: unknown = JSON.parse(saved);
		if (!Array.isArray(parsed)) return [];
		return parsed.filter(isStoredPreset);
	} catch {
		return [];
	}
}

export function saveCustomWorldPreset(preset: WorldPreset): void {
	if (!hasLocalStorage()) return;
	const custom = loadCustomWorldPresets();
	const next = [
		...custom.filter((entry) => entry.id !== preset.id),
		cloneWorldPreset(preset),
	];
	localStorage.setItem(CUSTOM_WORLDS_KEY, JSON.stringify(next));
	setActiveWorldPresetId(preset.id);
}

export function listWorldPresets(): WorldPreset[] {
	return [...WORLD_PRESETS.map(cloneWorldPreset), ...loadCustomWorldPresets()];
}

export function getWorldPreset(id: string): WorldPreset {
	const custom = loadCustomWorldPresets().find((preset) => preset.id === id);
	if (custom) return cloneWorldPreset(custom);
	return getBuiltInWorldPreset(id);
}
