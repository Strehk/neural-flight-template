# Examples — Template → Finished Experience

Three examples showing how the template is adapted into real experiences.

---

## Example 1: Mountain Flight (Nature, Flight Physics, 18 Parameters)

A nature-based flying experience with procedural terrain, clouds, sky, and collectible rings.

### Key Decisions

| Aspect | Template | Mountain Flight |
|--------|----------|----------------|
| Movement | Direct camera, no physics | `FlightPlayer` class (inertia, smoothing, terrain collision) |
| World | 30 random blocks on a flat ground | `TerrainManager` chunks, `createClouds()`, `createSky()`, `createWater()` |
| Parameters | 4 (moveSpeed, rotation, blockCount, blockColor) | 18 across 4 groups (Flight, Scene, Clouds, Terrain) |
| Outputs | None | `score` (collected rings) |
| Interfaces | `orientation: true, speed: false` | `orientation: true, speed: true` |
| Spawn | Ground level `y: 2` | Airborne `y: 50` |
| Camera FAR | 500 | 1000 (larger view distance for terrain) |

### manifest.ts — What Changed

```typescript
// Identity
id: "mountain-flight",
name: "Mountain Flight",
description: "Fly through procedurally generated mountains, collect rings",
author: "ICAROS Lab",

// I/O — speed interface enabled, score output added
interfaces: { orientation: true, speed: true },
outputs: [{ id: "score", label: "Score", type: "number" }],

// Scene — bright sky, longer fog, warm sun
scene: {
  background: "#87ceeb",
  fogNear: 100, fogFar: 500, fogColor: "#87ceeb",
  ambientIntensity: 0.3,
  sunIntensity: 3.0,
  sunColor: "#fff4e0",
  sunPosition: { x: 80, y: 150, z: 40 },
},
spawn: { position: { x: 0, y: 50, z: 0 } }, // airborne
```

### scene.ts — What Changed

**State interface** — holds terrain, clouds, sky, water, player:
```typescript
export interface MountainFlightState extends ExperienceState {
  player: FlightPlayer;
  terrain: TerrainManager;
  water: THREE.Mesh;
  skyMesh: THREE.Mesh;
  clouds: THREE.Group;
  score: number;
  cloudRebuildTimer: ReturnType<typeof setTimeout> | null;
  camera: THREE.PerspectiveCamera;
  windSpeed: number;
  cloudDriftEnabled: boolean;
}
```

**setup()** — uses Shared Library building blocks:
```typescript
const player = new FlightPlayer({ spawnPosition: { x: 0, y: 50, z: 0 }, baseSpeed: 20 });
const terrain = new TerrainManager({ chunkSize: 128, maxPool: 30 });
const water = createWater({ size: 4000, color: 0x2980b9, y: 5 });
const skyMesh = createSky({ radius: 800, colorTop: 0x1a6fc4 });
const clouds = createClouds({ count: 40, spread: 500, heightMin: 150 });
```

**tick()** — updates player physics, terrain chunks, cloud drift:
```typescript
s.player.tick(ctx.delta);
if (s.cloudDriftEnabled) updateClouds(s.clouds, ctx.delta, s.player.rig.position, s.windSpeed);
s.score += s.terrain.update(s.player.rig.position);
return { state: s, outputs: { score: s.score } };
```

### settings.ts — Patterns Used

| Pattern | Parameters | How |
|---------|-----------|-----|
| Simple State | `baseSpeed`, `rollYawMultiplier`, `lerpAlpha`, `windSpeed`, `cloudDriftEnabled` | Set property on `FlightPlayer` or state |
| Visual Update | `fogNear`, `fogFar`, `fogColor`, `sunIntensity`, `sunElevation`, `skyColor*`, `ringColor`, `waterLevel`, `cloudOpacity` | Mutate scene.fog, light, material directly |
| Structural Rebuild | `terrainAmplitude`, `terrainFrequency` | `terrain.rebuildAllChunks()` |
| Debounced Rebuild | `cloudCount`, `cloudHeight` | `setTimeout(500ms)` → `disposeClouds()` + `createClouds()` |

---

## Example 2: Gradient Prism (Shader-Based, Procedural Architecture, 13 Parameters)

An abstract experience flying through infinite gyroid architecture with prismatic light.

### Key Decisions

| Aspect | Template | Gradient Prism |
|--------|----------|----------------|
| Movement | Direct camera | `FlightPlayer` (no terrain collision: `minClearance = -Infinity`) |
| World | Blocks on ground | Dual InstancedMesh (8000 dark + 8000 gradient cubes), gyroid math |
| Visuals | MeshStandardMaterial | Custom GLSL ShaderMaterial (gradient + dark) with fog uniforms |
| Post-FX | None | `createPostFXPipeline()` (bloom, grain, vignette, chromatic) |
| Sky | None | `createGradientSky()` (animated 6-stop gradient) |
| Floor | PlaneGeometry | `createReflectiveGround()` (follows player) |
| Lights | Loader default | 6 animated orbital PointLights |
| shaders.ts | Empty stub | 2 factory functions for GLSL materials |

### manifest.ts — What Changed

```typescript
id: "gradient-prism",
name: "Gradient Prism",
description: "Fly through infinite gyroid architecture",

// Dark, atmospheric scene
scene: {
  background: "#0d0025",
  fogNear: 15, fogFar: 220, fogColor: "#1a0a40",
  ambientIntensity: 0.6,
  sunIntensity: 1.2,
  sunColor: "#ffd4a0",
  sunPosition: { x: 60, y: 60, z: -30 },
},
spawn: { position: { x: 0, y: 10, z: 0 } },
```

### scene.ts — Architecture Pattern

Uses a **custom chunk manager** for the gyroid architecture:
```typescript
// Gyroid function determines wall placement
function gyroid(x, y, z) {
  return Math.cos(x) * Math.sin(z) + Math.cos(y) * Math.sin(x) + Math.cos(z) * Math.sin(y);
}

// Dual InstancedMesh: 60% dark walls, 40% gradient walls
const darkMesh = new THREE.InstancedMesh(darkGeo, darkMaterial, MAX_INSTANCES);
const gradMesh = new THREE.InstancedMesh(gradGeo, gradMaterial, MAX_INSTANCES);
```

### settings.ts — Chunk Invalidation Pattern

World-altering parameters require **full chunk invalidation**:
```typescript
case "cellSize":
case "gyroidFreq":
case "wallThreshold":
  s.chunks.cellSize = value as number; // or freq1, thresh1
  s.chunks.lastCX = Number.NaN;  // Force position re-check
  s.chunks.lastCY = Number.NaN;
  s.chunks.active.clear();        // Clear all cached chunks
  s.chunks.dirty = true;          // Trigger rebuild next tick
  break;
```

PostFX parameters use the pipeline's setter methods:
```typescript
case "bloomIntensity":
  s.postfx.setBloomIntensity(value as number);
  break;
```

---

## Example 3: Star Float (Minimal Concept, 3 Parameters)

A hypothetical minimal experience — floating through a starfield. Shows how simple an experience can be.

### manifest.ts

```typescript
const parameters: ParameterDef[] = [
  { id: "driftSpeed", label: "Drift Speed", group: "Movement",
    min: 0.1, max: 5, default: 1, step: 0.1, unit: "m/s", icon: "Gauge" },
  { id: "starCount", label: "Star Count", group: "Scene",
    min: 100, max: 5000, default: 1500, step: 100, icon: "Star" },
  { id: "twinkleSpeed", label: "Twinkle", group: "Scene",
    min: 0, max: 3, default: 1, step: 0.1, icon: "Sparkle" },
];

export const manifest: ExperienceManifest = {
  id: "star-float",
  name: "Star Float",
  description: "Float through an infinite starfield",
  version: "0.1.0",
  author: "Student Name",
  parameters,
  outputs: [],
  interfaces: { orientation: true, speed: false },
  camera: { fov: 80, near: 0.1, far: 600 },
  scene: {
    background: "#000005",
    fogNear: 100, fogFar: 500, fogColor: "#000005",
    ambientIntensity: 0.1,
    sunIntensity: 0.5,
    sunColor: "#ffffff",
    sunPosition: { x: 0, y: 100, z: 0 },
  },
  spawn: { position: { x: 0, y: 0, z: 0 } },
  setup, tick, applySettings, updatePlayer, dispose,
};
```

### scene.ts

```typescript
import * as THREE from "three";
import { createStarfield, updateStarfield } from "$lib/three/starfield";
import type { ExperienceState, SetupContext, TickContext } from "../types";

export interface StarFloatState extends ExperienceState {
  stars: THREE.Points;
  camera: THREE.PerspectiveCamera;
  driftSpeed: number;
}

export async function setup(ctx: SetupContext): Promise<StarFloatState> {
  const stars = createStarfield({ count: 1500, radius: 400, twinkleSpeed: 1.0 });
  ctx.scene.add(stars);
  return { stars, camera: ctx.camera, driftSpeed: 1 };
}

export function tick(state: ExperienceState, ctx: TickContext) {
  const s = state as StarFloatState;
  updateStarfield(s.stars, ctx.elapsed);
  // Gentle auto-drift forward
  s.camera.position.z -= s.driftSpeed * ctx.delta;
  return { state: s };
}

export function dispose(state: ExperienceState, scene: THREE.Scene) {
  const s = state as StarFloatState;
  s.stars.geometry.dispose();
  (s.stars.material as THREE.Material).dispose();
  scene.remove(s.stars);
}
```

### settings.ts

```typescript
export function applySettings(id: string, value: number | boolean | string, state: ExperienceState, scene: THREE.Scene) {
  const s = state as StarFloatState;
  switch (id) {
    case "driftSpeed":
      s.driftSpeed = value as number;
      break;
    case "starCount":
      // Structural rebuild: dispose old, create new
      s.stars.geometry.dispose();
      (s.stars.material as THREE.Material).dispose();
      scene.remove(s.stars);
      s.stars = createStarfield({ count: value as number, radius: 400 });
      scene.add(s.stars);
      break;
    case "twinkleSpeed":
      // Update shader uniform directly
      (s.stars.material as THREE.ShaderMaterial).uniforms.uTwinkleSpeed.value = value;
      break;
    default: break;
  }
}
```

### Takeaway

Only 3 parameters, 1 building block (`createStarfield`), no FlightPlayer, no shaders.ts — a complete experience in ~60 lines of actual code.
