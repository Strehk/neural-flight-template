// ============================================================================
// manifest.ts — Declarative I/O contract for the Shader Landscape experience
//
// The manifest defines everything the infrastructure needs:
//   - Identity (id, name, description)
//   - Parameters (steerable via Node Editor + Settings Sidebar)
//   - Scene defaults (background, fog, lights, camera, spawn)
//   - Lifecycle methods (setup, tick, dispose, applySettings, updatePlayer)
//
// Parameters flow: Slider/Node Editor → applySettings() → uniform/state update
// Each parameter.id must have a matching case in settings.ts.
//
// CUSTOMIZE: Change parameters, scene config, and spawn for your experience.
// ============================================================================

import type { ExperienceManifest, ParameterDef } from "../types";
import { updatePlayer } from "./player";
import { dispose, setup, tick } from "./scene";
import { applySettings } from "./settings";

// ── Parameters ─────────────────────────────────────────────────────────────
// Grouped by layer. Each parameter appears as a slider in the Settings Sidebar
// and as an output node in the Node Editor. The id must match the switch cases
// in settings.ts for the UI to control the experience.

const parameters: ParameterDef[] = [
  // ── Flight ──────────────────────────────────────────
  // Controls FlightPlayer properties (mutated via player.baseSpeed etc.)
  {
    id: "baseSpeed",
    label: "Flight Speed",
    group: "Flight",
    min: 10,
    max: 80,
    default: 15,
    step: 1,
    unit: "m/s",
    icon: "Gauge",
  },
  {
    id: "lerpAlpha",
    label: "Control Smoothing",
    group: "Flight",
    min: 0.01,
    max: 0.5,
    default: 0.12,
    step: 0.01,
    icon: "Spline",
  },
  {
    id: "minClearance",
    label: "Min Clearance",
    group: "Flight",
    min: 2,
    max: 30,
    default: 6,
    step: 1,
    unit: "m",
    icon: "Shield",
  },

  // ── Terrain ─────────────────────────────────────────
  // Controls terrain shader uniforms (uTerrainHeight, uTerrainScale, etc.)
  {
    id: "terrainHeight",
    label: "Terrain Height",
    group: "Terrain",
    min: 10,
    max: 80,
    default: 50,
    step: 1,
    unit: "m",
    icon: "Mountain",
  },
  {
    id: "terrainScale",
    label: "Terrain Scale",
    group: "Terrain",
    min: 0.5,
    max: 5,
    default: 2,
    step: 0.1,
    icon: "Waves",
  },
  {
    id: "colorSpeed",
    label: "Color Speed",
    group: "Terrain",
    min: 0,
    max: 0.5,
    default: 0.12,
    step: 0.01,
    icon: "Palette",
  },
  {
    id: "brightness",
    label: "Brightness",
    group: "Terrain",
    min: 0.3,
    max: 2,
    default: 1.2,
    step: 0.01,
    icon: "Sun",
  },

  // ── Water ───────────────────────────────────────────
  // Controls water mesh position and ocean.vert uniforms
  {
    id: "waterLevel",
    label: "Water Level",
    group: "Water",
    min: 0,
    max: 25,
    default: 8,
    step: 1,
    unit: "m",
    icon: "Droplets",
  },
  {
    id: "waveAmplitude",
    label: "Wave Height",
    group: "Water",
    min: 0.1,
    max: 3,
    default: 1.5,
    step: 0.1,
    icon: "Waves",
  },
  {
    id: "waveSpeed",
    label: "Wave Speed",
    group: "Water",
    min: 0.1,
    max: 2,
    default: 0.6,
    step: 0.1,
    icon: "Wind",
  },

  // ── Atmosphere ──────────────────────────────────────
  // Controls fog distance (applied in terrain + water fragment shaders)
  {
    id: "fogNear",
    label: "Fog Near",
    group: "Atmosphere",
    min: 20,
    max: 200,
    default: 40,
    step: 1,
    icon: "CloudFog",
  },
  {
    id: "fogFar",
    label: "Fog Far",
    group: "Atmosphere",
    min: 100,
    max: 500,
    default: 200,
    step: 1,
    icon: "Maximize",
  },
];

// ── Manifest ───────────────────────────────────────────────────────────────

export const manifest: ExperienceManifest = {
  // Identity
  id: "shader-demo",
  name: "Shader Landscape",
  description:
    "Psychedelic flythrough landscape — terrain, water, sky, particles, all GPU-shaded",
  version: "2.0.0",
  author: "ICAROS Lab",

  // I/O contract — orientation for flight, speed for boost/brake
  parameters,
  outputs: [],
  interfaces: { orientation: true, speed: true },

  // Camera — far plane at 1000 for large landscape
  camera: { fov: 75, near: 0.1, far: 1000 },

  // Scene defaults — psychedelic dark purple atmosphere
  // CUSTOMIZE: Change these for different moods (warm sunset, icy blue, etc.)
  scene: {
    background: "#110033", // dark purple — matches sky bottom for seamless blend
    fogNear: 40,
    fogFar: 200,
    fogColor: "#330066", // purple haze — contrasts against dark background
    ambientIntensity: 0.2, // low ambient — shaders provide own lighting
    sunIntensity: 0.8, // subtle sun — not the main light source
    sunColor: "#cc88ff", // purple-tinted sunlight
    sunPosition: { x: 80, y: 150, z: 40 },
  },

  // Spawn above terrain — y=40 gives clearance above default peaks (~15)
  spawn: { position: { x: 0, y: 40, z: 0 } },

  // Lifecycle — wired to the other 4 files
  setup,
  tick,
  applySettings,
  updatePlayer,
  dispose,
};
