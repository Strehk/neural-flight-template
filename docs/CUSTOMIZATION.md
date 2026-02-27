# 🎨 Customization Guide

How to modify the VR world, flight physics, and visual style.

---

## Overview

The platform offers multiple ways to create and customize VR experiences:

### 1. Build a New Experience (Recommended)

The Experience System is the primary way to create new VR worlds. Each experience is a self-contained module with its own scene, physics, and parameters.

```
1. Copy template → src/lib/experiences/my-world/
2. Edit manifest → name, parameters, scene defaults
3. Build scene → Three.js objects in setup(), animation in tick()
4. Register → 1 line in catalog.ts
```

> 📖 Full guide: [`src/lib/experiences/README.md`](../src/lib/experiences/README.md)

### 2. Shader Playground

Learn and prototype GLSL shaders interactively at `/shader-playground`:
- 24 signal-based modules (control, vertex, fragment)
- Instant 3D preview with multiple geometries
- Modulation engine with LFO waveforms

> 📖 Details: [`src/lib/shader-playground/README.md`](../src/lib/shader-playground/README.md)

### 3. Modify Existing Components

The sections below explain how to modify the shared 3D building blocks and flight physics directly.

---

## Quick Wins: Config-Only Changes

Most visual changes can be made in `src/lib/config/flight.ts` without touching module code.

### Flight Physics

```typescript
export const FLIGHT = {
  BASE_SPEED: 20,        // Default flight speed
  ACCEL_SPEED: 40,       // Speed when accelerating
  BRAKE_SPEED: 5,        // Speed when braking
  LERP_ALPHA: 0.15,      // Input smoothing (0.05=sluggish, 0.3=snappy)
  ROLL_YAW_MULTIPLIER: 1.5, // Banking turn rate
  MIN_CLEARANCE: 8,      // Minimum altitude above terrain
};
```

### Terrain

```typescript
export const TERRAIN = {
  CHUNK_SIZE: 128,       // Size of each terrain tile
  VIEW_RADIUS: 2,        // Chunks visible around player
  NOISE: {
    octaves: 5,          // Detail layers
    amplitude: 60,       // Mountain height
    frequency: 0.005,    // Scale (lower = bigger features)
    persistence: 0.45,   // How much small details contribute
  },
  WATER_Y: 5,            // Water level
};
```

### Colors

```typescript
export const TERRAIN_COLORS = {
  GRASS: 0x4caf50,
  YELLOW: 0xe8c840,
  ORANGE: 0xe07030,
  ROCK: 0x9e9e9e,
  SNOW: 0xfafafa,
  BANDS: [10, 25, 40, 50], // Height thresholds for each color
};

export const SKY = {
  COLOR_TOP: 0x1a6fc4,
  COLOR_HORIZON: 0xffeebb,
  COLOR_BOTTOM: 0x87ceeb,
};
```

---

## Adding Custom 3D Objects

### Static Objects

Add objects to the scene in `vr/+page.svelte`:

```typescript
import * as THREE from 'three';
import { loadGLTF } from '$lib/three/loader';

onMount(async () => {
  // ... existing setup ...

  // Option 1: Primitive geometry
  const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(5),
    new THREE.MeshStandardMaterial({ color: 0xff0000 })
  );
  sphere.position.set(0, 50, -100);
  scene.add(sphere);

  // Option 2: GLTF model
  const model = await loadGLTF('/models/custom.glb');
  model.position.set(50, 30, -50);
  scene.add(model);
});
```

### Per-Chunk Objects

Add objects that spawn with terrain chunks in `terrain/chunk.ts`:

```typescript
// In TerrainChunk.build()
private addCustomObjects(): void {
  const geometry = new THREE.BoxGeometry(2, 2, 2);
  const material = new THREE.MeshStandardMaterial({ color: 0xff6600 });

  for (let i = 0; i < 5; i++) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(
      this.worldX + Math.random() * TERRAIN.CHUNK_SIZE,
      30,
      this.worldZ + Math.random() * TERRAIN.CHUNK_SIZE
    );
    this.group.add(mesh);
  }
}
```

---

## Modifying Terrain

### Change Heightmap Algorithm

Edit `terrain/heightmap.ts`:

```typescript
export function getHeight(x: number, z: number, config: HeightmapConfig): number {
  // Default: Simplex noise FBM
  let height = 0;
  let amp = config.amplitude;
  let freq = config.frequency;

  for (let i = 0; i < config.octaves; i++) {
    height += simplex.noise2D(x * freq, z * freq) * amp;
    amp *= config.persistence;
    freq *= 2;
  }

  return height;
}
```

Try alternatives:
- **Flat with islands**: `Math.max(0, height - 20)`
- **Ridged mountains**: `Math.abs(height)`
- **Plateaus**: `Math.round(height / 20) * 20`

### Change Decorations

Edit `terrain/decorations.ts`:

```typescript
export const DECORATIONS = {
  TREES_PER_CHUNK: 25,  // More/fewer trees
  ROCKS_PER_CHUNK: 10,
  CROWN_COLORS: [       // Tree canopy colors
    0xc0392b, 0xe74c3c, // reds
    0x27ae60, 0x2ecc71, // greens
  ],
};
```

---

## Changing Flight Physics

### Movement Model

The `FlightPlayer` class in `player.ts` uses arcade-style physics:

```typescript
// Forward direction from heading + pitch
const forward = new THREE.Vector3(
  -Math.sin(heading) * Math.cos(pitch),  // X
  -Math.sin(pitch),                       // Y (altitude)
  -Math.cos(heading) * Math.cos(pitch),  // Z
);

// Move player
rig.position.addScaledVector(forward, velocity * delta);
```

To change flight feel:
- **More responsive**: Increase `LERP_ALPHA` (0.3+)
- **Tighter turns**: Increase `ROLL_YAW_MULTIPLIER`
- **Sim-like**: Add momentum/inertia variables

### Add New Speed Modes

Edit `player.ts`:

```typescript
private updateVelocity(): void {
  if (this.boosting) {
    this.velocity = runtimeConfig.baseSpeed * 4; // Turbo!
  } else if (this.accelerating) {
    this.velocity = runtimeConfig.baseSpeed * 2;
  } else if (this.braking) {
    this.velocity = runtimeConfig.baseSpeed * 0.25;
  } else {
    this.velocity = runtimeConfig.baseSpeed;
  }
}
```

---

## WebSocket Messages

Controller → VR communication uses three message types:

### OrientationData (60Hz)

```typescript
{
  type: "orientation",
  pitch: number,    // -90 to 90 (forward/back lean)
  roll: number,     // -90 to 90 (left/right lean)
  timestamp: number
}
```

### SpeedCommand (on press/release)

```typescript
{
  type: "speed",
  action: "accelerate" | "brake",
  active: boolean,
  timestamp: number
}
```

### SettingsUpdate (from sidebar)

```typescript
{
  type: "settings",
  settings: { baseSpeed: 30, fogNear: 50, ... },
  timestamp: number
}
```

### Adding Custom Messages

1. Add type to `lib/types/orientation.ts`:

```typescript
export interface CustomCommand {
  type: "custom";
  action: string;
  value: number;
  timestamp: number;
}

export type ControllerMessage =
  | OrientationData
  | SpeedCommand
  | SettingsUpdate
  | CustomCommand;
```

2. Add type guard in `lib/ws/protocol.ts`:

```typescript
export function isCustomCommand(data: unknown): data is CustomCommand {
  if (typeof data !== "object" || data === null) return false;
  const d = data as Record<string, unknown>;
  return d.type === "custom" && typeof d.action === "string";
}
```

3. Handle in VR scene.

---

## Performance Tips

| Optimization | How |
|-------------|-----|
| Reduce draw calls | Use `InstancedMesh` for repeated objects |
| Lower triangle count | Reduce `TERRAIN.SEGMENTS` (32 → 16) |
| Shorter view distance | Reduce `TERRAIN.VIEW_RADIUS` (2 → 1) |
| Hide distant terrain | Reduce `SCENE.FOG_FAR` |
| Fewer decorations | Reduce `TREES_PER_CHUNK` |

Target: **72 FPS** on Quest (11ms frame budget)

---

## Live Tuning

The Settings Sidebar (`/controller` → ☰) allows runtime adjustments:

- Flight speed, turn rate, smoothing
- Fog distance
- Sun intensity, elevation
- Sky colors
- Cloud count, height
- Terrain amplitude
- Ring count, color

Changes apply instantly via WebSocket — no code changes needed for experimentation.
