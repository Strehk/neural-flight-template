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

### Phase 2: Assets + Low-Poly Terrain 🔜

**Goal:** ICAROS GLB laden, Low-Poly Terrain im Stil der Referenzbilder

**Files:**
- `src/lib/three/terrain.ts` — Chunked procedural Low-Poly Terrain
- `src/lib/three/loader.ts` — GLTFLoader Utility
- Update `IcarosPreview.svelte` — GLTFLoader statt Placeholder

**Tasks:**
- [ ] `icaros.glb` nach `static/models/` kopieren + optimieren (Draco?)
- [ ] GLTFLoader in IcarosPreview: Ersetzt Placeholder-Box
- [ ] Low-Poly Terrain Generator:
  - Simplex-Noise Heightmap (2–3 Oktaven)
  - `flatShading: true` + Vertex-Colors (höhenbasiert, Referenz-Farben)
  - Chunked Load/Unload um Spielerposition
  - Object-Pooling für Terrain-Chunks
- [ ] Low-Poly Bäume/Felsen als InstancedMesh (Referenz: bunte Bäume)
- [ ] Wasser-Plane (Referenz: Küste + Fluss)
- [ ] 🧑‍💻 Noise-Oktaven Tuning (Amplitude, Frequenz, Persistenz)

**Art Direction (aus Referenzen):**
- Facettierte Geometrie, KEIN Smooth Shading
- Bunte Baum-Kronen (rot, orange, lila, grün) — nicht realistisch
- Weiche Hügel + dramatische Berge (Mix aus Landschaft 1+2+3)
- Wasser: flache Plane mit leichtem Blau-Gradient
- Himmel: bereits implementiert (#87ceeb + Fog)

**Performance-Budget (Quest):**
- `InstancedMesh` für alle wiederholten Objekte
- Max 500k Triangles, <100 Draw Calls
- Vertex-Colors statt Texturen = 0 VRAM für Textures

**Exit Criteria:** Low-Poly Welt mit Bäumen, Bergen und Wasser; ICAROS GLB in Preview

---

### Phase 3: Ring Course

**Goal:** Durchflieg-Ringe mit visueller Rückmeldung

**Files:**
- `src/lib/three/rings.ts` — InstancedMesh Rings + Collision

**Tasks:**
- [ ] Torus-Geometrie Ringe via `InstancedMesh`
- [ ] Ring-Platzierung entlang Terrain-Kontur
- [ ] Distanz-basierte Kollisionserkennung
- [ ] Visuelles Feedback: Farb-/Opacity-Änderung bei Durchflug
- [ ] Score-Counter + UI-Overlay
- [ ] 🧑‍💻 Kollisionslogik (Distanz-Threshold + Durchflug-Erkennung)

**Exit Criteria:** Spieler fliegt durch Ringe, visuelles Feedback + Score

---

## 📝 Backlog

- [ ] Device Orientation API Integration (echtes ICAROS)
- [ ] Audio-Feedback (Wind, Ring-Pickup)
- [ ] Room-basiertes WebSocket-Pairing
- [ ] Leaderboard / Scoring-Persistenz
- [ ] Controller UI: Orientierung an `UIscreen.png` Referenz (Activity Log, Slider, farbcodierte Status-Labels)

---

## ✅ Completed

### Pre-SvelteKit (Legacy)

- [x] Phase 1: Minimal VR Scene (cube in VR)
- [x] Phase 2: AR Mode + Remote Control
- [x] Documentation + Educational Reference

### SvelteKit

- [x] Phase 0: Types + WebSocket Infrastructure
- [x] Phase 1a: Controller UI
- [x] Phase 1b: VR Flight Scene (ohne Flight Physics)

---

*Updated: 2026-01-27*
