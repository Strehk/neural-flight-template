/**
 * Parameter Registry — Dynamic, manifest-driven
 *
 * Reads parameters from the active experience's manifest.
 * Falls back to a static default set when no experience is loaded.
 * Backward-compatible: getPreset(), listPresets(), isVRParameter() still work.
 */

import { Mountain } from "lucide-svelte";
import type { ComponentType } from "svelte";
import { getExperience } from "$lib/experiences/catalog";
import {
	getActiveExperience,
	getActiveExperienceId,
} from "$lib/experiences/loader";
import type { ParameterDef } from "$lib/experiences/types";
import { resolveIcon } from "./icon-map";

/** Preset configuration for a parameter slider node */
export interface ParameterPreset {
	label: string;
	param: string;
	icon: ComponentType;
	min: number;
	max: number;
	step?: number;
	value: number;
}

/** Convert a ParameterDef from manifest to a ParameterPreset for the Node Editor */
function toPreset(def: ParameterDef): ParameterPreset {
	return {
		label: def.label,
		param: def.id,
		icon: resolveIcon(def.icon),
		min: def.min,
		max: def.max,
		step: def.step,
		value: typeof def.default === "number" ? def.default : def.min,
	};
}

/** Build presets from the currently active experience manifest */
export function getParameterPresets(): Record<string, ParameterPreset> {
	// Try active (loaded) experience first, then fall back to manifest lookup
	const active = getActiveExperience();
	const parameters = active
		? active.manifest.parameters
		: getExperience(getActiveExperienceId()).parameters;

	// Only include number-type parameters — boolean/color don't make sense as output nodes
	const presets: Record<string, ParameterPreset> = {};
	for (const param of parameters) {
		const paramType = param.type ?? "number";
		if (paramType === "number") {
			presets[param.id] = toPreset(param);
		}
	}
	return presets;
}

// ── Backward-compatible API ──────────────────────────────────

/** Get preset by param name */
export function getPreset(param: string): ParameterPreset | undefined {
	return getParameterPresets()[param];
}

/** List all available preset keys */
export function listPresets(): string[] {
	return Object.keys(getParameterPresets());
}

/** Check if a key is a registered VR parameter */
export function isVRParameter(key: string): boolean {
	return key in getParameterPresets();
}

// Re-export for backward compatibility — consumers that imported PARAMETER_PRESETS
// should migrate to getParameterPresets() but this keeps existing code working
export const PARAMETER_PRESETS: Record<string, ParameterPreset> = new Proxy(
	{} as Record<string, ParameterPreset>,
	{
		get(_target, prop: string) {
			return getParameterPresets()[prop];
		},
		ownKeys() {
			return Object.keys(getParameterPresets());
		},
		getOwnPropertyDescriptor(_target, prop: string) {
			const presets = getParameterPresets();
			if (prop in presets) {
				return { configurable: true, enumerable: true, value: presets[prop] };
			}
			return undefined;
		},
		has(_target, prop: string) {
			return prop in getParameterPresets();
		},
	},
);
