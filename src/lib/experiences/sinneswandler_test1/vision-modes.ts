import * as THREE from "three";
import type { BatBiomeId } from "./config";

export type VisionModeId = "echolocation" | "daylight" | "chemosense";

export interface VisionMode {
  id: VisionModeId;
  label: string;
  fogNear: number;
  fogFar: number;
  fogColorHex: number;
  skyColors: [number, number, number];
  baseVisibility: number;
  moonColorHex: number;
  moonDirection: THREE.Vector3;
  echoEnabled: boolean;
  accentHex: number;
}

export const VISION_MODES: Record<VisionModeId, VisionMode> = {
  echolocation: {
    id: "echolocation",
    label: "Echoortung",
    fogNear: 10,
    fogFar: 180,
    fogColorHex: 0x040812,
    skyColors: [0x05070a, 0x020305, 0x000000],
    baseVisibility: 0.0195,
    moonColorHex: 0xf6fbff,
    moonDirection: new THREE.Vector3(-0.44, 0.74, -0.5).normalize(),
    echoEnabled: true,
    accentHex: 0xf7c948,
  },
  daylight: {
    id: "daylight",
    label: "Tagsicht",
    fogNear: 60,
    fogFar: 500,
    fogColorHex: 0xc8dff0,
    skyColors: [0x1a5fa0, 0x4a9fd4, 0x87ceeb],
    baseVisibility: 1.0,
    moonColorHex: 0xfff4d0,
    moonDirection: new THREE.Vector3(0.3, 0.85, -0.4).normalize(),
    echoEnabled: false,
    accentHex: 0x7fd0bc,
  },
  chemosense: {
    id: "chemosense",
    label: "Geruchssinn",
    fogNear: 8,
    fogFar: 80,
    fogColorHex: 0x010204,
    skyColors: [0x010204, 0x010102, 0x000000],
    baseVisibility: 0.006,
    moonColorHex: 0x223311,
    moonDirection: new THREE.Vector3(0.0, 1.0, -0.2).normalize(),
    echoEnabled: false,
    accentHex: 0x88ff44,
  },
};

// Extend this array to add new switchable modes in order.
export const MODE_SEQUENCE: VisionModeId[] = ["echolocation", "daylight", "chemosense"];

export function nextMode(current: VisionModeId): VisionModeId {
  const idx = MODE_SEQUENCE.indexOf(current);
  return MODE_SEQUENCE[(idx + 1) % MODE_SEQUENCE.length];
}

/**
 * Biomes listed here lock the player into a specific vision mode while inside.
 * Biomes not listed impose no override (player stays in whatever mode they're in).
 *
 *  mountains  → Tagsicht  (open alpine panorama, fully visible)
 *  snow       → Tagsicht  (bright open snow fields)
 *  grassland  → Tagsicht  (wide open fields, sunlit)
 *  forest     → Echoortung (dense canopy, navigate by sound)
 *  desert     → Tagsicht  (open desert, visible landmarks)
 *  barrens    → (no override)
 */
export const BIOME_VISION_MODES: Partial<Record<BatBiomeId, VisionModeId>> = {
  mountains: "daylight",
  snow:      "daylight",
  grassland: "daylight",
  forest:    "echolocation",
  desert:    "daylight",
};
