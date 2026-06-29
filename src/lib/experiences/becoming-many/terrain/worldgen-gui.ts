// ── Becoming Many — WorldGen Dev GUI (lil-gui) ─────────────────
//
// A lil-gui panel (the standard three.js example dev tool) for live-tuning the
// WorldGen generation params. Each control sends a GenParams overlay to the
// worldgen worker via world.setWorldgenParams(), which rebuilds the streamed
// chunks. The overlay only affects the WorldGen (chunk) provider; the headline
// knobs (seed / amplitude / frequency) stay on the app Settings panel.
//
// Rebuilds fire on slider RELEASE (onFinishChange), not while dragging, so the
// whole world isn't regenerated every frame.

import GUI from "lil-gui";
import { WORLDGEN_PARAMS } from "./providers/worldgen/gen-params";
import type { TerrainWorld } from "./world";

interface Control {
	key: string;
	label: string;
	min: number;
	max: number;
	step: number;
}

const GROUPS: { folder: string; controls: Control[] }[] = [
	{
		folder: "Elevation",
		controls: [
			{ key: "waterLevel", label: "Water Level", min: 0, max: 1, step: 0.01 },
			{ key: "heightScale", label: "Height Contrast", min: 0.3, max: 2.5, step: 0.05 },
			{ key: "reliefExponent", label: "Relief Exponent", min: 1, max: 3, step: 0.05 },
			{ key: "mountainStrength", label: "Mountains", min: 0, max: 2, step: 0.05 },
			{ key: "ridgeStrength", label: "Ridges", min: 0, max: 1.5, step: 0.05 },
			{ key: "domainWarpStrength", label: "Domain Warp", min: 0, max: 1, step: 0.02 },
		],
	},
	{
		folder: "Detail",
		controls: [
			{ key: "detailStrength", label: "Detail", min: 0, max: 2, step: 0.05 },
			{ key: "mountainRidgeStrength", label: "Mtn Ridge Detail", min: 0, max: 2, step: 0.05 },
			{ key: "cliffStrength", label: "Cliffs", min: 0, max: 2, step: 0.05 },
			{ key: "riverValleyStrength", label: "River Valleys", min: 0, max: 2, step: 0.05 },
			{ key: "shoreSmoothing", label: "Shore Smoothing", min: 0, max: 1, step: 0.05 },
		],
	},
	{
		folder: "Rivers",
		controls: [
			{ key: "riverDensity", label: "River Density", min: 0.2, max: 3, step: 0.05 },
			{ key: "riverWidthMultiplier", label: "River Width", min: 0.3, max: 3, step: 0.05 },
			{ key: "riverSourceBias", label: "Source Bias", min: 0, max: 1, step: 0.05 },
		],
	},
	{
		folder: "Lakes",
		controls: [
			{ key: "lakeFrequency", label: "Lake Frequency", min: 0, max: 1, step: 0.02 },
			{ key: "lakeSpillTolerance", label: "Lake Spill Tol.", min: 0, max: 0.1, step: 0.002 },
		],
	},
	{
		folder: "Climate",
		controls: [
			{ key: "temperatureGradient", label: "Temp Gradient", min: 0, max: 1, step: 0.02 },
			{ key: "moistureScale", label: "Moisture Scale", min: 200, max: 2000, step: 10 },
		],
	},
];

export interface WorldgenGui {
	dispose(): void;
}

/** Mount the WorldGen dev panel (top-left); returns a handle to tear it down. */
export function createWorldgenGui(world: TerrainWorld): WorldgenGui {
	const defaults = WORLDGEN_PARAMS as unknown as Record<string, number>;
	const params: Record<string, number> = {};
	for (const g of GROUPS) for (const c of g.controls) params[c.key] = defaults[c.key];

	const gui = new GUI({ title: "WorldGen" });
	// lil-gui auto-places top-right (over the FPS pill); move it to the top-left.
	const el = gui.domElement;
	el.style.left = "12px";
	el.style.top = "12px";
	el.style.right = "auto";
	el.style.zIndex = "30";

	for (const g of GROUPS) {
		const folder = gui.addFolder(g.folder);
		for (const c of g.controls) {
			folder
				.add(params, c.key, c.min, c.max, c.step)
				.name(c.label)
				.onFinishChange((v: number) => world.setWorldgenParams({ [c.key]: v }));
		}
		folder.close();
	}

	return { dispose: () => gui.destroy() };
}
