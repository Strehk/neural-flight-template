# Project Plan — ICAROS VR Flight Sim

> **Prototyp-Vision:** siehe [`dev/GOAL.md`](./GOAL.md)

## Overview

**Project:** ICAROS VR Flight Simulation
**Goal:** Fly through procedural landscapes on Meta Quest, controlled by ICAROS device (pitch + roll)
**Stack:** SvelteKit + Bun + Three.js + WebXR + bits-ui + Lucide + WebSocket

## Reference Assets (`assets/`)

| Asset | Purpose |
|-------|---------|
| `icaros.glb` | 3D ICAROS device model (18MB GLB) |
| `Landschaft_*.png` | Low-Poly terrain style references |
| `UIscreen.png` | Design System spec — Brutalist UI reference |

**Art Direction:** Low-Poly, facettiert, `flatShading: true`, Vertex-Colors, bunte stilisierte Farben, keine Texturen

---

## Completed Phases

### ~~Phase 0: Foundation (Types + WebSocket)~~ Done

- [x] Types: `OrientationData`, `SpeedCommand`, `ControllerMessage`
- [x] WebSocket Client (Svelte 5 `$state`, Auto-Reconnect)
- [x] WebSocket Server (Broadcast, Sender-Exclusion)
- [x] Vite Plugin: `ws` Library, HTTPS, `host: true`

### ~~Phase 1a: Controller UI~~ Done

- [x] Brutalist Dark Theme (Custom Properties, Google Fonts)
- [x] Controller Layout + WS Integration
- [x] D-Pad + Arrow Keys (ControlPad)
- [x] Accelerate/Brake (SpeedButtons)
- [x] 3D ICAROS Preview (IcarosPreview)

### ~~Phase 1b: VR Flight Scene~~ Done

- [x] Full-Screen Canvas, WebXR, VRButton
- [x] Scene Factory (Sky, Fog, Lights)
- [x] FlightPlayer Class (Rig + Camera + Lerp)
- [x] Heading-based flight physics (axis decoupling)

### ~~Phase 2: Low-Poly Terrain + Assets~~ Done

- [x] Chunked procedural Low-Poly Terrain (Simplex-Noise, 5 octaves)
- [x] FlatShading + Vertex-Colors (height-based, 32 segments)
- [x] Chunk Load/Unload + Object Pooling
- [x] Low-Poly Trees/Rocks as InstancedMesh per chunk
- [x] Water Plane, Sky Dome, Clouds
- [x] Hard sunlight (SUN: 3.0, AMBIENT: 0.3, warm color)

### ~~Phase 3: Ring Course~~ Done

- [x] Torus rings per chunk (seeded random)
- [x] Distance-based collision detection
- [x] Visual feedback (color/emissive change)
- [x] Score counter + UI overlay

### ~~Phase 4a: Polish~~ Done

- [x] Cloud drift animation (updateClouds with wrapping)
- [x] Settings Sidebar (bits-ui Slider/Switch/Collapsible)
- [x] Runtime config via WebSocket (SettingsUpdate message)
- [x] Preset system (localStorage persistence)
- [x] Lucide icons (project-wide, replacing emojis)
- [x] Documentation (README, ARCHITECTURE, subdirectory READMEs)

---

## Phase 4b: Remaining Polish

- [ ] `icaros.glb` orientation fix in IcarosPreview
- [ ] Device Orientation API Integration (real ICAROS device)
- [ ] VR Score Overlay (THREE.Sprite instead of HTML)
- [ ] Audio feedback (wind, ring pickup)
- [ ] Controller UI: Align with `UIscreen.png` design reference

## Backlog

- [ ] Room-based WebSocket pairing
- [ ] Leaderboard / score persistence
- [ ] Terrain LOD (far chunks with fewer segments)
- [ ] Draco compression for GLB

---

*Updated: 2026-01-28*
