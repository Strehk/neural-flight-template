# 🏔️ Terrain System

Chunked procedural terrain with infinite scrolling, object pooling, and per-chunk decorations.

## Modules

| File | Purpose |
|------|---------|
| `manager.ts` | `TerrainManager` — chunk load/unload based on player position, object pooling |
| `chunk.ts` | `TerrainChunk` — single 128×128 tile with heightmap displacement + vertex colors |
| `geometry.ts` | Heightmap → BufferGeometry conversion (32-segment plane, height-based colors) |
| `heightmap.ts` | Simplex noise FBM (5 octaves) — generates rolling hills |
| `water.ts` | Flat semi-transparent water plane at Y=5 |
| `decorations.ts` | InstancedMesh trees + rocks per chunk (seeded placement) |

## How It Works

1. `TerrainManager.update(playerPos)` calculates which chunks should be loaded
2. Chunks outside `VIEW_RADIUS` are recycled into an object pool (max 30)
3. Each new chunk gets: terrain mesh + decorations (trees/rocks) + rings
4. `update()` returns the number of rings collected this frame

## Height-Based Colors

Vertex colors change with altitude:
- 🟢 Grass (0–10) → 🟡 Yellow (10–25) → 🟠 Orange (25–40) → ⬜ Rock (40–50) → ⚪ Snow (50+)

## Performance

- 32 segments per chunk = visible facets (low-poly look) + fewer vertices
- InstancedMesh: 2 draw calls per chunk for all trees + rocks
- Object pooling prevents GC pressure from chunk creation/destruction
