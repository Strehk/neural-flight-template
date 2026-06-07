import {
	cloneWorldPreset,
	DEFAULT_WORLD_PRESET_ID,
	getBuiltInWorldPreset,
	WORLD_PRESETS,
} from "./presets";
import type { WorldPreset } from "./types";

const ACTIVE_WORLD_KEY = "active-world-preset";
const CUSTOM_WORLDS_KEY = "worldgen-custom-presets";
const LEGACY_WORLD_IDS: Record<string, string> = {
	"sinneswandler-forest": DEFAULT_WORLD_PRESET_ID,
};

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
		typeof record.climate === "object"
	);
}

export function getActiveWorldPresetId(): string {
	if (!hasLocalStorage()) return DEFAULT_WORLD_PRESET_ID;
	const stored = localStorage.getItem(ACTIVE_WORLD_KEY) ?? DEFAULT_WORLD_PRESET_ID;
	return LEGACY_WORLD_IDS[stored] ?? stored;
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
	const resolvedId = LEGACY_WORLD_IDS[id] ?? id;
	const custom = loadCustomWorldPresets().find((preset) => preset.id === resolvedId);
	if (custom) return cloneWorldPreset(custom);
	return getBuiltInWorldPreset(resolvedId);
}
