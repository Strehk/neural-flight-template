# Shared Library — Building Blocks

Ready-made 3D building blocks in `src/lib/three/`. Use them freely (Rule E6: optional, not required).

---

## Nature & Landscape

### createSky()

Gradient sky dome with 3 colors (top → horizon → bottom).

```typescript
import { createSky, updateSkyColors } from "$lib/three/sky";

const sky = createSky({
  radius: 800,
  detail: 3,
  colorTop: 0x1a6fc4,
  colorHorizon: 0xffeebb,
  colorBottom: 0x87ceeb,
});
ctx.scene.add(sky);

// Live color update:
updateSkyColors(sky, "#1a6fc4", "#ffeebb", "#87ceeb");

// Dispose:
sky.geometry.dispose();
(sky.material as THREE.Material).dispose();
```

### createGradientSky()

N-stop gradient sky with optional animation (GLSL ShaderMaterial).

```typescript
import { createGradientSky, updateGradientSky } from "$lib/three/gradient-sky";

const sky = createGradientSky({
  colors: [0x0a0020, 0x2a1060, 0x4a90d9, 0xff6b9d],
  radius: 500,
  animationSpeed: 0.005, // 0 = static
});
ctx.scene.add(sky);

// In tick(): update animation
updateGradientSky(sky, ctx.elapsed);
```

### createClouds() / updateClouds() / disposeClouds()

Low-poly cloud clusters made of dodecahedron blobs.

```typescript
import { createClouds, updateClouds, disposeClouds } from "$lib/three/clouds";

const clouds = createClouds({
  count: 40,
  spread: 500,
  heightMin: 150,
  heightMax: 280,
  blobCount: 8,
  blobRadius: 15,
  color: 0xffffff,
  opacity: 0.8,
  driftSpeed: 2,
});
ctx.scene.add(clouds);

// In tick(): wind drift + wrapping
updateClouds(clouds, delta, playerPosition, windSpeed);

// Dispose:
disposeClouds(clouds);
scene.remove(clouds);
```

### createWater()

Transparent water plane.

```typescript
import { createWater } from "$lib/three/terrain/water";

const water = createWater({
  size: 4000,
  color: 0x2980b9,
  opacity: 0.6,
  y: 5,
});
ctx.scene.add(water);

// Dispose:
water.geometry.dispose();
(water.material as THREE.Material).dispose();
```

---

## Terrain System

### TerrainManager

Procedural terrain with chunk system, trees, rocks, and collectible rings.

```typescript
import { TerrainManager } from "$lib/three/terrain/manager";

const terrain = new TerrainManager({
  chunkSize: 128,
  maxPool: 30,
});
ctx.scene.add(terrain.group);
ctx.scene.add(terrain.ringGroup);

// In tick(): load/unload chunks around player
const collectedRings = terrain.update(playerPosition);

// Rebuild terrain (after parameter change):
terrain.rebuildAllChunks();

// Change ring colors:
terrain.updateRingColors("#f1c40f");

// Dispose:
terrain.dispose();
```

### createChunkDecorations()

Trees and rocks as InstancedMesh.

```typescript
import { createChunkDecorations } from "$lib/three/terrain/decorations";

const decos = createChunkDecorations(chunkX, chunkZ, heightConfig, treesPerChunk);
ctx.scene.add(decos.group);

// Dispose:
decos.dispose();
```

### createChunkRings()

Collectible rings per terrain chunk.

```typescript
import { createChunkRings, updateRings } from "$lib/three/rings";

const chunkRings = createChunkRings(chunkX, chunkZ, heightConfig, ringConfig);

// In tick():
const collected = updateRings(chunkRings.rings, playerPosition);

// Dispose:
chunkRings.dispose();
```

---

## Player & Camera

### FlightPlayer

Physics-based flight controller with inertia, smoothing, and terrain collision.

```typescript
import { FlightPlayer } from "$lib/three/player";

const player = new FlightPlayer({
  fov: 75,
  near: 0.1,
  far: 1000,
  spawnPosition: { x: 0, y: 50, z: 0 },
  baseSpeed: 20,
  terrainSlowdown: 0.7,
});
ctx.scene.add(player.rig);

// Orientation from ICAROS/Gyro/Controller:
player.updateOrientation({ pitch, roll });
player.updateSpeed({ accelerate, brake });

// In tick():
player.tick(delta);

// Configurable properties:
player.baseSpeed = 30;
player.lerpAlpha = 0.15;        // Smoothing (0.01 = sluggish, 0.5 = direct)
player.rollYawMultiplier = 1.5; // Roll → yaw coupling
player.minClearance = 8;        // Terrain clearance (meters)
```

**Tip:** For simple experiences without physics, you don't need FlightPlayer. Move `ctx.camera` directly in `updatePlayer()` — as the template does.

---

## Environments & Floors

### createGridFloor()

Neon grid with distance fade (GLSL ShaderMaterial).

```typescript
import { createGridFloor } from "$lib/three/grid-floor";

const grid = createGridFloor({
  size: 200,
  color: 0x00ccff,
  lineWidth: 1.0,
  fadeDistance: 80,
  yPosition: 0,
});
ctx.scene.add(grid);
```

### createReflectiveGround()

Reflective floor (MeshPhysicalMaterial with clearcoat).

```typescript
import { createReflectiveGround } from "$lib/three/reflective-ground";

const ground = createReflectiveGround({
  size: 200,
  color: 0x111122,
  roughness: 0.15,
  metalness: 0.9,
  opacity: 0.85,
  yPosition: -10,
});
ctx.scene.add(ground);
```

### createProceduralCity()

InstancedMesh-based buildings on a grid.

```typescript
import { createProceduralCity } from "$lib/three/procedural-city";

const city = createProceduralCity({
  gridSize: 20,
  cellSize: 4,
  density: 0.6,
  minHeight: 2,
  maxHeight: 25,
  color: 0x333344,
  seed: 42,
});
ctx.scene.add(city.mesh);

// Dispose:
city.dispose();
```

### createBlobTerrain()

Animated organic terrain (FBM displacement on PlaneGeometry).

```typescript
import { createBlobTerrain } from "$lib/three/blob-terrain";

const blob = createBlobTerrain({
  size: 100,
  segments: 128,
  amplitude: 6,
  octaves: 5,
  color: 0x7faa6e,
  animated: true,
  animSpeed: 0.5,
});
ctx.scene.add(blob.mesh);

// In tick():
blob.update(elapsed);

// Dispose:
blob.dispose();
```

---

## Starfield & Particles

### createStarfield()

Animated stars with twinkle effect (GLSL ShaderMaterial).

```typescript
import { createStarfield, updateStarfield } from "$lib/three/starfield";

const stars = createStarfield({
  count: 1500,
  radius: 400,
  minSize: 0.3,
  maxSize: 1.2,
  color: 0xffffff,
  twinkleSpeed: 1.0,
});
ctx.scene.add(stars);

// In tick():
updateStarfield(stars, elapsed);

// Dispose:
stars.geometry.dispose();
(stars.material as THREE.Material).dispose();
```

### createFloatingObjects()

Floating objects with bobbing animation (InstancedMesh).

```typescript
import { createFloatingObjects } from "$lib/three/floating-objects";

const floaters = createFloatingObjects({
  count: 15,
  spread: 40,
  heightRange: [2, 15],
  scaleRange: [0.3, 1.5],
  bobAmplitude: 0.5,
  bobFrequency: 1.0,
  color: 0xff6b9d,
});
ctx.scene.add(floaters.mesh);

// In tick():
floaters.update(elapsed);

// Dispose:
floaters.dispose();
```

---

## Procedural Architecture (Lab)

### generateChunk() (Architecture)

Infinite procedural corridors with gradient panels.

```typescript
import { generateChunk, disposeChunk } from "$lib/three/lab/architecture";

const chunk = generateChunk(zStart, zEnd, {
  corridorWidth: 6,
  ceilingHeight: 8,
  sectionStep: 10,
  wallDensity: 0.65,
  seed: 42,
});
ctx.scene.add(chunk);

// Dispose:
disposeChunk(chunk);
```

### generateLabyrinthChunk()

3D labyrinth via recursive Mondrian subdivision.

```typescript
import { generateLabyrinthChunk, disposeLabyrinthChunk } from "$lib/three/lab/labyrinth";

const lab = generateLabyrinthChunk(
  { min: new THREE.Vector3(-50, -10, -50), max: new THREE.Vector3(50, 30, 50) },
  { maxDepth: 4, wallProbability: 0.45, seed: 42 },
);
ctx.scene.add(lab);

// Dispose:
disposeLabyrinthChunk(lab);
```

### createChunkManager()

LOD system for architecture chunks (loads/unloads based on camera position).

```typescript
import { createChunkManager } from "$lib/three/lab/chunk_manager";

const mgr = createChunkManager(scene, {
  chunkSize: 20,
  chunksAhead: 3,
  chunksBehind: 1,
});

// In tick():
mgr.update(camera.position.z);

// Dispose:
mgr.dispose();
```

### createMetaballs()

MarchingCubes with Lissajous orbits and iridescent material.

```typescript
import { createMetaballs } from "$lib/three/lab/metaballs";

const meta = createMetaballs({
  resolution: 48,
  scale: 1,
});
ctx.scene.add(meta.mesh);

// In tick():
meta.update(elapsed);

// Dispose:
meta.dispose();
```

---

## Post-Processing

### createPostFXPipeline()

Complete post-FX pipeline (pmndrs/postprocessing). WebXR compatible.

```typescript
import { createPostFXPipeline } from "$lib/three/postfx-pipeline";

const postfx = createPostFXPipeline(renderer, scene, camera, {
  bloom: { intensity: 1.0, luminanceThreshold: 0.3 },
  filmGrain: { opacity: 0.08 },
  vignette: { offset: 0.3, darkness: 0.6 },
  chromatic: { offset: 0.001 },
  depthOfField: { focusDistance: 0.3, bokehScale: 0.01 },
});

// Live parameter changes:
postfx.setBloomIntensity(2.0);
postfx.setGrainOpacity(0.15);
postfx.setChromaticOffset(0.002);

// Dispose:
postfx.dispose();
```

---

## Utilities

### seededRandom()

Deterministic random numbers (same result for same seed).

```typescript
import { seededRandom, seededRandom2D } from "$lib/three/random";

const r1 = seededRandom(42);         // 0–1, always the same for seed=42
const r2 = seededRandom2D(10, 20);   // 2D seed
```

### loadGLTF()

Load GLTF/GLB 3D models.

```typescript
import { loadGLTF } from "$lib/three/loader";

const gltf = await loadGLTF("/models/my-model.glb");
ctx.scene.add(gltf.scene);
```

### createParametricLines()

Mathematical curves (Lissajous, spiral, rose, torus knot).

```typescript
import { createParametricLines } from "$lib/three/parametric-lines";

const lines = createParametricLines({
  curveType: "lissajous",  // "spiral" | "rose" | "torusKnot"
  count: 30,
  segments: 200,
  scale: 10,
  color: 0xffffff,
  useTubes: true,
  tubeRadius: 0.05,
});
ctx.scene.add(lines);
```

---

## Quick Reference Table

| Building Block | Import | Returns | Dispose | Animation |
|---------------|--------|---------|---------|-----------|
| `createSky` | `$lib/three/sky` | `Mesh` | geo + mat | `updateSkyColors()` |
| `createGradientSky` | `$lib/three/gradient-sky` | `Mesh` | geo + mat | `updateGradientSky()` |
| `createClouds` | `$lib/three/clouds` | `Group` | `disposeClouds()` | `updateClouds()` |
| `createWater` | `$lib/three/terrain/water` | `Mesh` | geo + mat | — |
| `TerrainManager` | `$lib/three/terrain/manager` | Class | `.dispose()` | `.update()` |
| `FlightPlayer` | `$lib/three/player` | Class | — | `.tick()` |
| `createStarfield` | `$lib/three/starfield` | `Points` | geo + mat | `updateStarfield()` |
| `createFloatingObjects` | `$lib/three/floating-objects` | Handle | `.dispose()` | `.update()` |
| `createGridFloor` | `$lib/three/grid-floor` | `Mesh` | geo + mat | — |
| `createReflectiveGround` | `$lib/three/reflective-ground` | `Mesh` | geo + mat | — |
| `createProceduralCity` | `$lib/three/procedural-city` | Handle | `.dispose()` | — |
| `createBlobTerrain` | `$lib/three/blob-terrain` | Handle | `.dispose()` | `.update()` |
| `createMetaballs` | `$lib/three/lab/metaballs` | Handle | `.dispose()` | `.update()` |
| `createPostFXPipeline` | `$lib/three/postfx-pipeline` | Pipeline | `.dispose()` | — |
| `loadGLTF` | `$lib/three/loader` | `Promise<GLTF>` | scene traverse | — |
