// ── Becoming Many — Terrain Provider Registry ──────────────────
//
// A plain runtime map of terrain algorithms. Because GPU generation runs on the
// main thread (no Web Worker boundary), registration is just a module-level Map —
// register at import time (see ./index.ts) or at runtime, and TerrainWorld can
// switch between any registered provider live.

import type { TerrainProvider } from "../provider";

const REGISTRY = new Map<string, TerrainProvider>();

/** Register (or replace) a provider by its id. */
export function registerTerrainProvider(provider: TerrainProvider): void {
	REGISTRY.set(provider.id, provider);
}

/** Look up a provider, throwing if the id is unknown (fail fast on a typo'd id). */
export function getTerrainProvider(id: string): TerrainProvider {
	const provider = REGISTRY.get(id);
	if (!provider) {
		throw new Error(
			`Unknown terrain provider "${id}". Registered: ${[...REGISTRY.keys()].join(", ") || "(none)"}`,
		);
	}
	return provider;
}

/** All registered providers, in insertion order (for building the Settings enum). */
export function listTerrainProviders(): TerrainProvider[] {
	return [...REGISTRY.values()];
}
