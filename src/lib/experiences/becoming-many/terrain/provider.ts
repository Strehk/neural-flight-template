// ── Becoming Many — Terrain Provider Contract ──────────────────
//
// A terrain *algorithm* is a TerrainProvider: a pure-CPU height field over world
// XZ. Generation runs in a Web Worker (terrain/worker/), so the provider must be
// plain math with no renderer/three imports — that keeps it importable in the
// worker bundle AND on the main thread (for the flight floor + decorations).
//
//   - height(x, z, cfg) → world ground height. Used by the worker to build chunk
//     geometry, and on the main thread for flight altitude + decoration placement.
//
// A flat numeric TerrainConfig (seed/amplitude/frequency/octaves) maps 1:1 onto
// the Settings sliders. Providers are registered in providers/registry.ts; the
// worker imports providers/index.ts so the built-ins exist in its bundle.
//
// (Generation was GPU-compute earlier; it moved to a worker because building a
// compute pipeline per chunk spiked the frame time — three keys the compute
// pipeline cache by ComputeNode instance, so every chunk recompiled.)

/**
 * Flat, numeric config shared by every provider (keeps the registry generic and
 * maps onto the numeric Settings sliders). Each provider reads the fields it
 * cares about and ignores the rest.
 */
export interface TerrainConfig {
	/** Master seed — providers fold it in so worlds differ. */
	seed: number;
	/** Overall vertical scale (metres), multiplies the raw field. */
	amplitude: number;
	/** Base horizontal frequency (lower = broader features). */
	frequency: number;
	/** Octave count for fractal providers (ignored by simple ones). */
	octaves: number;
}

export interface TerrainProvider {
	/** Stable id — used by the registry + the provider Settings enum. */
	readonly id: string;
	/** Human label for UI / logs. */
	readonly label: string;
	/** Config this provider ships with; the world clones it as the live config. */
	readonly defaultConfig: TerrainConfig;

	/** World ground height at (x, z) — the single source of truth for the surface. */
	height(x: number, z: number, cfg: TerrainConfig): number;
}
