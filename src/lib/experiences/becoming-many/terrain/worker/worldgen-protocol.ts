// ── Becoming Many — WorldGen Worker Protocol ───────────────────
//
// Plain-data messages for the dedicated worldgen worker. Kept separate from
// protocol.ts so the lightweight pointwise worker bundle never pulls in the
// worldgen config/generation. The build request carries the flat TerrainConfig
// (the worker folds it onto GenParams); the result carries the per-vertex arrays,
// transferred (not copied).

import type { TerrainConfig } from "../provider";

/** Main → worker: build one chunk. The worker re-applies cfg if it changed. */
export interface WorldgenBuildRequest {
	type: "build";
	id: number;
	cfg: TerrainConfig;
	/** Live GenParams overlay from the dev GUI, merged on top of configToParams. */
	params?: Record<string, number>;
	gridX: number;
	gridZ: number;
	chunkSize: number;
	segments: number;
}

/** Worker → main: the built per-vertex arrays (all four buffers transferred). */
export interface WorldgenBuildResult {
	type: "built";
	id: number;
	gridX: number;
	gridZ: number;
	positions: Float32Array;
	normals: Float32Array;
	biome: Uint8Array;
	heightGrid: Float32Array;
	/** Non-indexed water mesh (ocean + lakes + river ribbons); absent if dry. */
	waterPositions?: Float32Array;
	/** Per-vertex water colour (depth/foam tint); paired with waterPositions. */
	waterColors?: Float32Array;
}

/** Worker → main: build failed. */
export interface WorldgenBuildError {
	type: "error";
	id: number;
	message: string;
}

export type WorldgenInbound = WorldgenBuildRequest;
export type WorldgenOutbound = WorldgenBuildResult | WorldgenBuildError;
