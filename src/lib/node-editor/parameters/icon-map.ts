/**
 * Icon Map — Resolve manifest icon strings to Lucide Svelte components.
 *
 * Manifests store icon names as strings to stay serializable.
 * This map converts them to actual ComponentType references for rendering.
 *
 * Available icons (use these string names in manifest.ts `icon` field):
 *   Circle, Cloud, CloudFog, CloudUpload, Droplets, Gauge, Maximize,
 *   Mountain, Palette, RotateCw, Spline, Sun, Sunrise, Waves, Wind
 *
 * To add a new icon: import it from lucide-svelte and add it to ICON_MAP.
 * Fallback: Mountain (if icon name is missing or unrecognized).
 */

import {
	Circle,
	Cloud,
	CloudFog,
	CloudUpload,
	Droplets,
	Gauge,
	Maximize,
	Mountain,
	Palette,
	RotateCw,
	Spline,
	Sun,
	Sunrise,
	Waves,
	Wind,
} from "lucide-svelte";
import type { ComponentType } from "svelte";

const ICON_MAP: Record<string, ComponentType> = {
	Circle,
	Cloud,
	CloudFog,
	CloudUpload,
	Droplets,
	Gauge,
	Maximize,
	Mountain,
	Palette,
	RotateCw,
	Spline,
	Sun,
	Sunrise,
	Waves,
	Wind,
};

/** Resolve an icon name string to a Lucide component. Falls back to Mountain. */
export function resolveIcon(name?: string): ComponentType {
	if (!name) return Mountain;
	return ICON_MAP[name] ?? Mountain;
}
