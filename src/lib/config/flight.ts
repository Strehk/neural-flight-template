// ── Flight Physics ──
export const FLIGHT = {
	BASE_SPEED: 20,
	ACCEL_SPEED: 40,
	BRAKE_SPEED: 5,
	LERP_ALPHA: 0.15,
	ROLL_YAW_MULTIPLIER: 1.5,
	MIN_CLEARANCE: 8,
	TERRAIN_SLOWDOWN: 0.7,
	SPAWN_POSITION: { x: 0, y: 50, z: 0 },
} as const;

// ── Camera ──
export const CAMERA = {
	FOV: 75,
	NEAR: 0.1,
	FAR: 1000,
} as const;

// ── Controls ──
export const CONTROLS = {
	STEP_DEGREES: 30,
	PITCH_RANGE: [-90, 90] as [number, number],
	ROLL_RANGE: [-90, 90] as [number, number],
	BUTTONS: {
		UP: { pitch: -1, roll: 0 },
		DOWN: { pitch: 1, roll: 0 },
		LEFT: { pitch: 0, roll: -1 },
		RIGHT: { pitch: 0, roll: 1 },
	},
} as const;

// ── Rings ──
export const RINGS = {
	COUNT: 80,
	SPREAD: 400,
	RADIUS: 6,
	TUBE_RADIUS: 0.4,
	COLLECT_DISTANCE: 8,
	COLOR: 0xf1c40f,
	COLLECTED_COLOR: 0x2ecc71,
	HEIGHT_BASE: 20,
	HEIGHT_VARIATION: 30,
	EMISSIVE: 0.3,
	EMISSIVE_COLLECTED: 0.6,
	SEGMENTS: [12, 32] as [number, number],
} as const;

// ── Scene ──
export const SCENE = {
	SKY_COLOR: 0x87ceeb,
	FOG_NEAR: 100,
	FOG_FAR: 500,
	AMBIENT_INTENSITY: 0.3,
	SUN_INTENSITY: 1.8,
	SUN_POSITION: { x: 80, y: 150, z: 40 },
} as const;

// ── Terrain ──
export const TERRAIN = {
	CHUNK_SIZE: 128,
	VIEW_RADIUS: 2,
	MAX_POOL: 30,
	SEGMENTS: 128,
	NOISE: { octaves: 5, amplitude: 60, frequency: 0.005, persistence: 0.45 },
	WATER_Y: 5,
	WATER_SIZE: 4000,
	WATER_COLOR: 0x2980b9,
	WATER_OPACITY: 0.6,
} as const;

// ── Terrain Colors ──
export const TERRAIN_COLORS = {
	GRASS: 0x3a7d44,
	YELLOW: 0xc4a035,
	ORANGE: 0xb85c2f,
	ROCK: 0x8a8a8a,
	SNOW: 0xf0f0f0,
	BANDS: [10, 25, 40, 50] as [number, number, number, number],
} as const;

// ── Decorations ──
export const DECORATIONS = {
	TREE_COUNT: 800,
	ROCK_COUNT: 300,
	SPREAD: 300,
	CROWN_COLORS: [0xc0392b, 0xe67e22, 0x8e44ad, 0x27ae60],
	TRUNK_COLOR: 0x5d4037,
	ROCK_COLOR: 0x7f8c8d,
} as const;
