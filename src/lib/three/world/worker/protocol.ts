/**
 * Worldgen worker protocol — message shapes shared by the main-thread
 * pool and the per-worker entry. Plain data only; nothing here imports
 * THREE.
 */

import type { TerrainBiomeId } from "$lib/worldgen/terrain/biome-types";
import type { WorldConfig } from "$lib/worldgen/terrain/world-config";
import type {
  DecorationData,
  DecorationDataSettings,
} from "$lib/worldgen/vegetation/decoration-data";
import type { RGBLike, TerrainEchoPalette, TerrainDayPalette } from "$lib/worldgen/terrain/derived-field-sampler";
import type { TerrainData } from "$lib/three/world/TerrainDataBuilder";
import type { TerrainSample } from "$lib/worldgen/terrain/terrain-sampler";

/**
 * Serialisable variant of `AcousticField` (the live form holds the
 * sampler's cached TerrainSample references). Worker sends this; main
 * reconstructs the field shape on receipt.
 */
export interface SerializableAcousticField {
  chunkSize: number;
  gridStep: number;
  cellsPerSide: number;
  originX: number;
  originZ: number;
  /** `cellsPerSide^2` plain TerrainSample objects (no method refs). */
  samples: TerrainSample[];
}

/**
 * Plain-RGB palettes the worker uses. THREE.Color satisfies RGBLike, so
 * main-thread callers pass their existing palettes straight through;
 * the worker only reads `r`, `g`, `b`.
 */
export type WorkerEchoPalette = TerrainEchoPalette;
export type WorkerDayPalette  = TerrainDayPalette;

/** One-time init — broadcast to every worker in the pool. */
export interface WorkerInitMessage {
  type: "init";
  worldConfig: WorldConfig;
  biomeOverride: TerrainBiomeId | null;
  chunkSize: number;
  segments: number;
  acousticFieldEnabled: boolean;
  acousticFieldGridStep: number;
  decorationSettings: DecorationDataSettings;
  /** Plain RGB. Always send `{r,g,b}` objects; never `THREE.Color` instances. */
  echoPalette: Record<keyof TerrainEchoPalette, RGBLike>;
  dayPalette: Record<keyof TerrainDayPalette, RGBLike>;
}

/** Configuration patch — sent on settings/biome change, bumps generation. */
export interface WorkerUpdateConfigMessage {
  type: "updateConfig";
  worldConfigPatch?: Partial<WorldConfig>;
  biomeOverride?: TerrainBiomeId | null;
  decorationSettings?: DecorationDataSettings;
  /** Pool's new generation. Worker stamps every subsequent reply with it. */
  generation: number;
}

/** Build one chunk. */
export interface WorkerBuildMessage {
  type: "build";
  id: number;
  generation: number;
  gridX: number;
  gridZ: number;
}

export type WorkerInboundMessage =
  | WorkerInitMessage
  | WorkerUpdateConfigMessage
  | WorkerBuildMessage;

/** Worker -> main: one chunk worth of typed-array data. */
export interface WorkerBuiltMessage {
  type: "built";
  id: number;
  generation: number;
  gridX: number;
  gridZ: number;
  terrain: TerrainData;
  decorations: DecorationData;
  acoustic: SerializableAcousticField | null;
}

export interface WorkerErrorMessage {
  type: "error";
  id: number;
  generation: number;
  message: string;
}

export type WorkerOutboundMessage = WorkerBuiltMessage | WorkerErrorMessage;
