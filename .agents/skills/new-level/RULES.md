# Experience Rules & Performance Budget

## Fixed Rules (E1–E12)

These rules are **mandatory**. No code may violate them.

| # | Rule | Rationale |
|---|------|-----------|
| E1 | **Experience = Folder.** Each experience is a folder under `src/lib/experiences/`. 5+1 files: `index.ts`, `manifest.ts`, `scene.ts`, `player.ts`, `settings.ts` + optional `shaders.ts`. | Isolation, copyability |
| E2 | **Manifest = Contract.** The `ExperienceManifest` is the only interface between experience and infrastructure. | Decoupling |
| E3 | **Parameters are declarative.** All steerable parameters are defined in the manifest as `ParameterDef[]`. No dynamic parameters at runtime. | Predictable, UI-generatable |
| E4 | **Lifecycle in separate files.** `setup`/`tick`/`dispose` in `scene.ts`, `updatePlayer` in `player.ts`, `applySettings` in `settings.ts`. The manifest imports them. | Readability, Single Responsibility |
| E5 | **Scene basics = Loader.** Fog, lights, background, camera are set by the Loader. The experience only declares defaults in the manifest (`scene`, `camera`, `spawn`). | No boilerplate in experiences |
| E6 | **Shared Library = Optional.** `src/lib/three/` offers building blocks. Experiences may use them but don't have to. | No framework dependency |
| E7 | **State = Opaque.** Infrastructure never reads/writes `ExperienceState`. Only the experience itself knows its state. | No coupling to internals |
| E8 | **Catalog = Static.** No dynamic loading. 1 import + 1 line in `catalog.ts`. | KISS |
| E9 | **Signals stay 0–1.** Node Editor sends 0–1. Remap to real-world values happens in infrastructure. `applySettings()` receives real values. | Consistency with Node Editor |
| E10 | **No Three.js in Infrastructure.** Only the `/vr` route and experiences import Three.js. | Separation |
| E11 | **localStorage for Experience-ID.** Cross-route persistence via localStorage. | KISS |
| E12 | **Template to copy.** `experiences/template/` is the starter scaffold. | Onboarding < 5 min |

## Naming Convention

```
manifest.id === folder name === catalog key
```

- **Format:** `kebab-case` (lowercase, hyphens)
- **Examples:** `mountain-flight`, `gradient-prism`, `star-float`
- **Forbidden:** camelCase, underscores, spaces, uppercase letters

## Dispose Requirement

Every experience **must** free all GPU resources in `dispose()`:

```typescript
// Geometry — ALWAYS dispose
geometry.dispose();

// Material — ALWAYS dispose
material.dispose();

// Texture — dispose if self-created
texture.dispose();

// Groups — traverse children
group.traverse((child) => {
  if (child instanceof THREE.Mesh) {
    child.geometry.dispose();
    if (child.material instanceof THREE.Material) {
      child.material.dispose();
    }
  }
});

// Scene — remove objects
scene.remove(object);
```

**Why?** Without dispose(), GPU memory stays allocated → memory leak, especially critical on Quest.

## The 3 Settings Patterns

### 1. Simple State (read by `tick()`)

```typescript
case "moveSpeed":
  s.moveSpeed = value as number;
  break;
```

### 2. Visual Update (mutate material/fog/light directly)

```typescript
case "blockColor":
  s.blockMaterial.color.set(value as string);
  break;

case "fogNear":
  if (scene.fog instanceof THREE.Fog) scene.fog.near = value as number;
  break;
```

### 3. Structural Rebuild (dispose old objects, create new ones)

```typescript
case "blockCount": {
  // 1. Dispose old
  for (const child of s.blocks.children) {
    if (child instanceof THREE.Mesh) child.geometry.dispose();
  }
  scene.remove(s.blocks);
  // 2. Create new
  s.blocks = createBlocks(value as number, s.blockMaterial);
  scene.add(s.blocks);
  break;
}
```

**Tip:** For rebuild parameters that change rapidly (slider dragging), use debouncing (→ see Mountain Flight `cloudCount` in settings.ts).

## Quest Performance Budget

Experiences must run on **Meta Quest 3** at **≥72fps**.

| Metric | Budget | Measurement |
|--------|--------|-------------|
| Draw Calls | ≤1000 | `renderer.info.render.calls` |
| Triangles | ≤3M | `renderer.info.render.triangles` |
| Fragment Shader | ≤1ms per pass | GPU Profiler |
| Framerate | ≥72fps | Quest Performance Overlay |
| Texture Memory | ≤256MB | `renderer.info.memory.textures` |

### Performance Strategies

- **Instancing** for repeated objects (`THREE.InstancedMesh`)
- **Post-processing sparingly** — one bloom pass, not three
- **Limit shader complexity** — LYGIA Noise instead of custom raymarching
- **Shared materials** — one material for many meshes (as in the template)
- **LOD** for complex geometries (optional)

## TypeScript Interfaces

Experience types are defined in `src/lib/experiences/types.ts`:

| Interface | Purpose |
|-----------|---------|
| `ExperienceManifest` | Complete contract (identity, I/O, scene, lifecycle) |
| `ParameterDef` | A steerable parameter (id, label, group, type, min/max, default) |
| `ExperienceState` | Opaque state bag (each experience defines its own shape) |
| `SetupContext` | `{ scene, camera, renderer }` — passed to `setup()` |
| `TickContext` | `{ delta, elapsed, camera, playerPosition, playerRotation }` — passed to `tick()` |
| `SceneConfig` | Background, fog, lights — declared in manifest |
| `CameraConfig` | FOV, near, far |
| `SpawnConfig` | Spawn position + optional rotation |
