/**
 * Preset Registry — All immersive effect presets sorted by difficulty.
 */

import type { PresetDef } from "../types";
import { PRESET_BREATHE } from "./breathe";
import { PRESET_NEON_WAVES } from "./neon_waves";
import { PRESET_NEURAL_NOISE } from "./neural_noise";
import { PRESET_FRACTAL_ZOOM } from "./fractal_zoom";
import { PRESET_EGO_DISSOLUTION } from "./ego_dissolution";
import { PRESET_SOUND_REACTIVE } from "./sound_reactive";
import { PRESET_SLOW_WORLD } from "./slow_world";
import { PRESET_CELLULAR_DRIFT } from "./cellular_drift";
import { PRESET_IMPOSSIBLE_ARCH } from "./impossible_arch";
import { PRESET_SWARM_FIELD } from "./swarm_field";

export const PRESETS: PresetDef[] = [
	// Beginner (1)
	PRESET_BREATHE,
	PRESET_NEON_WAVES,
	// Intermediate (2)
	PRESET_NEURAL_NOISE,
	PRESET_FRACTAL_ZOOM,
	PRESET_EGO_DISSOLUTION,
	PRESET_SOUND_REACTIVE,
	PRESET_SLOW_WORLD,
	// Advanced (3)
	PRESET_CELLULAR_DRIFT,
	PRESET_IMPOSSIBLE_ARCH,
	PRESET_SWARM_FIELD,
];

export function getPresetById(id: string): PresetDef | undefined {
	return PRESETS.find((p) => p.id === id);
}

export function getPresetsByDifficulty(
	difficulty: 1 | 2 | 3,
): PresetDef[] {
	return PRESETS.filter((p) => p.difficulty === difficulty);
}
