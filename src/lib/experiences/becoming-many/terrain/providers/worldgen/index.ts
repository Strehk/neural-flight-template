// ── Becoming Many — WorldGen Provider (shell) ──────────────────
//
// The registry/Settings-facing face of the WolrdGen3 worldgen: WFC biome plan +
// noise height + CPU hydrology (rivers/lakes) + a detail layer, all run in the
// dedicated worldgen Web Worker (terrain/worker/worldgen.worker.ts).
//
// This file is imported into the MAIN bundle (via providers/index.ts) for
// registration, so it stays a THIN shell: id/label/kind/defaultConfig only. It
// must NOT import the heavy generation modules — those live behind the worker
// boundary. `kind: "chunk"` tells TerrainWorld to route builds to the worldgen
// worker and sample the flight floor from built height grids (no pointwise
// height()).

import type { TerrainConfig, TerrainProvider } from "../../provider";

// amplitude 1 → terrainHeightScale 100; frequency 1 → source continent scale;
// octaves is unused by this provider (kept for the flat-config shape).
const defaultConfig: TerrainConfig = {
	seed: 1337,
	amplitude: 1,
	frequency: 1,
	octaves: 4,
};

export const worldgenProvider: TerrainProvider = {
	id: "worldgen",
	label: "WorldGen (WFC · rivers · lakes)",
	kind: "chunk",
	defaultConfig,
};
