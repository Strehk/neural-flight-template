# PROJECT PLAN

## Overview

**Project:** WebXR VR/AR Starter Template
**Goal:** Minimal WebXR setup for Meta Quest 3 – reusable starter for VR/AR experiments
**Stack:** Bun + Three.js + WebXR API + TypeScript
**Device:** Meta Quest 3

---

## Phases

### Phase 1: Minimal VR Scene ✅

**Goal:** Display a simple cube in VR on Meta Quest 3

**Pre-requisites:**
- [x] Install ADB: `brew install android-platform-tools`
- [x] Enable Developer Mode on Quest (via Meta App)
- [x] Connect Quest via USB-C (data cable!)
- [x] Verify: `adb devices` shows Quest

**Implementation:**
- [x] Set up HTTPS server with Bun.serve()
- [x] Generate SSL certs: `bunx mkcert localhost`
- [x] Create minimal index.html with Three.js
- [x] Implement basic scene with rotating cube
- [x] Add VRButton for WebXR entry

**Testing:**
- [x] `adb reverse tcp:3000 tcp:3000`
- [x] Start server: `bun --hot ./server.ts`
- [x] Open `https://localhost:3000` in Quest Browser
- [x] Grüner Cube sichtbar ✅

**Exit Criteria:** ✅ Can view rotating cube in VR on Quest 3 via USB-C

---

### Phase 2: AR Mode + Remote Control

**Goal:** AR Passthrough + Steuerung vom Mac aus

#### 2a: AR Mode (Passthrough)
- [ ] `VRButton` → `ARButton` wechseln
- [ ] Renderer mit `alpha: true` für Transparenz
- [ ] `scene.background` entfernen
- [ ] Cube-Position anpassen (1-2m vor Kamera)
- [ ] Testen: Cube schwebt in echtem Raum

#### 2b: Remote Control (WebSocket)
- [ ] WebSocket zu `server.ts` hinzufügen
- [ ] Keyboard-Listener auf Server (Arrow Keys)
- [ ] Message-Handler in `main.ts`
- [ ] Key-Mappings: Pfeiltasten → Position, R/G/B → Farbe
- [ ] Testen: Mac-Tastatur steuert Cube auf Quest

#### 2c: Polish
- [ ] Auto-AR via Query Parameter (`?mode=ar`)
- [ ] UI für Verbindungsstatus
- [ ] Refactor: Scene-Setup auslagern

**Exit Criteria:**
- Cube in AR sichtbar (Passthrough)
- Mac-Tastatur steuert Cube-Position und Farbe

**Docs:** `dev/RESEARCH_AR_REMOTE.md`

---

### Phase 3: Interactivity (Future)

**Goal:** Quest Controller Support

- [ ] Controller-Modelle laden
- [ ] Raycasting für Objekt-Selektion
- [ ] Grab/Move mit Controller
- [ ] Haptic Feedback

**Exit Criteria:** Objekte mit Quest Controllern greifen und bewegen

---

## Backlog

Issues and improvements discovered during development.
**Don't fix immediately - collect here, prioritize later.**

- [ ] (empty - add issues as discovered)

---

## Completed

### Phase 0: Setup ✅

- [x] Project initialized with Bun
- [x] Three.js dependency installed
- [x] CLAUDE.md created
- [x] Workflow docs created
- [x] Development environment configured

---

## Notes

**WebXR Gotchas:**
- HTTPS mandatory (use mkcert for local certs)
- Use `renderer.setAnimationLoop()` not `requestAnimationFrame`

**Büro/Firmen-Netzwerk Setup (USB-C + ADB):**
- Kein WiFi nötig! Quest verbindet über USB-C
- `adb reverse tcp:3000 tcp:3000` leitet localhost zur Quest
- Im Quest Browser: `https://localhost:3000`
- USB-C muss Datenkabel sein (nicht nur Ladekabel)

*Created: 2026-01-15*
