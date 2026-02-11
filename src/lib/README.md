# 📂 src/lib — Module Overview

Quick navigation for students and contributors.

## For Students: Start Here

1. **Build your Experience** → [`experiences/README.md`](experiences/README.md)
2. **Use 3D Building Blocks** → [`three/README.md`](three/README.md)
3. **Register in Catalog** → [`experiences/catalog.ts`](experiences/catalog.ts)
4. **Test with Node Editor** → `/node-editor` route

## Module Map

| Module | Purpose | Key Files |
|--------|---------|-----------|
| [`experiences/`](experiences/) | VR experiences built by students | `catalog.ts`, `loader.ts`, `types.ts` |
| [`three/`](three/) | Shared 3D building blocks (clouds, terrain, sky) | `clouds.ts`, `player.ts`, `rings.ts` |
| [`node-editor/`](node-editor/) | Visual parameter editor (Eurorack metaphor) | `README.md` has full docs |
| [`config/`](config/) | Legacy configuration constants | `flight.ts` |
| [`components/`](components/) | Svelte UI components (sidebar, controls) | — |
| [`flow/`](flow/) | SvelteFlow canvas integration | — |
| [`ws/`](ws/) | WebSocket protocol (Quest ↔ Controller) | `protocol.ts` |
| [`gyro/`](gyro/) | Device orientation (phone gyroscope) | — |
| [`types/`](types/) | Shared TypeScript types | `orientation.ts` |
| [`assets/`](assets/) | Static assets (textures, models) | — |

## Cross-Module Dependencies

```
experiences/ ──uses──→ three/        (building blocks)
experiences/ ──uses──→ config/       (legacy constants, being replaced by manifests)
node-editor/ ──reads─→ experiences/  (manifest.parameters → Output Nodes)
ws/          ──sends─→ experiences/  (orientation + settings → applySettings)
```

## Architecture Layers

```
┌─────────────────────────────────────────┐
│  Experiences (student-built VR worlds)  │  ← You build here
├─────────────────────────────────────────┤
│  Prototyping Tools (Node Editor, UI)    │  ← Visual controls
├─────────────────────────────────────────┤
│  Infrastructure (WebXR, WS, SvelteKit) │  ← Platform internals
└─────────────────────────────────────────┘
```
