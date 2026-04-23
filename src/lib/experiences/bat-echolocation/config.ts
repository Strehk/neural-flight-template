export type BatBiomeId =
  | "forest"
  | "grassland"
  | "mountains"
  | "swamp"
  | "barrens";

export const BAT_EXPERIENCE_ID = "bat-echolocation";
export const BAT_EXPERIENCE_NAME = "Bat Echolocation";
export const BAT_EXPERIENCE_DESCRIPTION =
  "Navigate an endless nocturnal landscape where mountains, trees, and marshes surface only when your echo reaches them.";
export const BAT_EXPERIENCE_AUTHOR = "ICAROS Lab";

export const BAT_TRIGGER_ID = "echo-pulse";
export const BAT_MAX_PULSES = 3;

export const BAT_CAMERA = {
  fov: 78,
  near: 0.1,
  far: 620,
} as const;

export const BAT_SCENE = {
  background: "#040812",
  fogNear: 10,
  fogFar: 180,
  fogColor: "#040812",
  ambientIntensity: 0.018,
  sunIntensity: 0.028,
  sunColor: "#6f7a90",
  sunPosition: { x: -40, y: 76, z: -62 },
  skyTop: "#05070a",
  skyMiddle: "#020305",
  skyBottom: "#000000",
  spawn: { x: 0, y: 26, z: 0 },
} as const;

export const BAT_MOON = {
  color: "#e4ebf8",
  glowColor: "#f6fbff",
  radius: 24,
  glowRadius: 88,
  distance: 340,
  opacity: 0.88,
  glowOpacity: 0.26,
  direction: { x: -0.44, y: 0.74, z: -0.5 },
} as const;

export const BAT_FLIGHT_DEFAULTS = {
  cruiseSpeed: 11,
  boostSpeed: 18,
  strafeSpeed: 5.5,
  climbSpeed: 8,
  turnSpeed: 1.2,
  lookSmoothing: 0.12,
  minAltitude: 5,
  liftAssist: 1.4,
} as const;

export const BAT_ECHO_DEFAULTS = {
  range: 132,
  speed: 58,
  cooldown: 0.85,
  autoPulseInterval: 2.1,
  autoPulseStrength: 1.18,
  revealDuration: 0.28,
  revealIntensity: 1.5,
  wireThickness: 1.3,
  manualThickness: 5.4,
  autoThickness: 5.4,
} as const;

export const BAT_AUDIO_DEFAULTS = {
  masterVolume: 0.82,
  pitchCurve: 1.65,
  distanceVolume: 1.08,
  maxLayers: 3,
  densityComplexity: 1.1,
  decay: 2.35,
  droneIntensity: 1.08,
  materialInfluence: 0.82,
  stereoWidth: 0.32,
} as const;

export const BAT_WORLD_DEFAULTS = {
  chunkSize: 112,
  viewRadius: 2,
  terrainSegments: 40,
  biomeScale: 0.00115,
  mountainHeight: 68,
  treeDensity: 24,
  grassDensity: 44,
  baseVisibility: 0.0195,
  fogIntensity: 0.66,
} as const;

export const BAT_MOTH_DEFAULTS = {
  maxActive: 36,
  spawnAttemptsPerChunk: 6,
  catchRadius: 4.2,
  activeRadius: 46,
  escortCount: 6,
  escortRadiusMin: 12,
  escortRadiusMax: 24,
  minHoverHeight: 3.6,
  maxHoverHeight: 12.4,
  orbitRadius: 2.2,
  driftRadius: 1.45,
  motionSpeedMin: 0.12,
  motionSpeedMax: 0.26,
  escortSpeedMin: 0.1,
  escortSpeedMax: 0.2,
  playerBandOffsetMin: -8,
  playerBandOffsetMax: 6,
  playerBandPull: 0.78,
  echoTrailBoost: 14.5,
  echoPulseBoost: 1.92,
  echoBurstDuration: 0,
  echoBurstParticles: 0,
  echoBurstSpeed: 0,
  echoBurstSpread: 0,
  echoBurstScale: 0,
  echoCoreDuration: 3.4,
  echoCoreScale: 2.2,
  echoCoreOpacity: 1,
  collectBurstDuration: 0.42,
  collectBurstScale: 2.6,
} as const;

export const BAT_FOG_DISTANCE = {
  near: 16,
  farMin: 82,
  farMax: 240,
} as const;

export const BAT_BIOME_COLORS: Record<BatBiomeId, string> = {
  forest: "#7fd0bc",
  grassland: "#a6c68d",
  mountains: "#cdd8ea",
  swamp: "#84b7c7",
  barrens: "#d0b18a",
};

export interface BatWorldSettings {
  chunkSize: number;
  viewRadius: number;
  terrainSegments: number;
  biomeScale: number;
  mountainHeight: number;
  treeDensity: number;
  grassDensity: number;
  baseVisibility: number;
  fogIntensity: number;
  revealIntensity: number;
  wireThickness: number;
}

export interface BatEchoSettings {
  range: number;
  speed: number;
  cooldown: number;
  autoPulseInterval: number;
  autoPulseStrength: number;
  revealDuration: number;
  revealIntensity: number;
  wireThickness: number;
}

export interface BatAudioSettings {
  masterVolume: number;
  pitchCurve: number;
  distanceVolume: number;
  maxLayers: number;
  densityComplexity: number;
  decay: number;
  droneIntensity: number;
  materialInfluence: number;
  stereoWidth: number;
}
