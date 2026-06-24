// ── Becoming Many — "Ridged Peaks" Terrain Provider ────────────
//
// The second shipped algorithm, to prove the provider seam is real: a
// domain-warped, multi-octave RIDGED field (sharp crests via 1 - |sin·cos|),
// visibly distinct from sineHills' rolling hills. `octaves` adds finer ridges,
// `frequency` scales feature size, `amplitude` the height, `seed` offsets.
//
// Deliberately ANALYTIC (sin/cos/abs), not value-noise. An analytic trig field
// has negligible GPU-f32 vs CPU-f64 drift, so the heightNode/height mirror stays
// faithful and the flight floor matches the surface. A true value-noise FBM
// provider needs a shared deterministic integer hash across TSL + JS (the
// fract(sin·large) trick amplifies f32/f64 differences and diverges) — that's a
// later addition behind this same interface.
//
// octaves is read at graph-build time and the TSL chain is unrolled to match the
// JS loop exactly; changing it via Settings rebuilds the chunk kernels.

import type { Node } from "three/webgpu";
import type { TerrainConfig, TerrainProvider } from "../provider";

const BASE_AMP = 18; // first-octave height (metres) at amplitude = 1
const BASE_FREQ = 0.012; // first-octave frequency at frequency = 1
const WARP = 14; // domain-warp strength (metres)
const LACUNARITY = 2.07;
const GAIN = 0.5;

function octaveCount(cfg: TerrainConfig): number {
	return Math.max(1, Math.min(6, Math.round(cfg.octaves)));
}

export const ridgedProvider: TerrainProvider = {
	id: "ridged",
	label: "Ridged Peaks",
	defaultConfig: { seed: 0, amplitude: 1, frequency: 1, octaves: 4 },

	heightNode(worldX: Node, worldZ: Node, cfg: TerrainConfig): Node {
		const s = cfg.seed * 0.211;
		const f0 = BASE_FREQ * cfg.frequency;
		// Domain warp so ridges meander rather than forming a grid.
		const wx = worldX.add(s).add(worldZ.mul(0.02 * cfg.frequency).sin().mul(WARP));
		const wz = worldZ.add(s).add(worldX.mul(0.02 * cfg.frequency).sin().mul(WARP));

		const n = octaveCount(cfg);
		let amp = BASE_AMP;
		let freq = f0;
		// Start the sum at the first octave, then fold in the rest.
		let h = ridgeNode(wx, wz, freq).mul(amp);
		for (let o = 1; o < n; o++) {
			amp *= GAIN;
			freq *= LACUNARITY;
			h = h.add(ridgeNode(wx, wz, freq).mul(amp));
		}
		return h.mul(cfg.amplitude);
	},

	height(x: number, z: number, cfg: TerrainConfig): number {
		const s = cfg.seed * 0.211;
		const f0 = BASE_FREQ * cfg.frequency;
		const wx = x + s + Math.sin(z * 0.02 * cfg.frequency) * WARP;
		const wz = z + s + Math.sin(x * 0.02 * cfg.frequency) * WARP;

		const n = octaveCount(cfg);
		let amp = BASE_AMP;
		let freq = f0;
		let h = ridge(wx, wz, freq) * amp;
		for (let o = 1; o < n; o++) {
			amp *= GAIN;
			freq *= LACUNARITY;
			h += ridge(wx, wz, freq) * amp;
		}
		return h * cfg.amplitude;
	},
};

// One ridged octave in [0, 1]: 1 - |sin(x·f)·cos(z·f)| → sharp crests at the zeros.
function ridgeNode(x: Node, z: Node, freq: number): Node {
	return x.mul(freq).sin().mul(z.mul(freq).cos()).abs().oneMinus();
}

function ridge(x: number, z: number, freq: number): number {
	return 1 - Math.abs(Math.sin(x * freq) * Math.cos(z * freq));
}
