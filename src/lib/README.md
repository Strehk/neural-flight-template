# 📂 src/lib — Module Overview

Quick navigation for students and contributors.

## For Students: Start Here

1. **Build your Experience** → [`experiences/README.md`](experiences/README.md)
2. **Use 3D Building Blocks** → [`three/README.md`](three/README.md)
3. **Learn Shaders** → [`shader-playground/README.md`](shader-playground/README.md)
4. **Register in Catalog** → [`experiences/catalog.ts`](experiences/catalog.ts)
5. **Test with Node Editor** → `/node-editor` route

## Module Map

| Module | Purpose | Key Files |
|--------|---------|-----------|
| [`experiences/`](experiences/) | VR experiences built by students | `catalog.ts`, `loader.ts`, `types.ts` |
| [`three/`](three/) | Shared 3D building blocks (clouds, terrain, sky) | `clouds.ts`, `player.ts`, `rings.ts` |
| [`shaders/`](shaders/) | Reusable GLSL Shader Library (vertex, fragment, noise, sdf, landscape, generative, lighting, abstract) | `common/`, `createShaderMaterial()` |
| [`shader-playground/`](shader-playground/) | Live GLSL editor with 3D preview (signal-based modules) | `README.md` has full docs |
| [`node-editor/`](node-editor/) | Visual parameter editor (Eurorack metaphor) | `README.md` has full docs |
| [`config/`](config/) | Configuration constants | `flight.ts` |
| [`components/`](components/) | Svelte UI components (sidebar, controls) | — |
| [`flow/`](flow/) | SvelteFlow canvas integration | — |
| [`ws/`](ws/) | WebSocket protocol (Quest ↔ Controller) | `protocol.ts` |
| [`gyro/`](gyro/) | Device orientation (phone gyroscope) | — |
| [`types/`](types/) | Shared TypeScript types | `orientation.ts` |
| [`assets/`](assets/) | Static assets (textures, models) | — |

## Cross-Module Dependencies

```
shaders/           ──uses──→ THREE.js            (only dependency)
experiences/ ──uses──→ three/              (building blocks)
experiences/ ──uses──→ shaders/            (custom ShaderMaterials)
experiences/ ──uses──→ config/             (constants, being replaced by manifests)
node-editor/ ──reads─→ experiences/        (manifest.parameters → Output Nodes)
ws/          ──sends─→ experiences/        (orientation + settings → applySettings)
shader-playground/ ──uses──→ three/        (Three.js renderer for preview)
shader-playground/ ──uses──→ shaders/common/ (shared GLSL snippets, later)
```

## Architecture Layers

```
┌─────────────────────────────────────────┐
│  Experiences (student-built VR worlds)  │  ← You build here
├─────────────────────────────────────────┤
│  Prototyping Tools                      │  ← Visual controls
│  Node Editor + Shader Playground        │
├─────────────────────────────────────────┤
│  Infrastructure (WebXR, WS, SvelteKit) │  ← Platform internals
└─────────────────────────────────────────┘
```
