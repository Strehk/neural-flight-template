import * as THREE from "three";
import type { BatBiomeId } from "./config";

export type VisionModeId =
  | "luft"
  | "echoLocation"
  | "infrarot"
  | "duft"
  | "netzwerk"
  | "depthDebug"
  | "normal";

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
  luft: {
    id: "luft",
    label: "Luft",
    fogNear: 20,
    fogFar: 260,
    fogColorHex: 0xffffff,
    skyColors: [0xffffff, 0xffffff, 0xffffff],
    baseVisibility: 1,
    moonColorHex: 0xffffff,
    moonDirection: new THREE.Vector3(0.12, 0.38, -0.92).normalize(),
    echoEnabled: false,
    accentHex: 0x111111,
  },
  echoLocation: {
    id: "echoLocation",
    label: "Echo Location",
    // Tight view sphere: fogFar is the sphere radius (euclidean distance, Y included),
    // so the world is only visible within ~120 units and fades to the surround at the edge.
    fogNear: 20,
    fogFar: 120,
    fogColorHex: 0xf8f8f3,
    skyColors: [0xffffff, 0xfafaf5, 0xf0f0eb],
    baseVisibility: 1,
    moonColorHex: 0xffffff,
    moonDirection: new THREE.Vector3(-0.34, 0.62, -0.7).normalize(),
    echoEnabled: false,
    accentHex: 0xd8ff88,
  },
  infrarot: {
    id: "infrarot",
    label: "Infrarot",
    fogNear: 120,
    fogFar: 620,
    fogColorHex: 0xf6f6f1,
    skyColors: [0xffffff, 0xf9f9f3, 0xefefea],
    baseVisibility: 1,
    moonColorHex: 0xffffff,
    moonDirection: new THREE.Vector3(-0.34, 0.62, -0.7).normalize(),
    echoEnabled: false,
    accentHex: 0xffffff,
  },
  netzwerk: {
    id: "netzwerk",
    label: "Netzwerk",
    fogNear: 150,
    fogFar: 680,
    fogColorHex: 0xf7f7f2,
    skyColors: [0xffffff, 0xf9f9f3, 0xefefea],
    baseVisibility: 1,
    moonColorHex: 0xffffff,
    moonDirection: new THREE.Vector3(-0.34, 0.62, -0.7).normalize(),
    echoEnabled: false,
    accentHex: 0xff1a2e,
  },
  duft: {
    id: "duft",
    label: "Duft",
    fogNear: 120,
    fogFar: 620,
    fogColorHex: 0xf8f8f4,
    skyColors: [0xffffff, 0xf9f9f4, 0xf0f0eb],
    baseVisibility: 1,
    moonColorHex: 0xffffff,
    moonDirection: new THREE.Vector3(-0.34, 0.62, -0.7).normalize(),
    echoEnabled: false,
    accentHex: 0x88ff44,
  },
  depthDebug: {
    id: "depthDebug",
    label: "Depth Debug",
    fogNear: 55,
    fogFar: 460,
    fogColorHex: 0xf8f8f4,
    skyColors: [0xffffff, 0xfdfdf9, 0xf5f5ef],
    baseVisibility: 1,
    moonColorHex: 0xffffff,
    moonDirection: new THREE.Vector3(-0.28, 0.58, -0.76).normalize(),
    echoEnabled: false,
    accentHex: 0x111111,
  },
  normal: {
    id: "normal",
    label: "Normal",
    fogNear: 60,
    fogFar: 500,
    fogColorHex: 0xc8dff0,
    skyColors: [0x1a5fa0, 0x4a9fd4, 0x87ceeb],
    baseVisibility: 1,
    moonColorHex: 0xfff4d0,
    moonDirection: new THREE.Vector3(0.3, 0.85, -0.4).normalize(),
    echoEnabled: false,
    accentHex: 0x7fd0bc,
  },
};

// Extend this array to add new switchable modes in order.
export const MODE_SEQUENCE: VisionModeId[] = [
  "luft",
  "echoLocation",
  "infrarot",
  "duft",
  "netzwerk",
  "depthDebug",
  "normal",
];

export function nextMode(current: VisionModeId): VisionModeId {
  const idx = MODE_SEQUENCE.indexOf(current);
  return MODE_SEQUENCE[(idx + 1) % MODE_SEQUENCE.length];
}

/** Biome mode overrides are disabled; vision modes are switched manually via number keys. */
export const BIOME_VISION_MODES: Partial<Record<BatBiomeId, VisionModeId>> = {};
