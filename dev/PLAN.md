# 📋 PROJECT PLAN — ICAROS VR Flight Sim

> **Prototyp-Vision:** siehe [`dev/GOAL.md`](./GOAL.md)

## Overview

**Project:** ICAROS VR Flight Simulation
**Goal:** Fly through procedural landscapes on Meta Quest, controlled by ICAROS device (pitch + roll)
**Stack:** SvelteKit + Bun + Three.js + WebXR + bits-ui + WebSocket

## Reference Assets (`assets/`)

| Asset | Purpose |
|-------|---------|
| `icaros.glb` | 3D ICAROS device model (18MB GLB) → IcarosPreview + Controller UI |
| `Landschaft_1.png` | Low-Poly Wald/Fluss/Wasserfälle — Terrain-Stil Referenz |
| `Landschaft_2.png` | Low-Poly Berge/Hügel/Bäume — Terrain-Stil Referenz |
| `Landschaft_3.png` | Low-Poly Küste/Berge/Ozean — Terrain-Stil Referenz |
| `UIscreen.png` | Design System Spec — Brutalist UI Referenz |

**Art Direction:** Low-Poly, facettiert, `flatShading: true`, Vertex-Colors, bunte stilisierte Farben, keine Texturen

## Dependencies

```bash
# David installiert:
bun add three simplex-noise
bun add -d @types/three
```

---

## 🚀 Phases

### ~~Phase 0: Foundation (Types + WebSocket)~~ ✅

- [x] Types: `OrientationData`, `SpeedCommand`, `ControllerMessage`
- [x] WebSocket Client (Svelte 5 `$state`, Auto-Reconnect)
- [x] WebSocket Server (Broadcast, Sender-Exclusion)
- [x] Vite Plugin: `ws` Library, HTTPS, `host: true`

---

### ~~Phase 1a: Controller UI~~ ✅

- [x] `src/app.css` — Brutalist Dark Theme (Custom Properties, Google Fonts)
- [x] `src/routes/controller/+page.svelte` — Controller Layout + WS Integration
- [x] `src/lib/components/ControlPad.svelte` — D-Pad + Arrow Keys
- [x] `src/lib/components/SpeedButtons.svelte` — Accelerate/Brake
- [x] `src/lib/components/IcarosPreview.svelte` — 3D Preview (Placeholder-Box)

---

### ~~Phase 1b: VR Flight Scene~~ ✅

- [x] `src/routes/vr/+page.svelte` — Full-Screen Canvas, WebXR, VRButton
- [x] `src/lib/three/scene.ts` — Scene Factory (Sky, Fog, Lights)
- [x] `src/lib/three/player.ts` — FlightPlayer Class (Rig + Camera + Lerp)
- [x] `player.ts` → `tick()` — Heading-basierte Flugphysik (Achsen-Entkopplung)

---

### ~~Phase 2: Low-Poly Terrain + Assets~~ ✅

- [x] Chunked procedural Low-Poly Terrain (Simplex-Noise, 5 Oktaven)
- [x] `flatShading: true` + Vertex-Colors (höhenbasiert, 32 Segments = sichtbare Facetten)
- [x] Chunked Load/Unload um Spielerposition + Object-Pooling
- [x] Low-Poly Bäume/Felsen als InstancedMesh pro Chunk (10 Baumfarben)
- [x] Wasser-Plane (halbtransparent, blaue Fläche)
- [x] Low-Poly Sky Dome (IcosahedronGeometry, Vertex-Color-Gradient)
- [x] Low-Poly Wolken (40 Gruppen, DodecahedronGeometry-Blobs)
- [x] Hartes Sonnenlicht (SUN: 3.0, AMBIENT: 0.3, warme Farbe)
- [x] GLTFLoader Utility (`src/lib/three/loader.ts`)

---

### ~~Phase 3: Ring Course~~ ✅

- [x] Torus-Geometrie Ringe pro Chunk (chunk-basiert, seeded random)
- [x] Ring-Platzierung entlang Terrain-Kontur (Höhe über Terrain)
- [x] Distanz-basierte Kollisionserkennung
- [x] Visuelles Feedback: Farb-/Emissive-Änderung bei Durchflug
- [x] Score-Counter + UI-Overlay

---

### Phase 4: Polish + ICAROS Integration 🔜

**Goal:** ICAROS GLB in Preview, Device Orientation, Audio

**Tasks:**
- [ ] `icaros.glb` nach `static/models/` + GLTFLoader in IcarosPreview
- [ ] Device Orientation API Integration (echtes ICAROS-Gerät)
- [ ] VR Score Overlay (THREE.Sprite oder Text-Mesh statt HTML)
- [ ] Audio-Feedback (Wind, Ring-Pickup)
- [ ] Wolken-Drift (langsame Bewegung)
- [ ] Controller UI: Orientierung an `UIscreen.png` Referenz

---

## 📝 Backlog

- [ ] Room-basiertes WebSocket-Pairing
- [ ] Leaderboard / Scoring-Persistenz
- [ ] Terrain LOD (Fern-Chunks mit weniger Segments)
- [ ] Draco-Kompression für GLB

---

## ✅ Completed

### Pre-SvelteKit (Legacy)

- [x] Phase 1: Minimal VR Scene (cube in VR)
- [x] Phase 2: AR Mode + Remote Control
- [x] Documentation + Educational Reference

### SvelteKit

- [x] Phase 0: Types + WebSocket Infrastructure
- [x] Phase 1a: Controller UI
- [x] Phase 1b: VR Flight Scene
- [x] Phase 2: Low-Poly Terrain + Assets
- [x] Phase 3: Ring Course

---

*Updated: 2026-01-27*
