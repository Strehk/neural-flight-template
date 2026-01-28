# 🎮 Three.js Modules

Scene setup, flight physics, and visual elements for the VR flight sim.

## Modules

| File | Purpose |
|------|---------|
| `scene.ts` | Scene factory — lights, fog, sky color |
| `player.ts` | `FlightPlayer` class — rig, camera, arcade flight physics |
| `sky.ts` | Low-poly sky dome (inverted IcosahedronGeometry, vertex-color gradient) |
| `clouds.ts` | Procedural cloud groups (DodecahedronGeometry blobs, drift animation) |
| `rings.ts` | Collectible torus rings per terrain chunk (distance-based collection) |
| `loader.ts` | GLTFLoader utility wrapper |
| `terrain/` | Chunked procedural terrain system → see [`terrain/README.md`](terrain/README.md) |

## Key Patterns

- **All config** lives in `$lib/config/flight.ts` — no magic numbers in modules
- **FlatShading** everywhere for low-poly aesthetic
- **Seeded random** for deterministic placement (same chunk = same objects)
- **InstancedMesh** for repeated geometry (trees, rocks)

## Flight Physics (`player.ts`)

Arcade model with decoupled axes:
1. Smooth input via LERP (configurable alpha)
2. Roll accumulates heading (banking turns)
3. Forward vector from spherical coords (heading + pitch)
4. Terrain collision clamps altitude + slows speed
