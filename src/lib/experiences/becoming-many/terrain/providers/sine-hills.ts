// ── Becoming Many — "Sine Hills" Terrain Provider ──────────────
//
// The M1 rolling-hills field (layered sines), now expressed as a pluggable
// provider so it streams as the default world and keeps visual continuity. Cheap
// and seed-free in character; `seed` phase-shifts the field, `amplitude` scales
// it. (frequency / octaves are ignored — see fbm-noise for those.)
//
// The TSL node and the JS mirror are the SAME formula; keep them in lockstep so
// the flight floor matches the rendered surface.

import type { Node } from "three/webgpu";
import type { TerrainConfig, TerrainProvider } from "../provider";

// Per-seed planar offset, so different seeds sample a different patch of field.
function seedOffset(seed: number): number {
	return seed * 0.137;
}

export const sineHillsProvider: TerrainProvider = {
	id: "sineHills",
	label: "Sine Hills",
	defaultConfig: { seed: 0, amplitude: 1, frequency: 1, octaves: 1 },

	heightNode(worldX: Node, worldZ: Node, cfg: TerrainConfig): Node {
		const s = seedOffset(cfg.seed);
		const x = worldX.add(s);
		const z = worldZ.add(s);
		let h = x.mul(0.045).sin().mul(z.mul(0.05).cos()).mul(8.0);
		h = h.add(x.mul(0.12).add(1.3).sin().mul(z.mul(0.1).sub(0.7).cos()).mul(3.2));
		h = h.add(x.mul(0.27).sub(2.1).sin().mul(z.mul(0.31).add(0.4).cos()).mul(1.6));
		h = h.add(x.add(z).mul(0.05).sin().mul(0.8));
		return h.mul(cfg.amplitude);
	},

	height(x: number, z: number, cfg: TerrainConfig): number {
		const s = seedOffset(cfg.seed);
		const px = x + s;
		const pz = z + s;
		let h = 8.0 * Math.sin(px * 0.045) * Math.cos(pz * 0.05);
		h += 3.2 * Math.sin(px * 0.12 + 1.3) * Math.cos(pz * 0.1 - 0.7);
		h += 1.6 * Math.sin(px * 0.27 - 2.1) * Math.cos(pz * 0.31 + 0.4);
		h += 0.8 * Math.sin((px + pz) * 0.05);
		return h * cfg.amplitude;
	},
};
