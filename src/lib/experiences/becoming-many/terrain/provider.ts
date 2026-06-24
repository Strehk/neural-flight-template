// ── Becoming Many — Terrain Provider Contract ──────────────────
//
// A terrain *algorithm* is a TerrainProvider: two mirrored expressions of one
// height field over world XZ.
//
//   - heightNode(worldX, worldZ) → a TSL float node. This is the algorithm ON THE
//     GPU; the generic chunk compute kernel calls it per vertex to fill the
//     chunk's position storage buffer (terrain/chunk.ts).
//   - height(x, z)        → the plain-JS mirror, used on the CPU for flight
//     altitude and any gameplay sampling. It MUST match heightNode numerically
//     (the one discipline a provider author has to keep — same as the legacy
//     world's shared sample fn across worker + main thread).
//
// Providers are registered in a plain runtime map (providers/registry.ts) — no
// worker boundary, because GPU generation runs on the main thread via
// renderer.compute(). Adding an algorithm is one file + registerTerrainProvider;
// swapping the active one is TerrainWorld.setProvider(id), which rebuilds chunks.
//
// IMPORTANT — see AGENTS.md "WebGPU + TSL": node functions come from `three/tsl`,
// classes/types from `three/webgpu`. Never import core classes from plain `three`.

import type { Node } from "three/webgpu";

/**
 * Flat, numeric config shared by every provider (keeps the registry generic and
 * maps 1:1 onto the numeric Settings sliders). Each provider reads the fields it
 * cares about and ignores the rest.
 */
export interface TerrainConfig {
	/** Master seed — providers fold it into their noise so worlds differ. */
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

	/**
	 * GPU side: given world X and Z as float nodes, return the surface height
	 * (float node). Pure TSL — no side effects, no per-frame state.
	 */
	heightNode(worldX: Node, worldZ: Node, cfg: TerrainConfig): Node;

	/**
	 * CPU mirror: world height at (x, z). Must agree with heightNode so the
	 * flight floor matches the rendered surface.
	 */
	height(x: number, z: number, cfg: TerrainConfig): number;
}
