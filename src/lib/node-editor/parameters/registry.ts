/**
 * Parameter Registry
 * Configuration for SliderNode instances — data-driven node catalog
 */

import {
	Cloud,
	CloudFog,
	Droplets,
	Maximize,
	Mountain,
	Sun,
	Waves,
	Wind,
} from "lucide-svelte";
import type { ComponentType } from "svelte";

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

/** Available parameter presets for VR scene control */
export const PARAMETER_PRESETS: Record<string, ParameterPreset> = {
	// Terrain
	terrainAmplitude: {
		label: "Terrain Amplitude",
		param: "terrainAmplitude",
		icon: Mountain,
		min: 30,
		max: 90,
		value: 60,
	},
	terrainFrequency: {
		label: "Terrain Frequency",
		param: "terrainFrequency",
		icon: Waves,
		min: 0.001,
		max: 0.01,
		step: 0.001,
		value: 0.005,
	},
	waterLevel: {
		label: "Water Level",
		param: "waterLevel",
		icon: Droplets,
		min: 0,
		max: 20,
		value: 5,
	},

	// Fog
	fogNear: {
		label: "Fog Near",
		param: "fogNear",
		icon: CloudFog,
		min: 50,
		max: 200,
		value: 100,
	},
	fogFar: {
		label: "Fog Far",
		param: "fogFar",
		icon: Maximize,
		min: 300,
		max: 800,
		value: 500,
	},

	// Sun & Sky
	sunIntensity: {
		label: "Sun Intensity",
		param: "sunIntensity",
		icon: Sun,
		min: 1,
		max: 5,
		step: 0.1,
		value: 3,
	},

	// Clouds
	cloudOpacity: {
		label: "Cloud Opacity",
		param: "cloudOpacity",
		icon: Cloud,
		min: 0,
		max: 1,
		step: 0.1,
		value: 0.8,
	},

	// Wind
	windSpeed: {
		label: "Wind Speed",
		param: "windSpeed",
		icon: Wind,
		min: 0,
		max: 10,
		step: 0.5,
		value: 2,
	},
};

/** Valid VR parameter keys (derived from PARAMETER_PRESETS) */
export type VRParameterKey = keyof typeof PARAMETER_PRESETS;

/** Check if a key is a registered VR parameter */
export function isVRParameter(key: string): key is VRParameterKey {
	return key in PARAMETER_PRESETS;
}

/** Get preset by param name */
export function getPreset(param: string): ParameterPreset | undefined {
	return PARAMETER_PRESETS[param];
}

/** List all available preset keys */
export function listPresets(): string[] {
	return Object.keys(PARAMETER_PRESETS);
}
