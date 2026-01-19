# 📋 PROJECT PLAN

## 📖 Overview

**Project:** WebXR VR/AR Starter Template
**Goal:** Minimal WebXR setup for Meta Quest 3 – reusable starter for VR/AR experiments
**Stack:** Bun + Three.js + WebXR API + TypeScript
**Device:** Meta Quest 3

> 🎓 **Educational Focus:** This repository serves as a learning reference for WebXR beginners.
> See `docs/CONCEPTS.md` for fundamentals and `docs/PITFALLS.md` for common mistakes.

---

## 🚀 Phases

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

### Phase 2: AR Mode + Remote Control ✅

**Goal:** AR Passthrough + Steuerung vom Mac aus

#### 2a: AR Mode (Passthrough) ✅
- [x] `VRButton` → `ARButton` wechseln (dynamisch via `?mode=ar`)
- [x] Renderer mit `alpha: true` für Transparenz
- [x] `scene.background` entfernen (nur in AR-Modus)
- [x] Cube-Position anpassen (y=1.0 für AR, y=0 für VR)
- [x] Testen: Cube schwebt in echtem Raum ✅

#### 2b: Remote Control (WebSocket) ✅
- [x] WebSocket zu `server.ts` hinzufügen
- [x] `controller.html` mit Touch/Mouse/Keyboard-Support
- [x] Message-Handler in `main.ts`
- [x] Key-Mappings: Pfeiltasten/W/S → Position, R/G/B → Farbe
- [x] Testen: Mac-Tastatur steuert Cube auf Quest ✅

#### 2c: Polish ✅
- [x] Auto-Modus via Query Parameter (`?mode=ar` / `?mode=vr`)
- [x] UI für Verbindungsstatus (🟢/🔴)
- [x] `start.sh` Script für One-Command-Startup
- [x] Dokumentation: `docs/ARCHITECTURE.md`, `docs/TUTORIAL.md`

**Exit Criteria:** ✅
- ✅ Cube in AR sichtbar (Passthrough)
- ✅ Mac-Tastatur/Touch steuert Cube-Position und Farbe

**Docs:** `dev/RESEARCH_AR_REMOTE.md`

---

### 🔮 Phase 3: Interactivity (Future)

**Goal:** Quest Controller Support

- [ ] Controller-Modelle laden
- [ ] Raycasting für Objekt-Selektion
- [ ] Grab/Move mit Controller
- [ ] Haptic Feedback

**Exit Criteria:** Objekte mit Quest Controllern greifen und bewegen

---

## 📝 Backlog

Issues and improvements discovered during development.
**Don't fix immediately - collect here, prioritize later.**

- [ ] (empty - add issues as discovered)

---

## ✅ Completed

### Phase 0: Setup ✅

- [x] Project initialized with Bun
- [x] Three.js dependency installed
- [x] CLAUDE.md created
- [x] Workflow docs created
- [x] Development environment configured

---

## 💡 Notes

**⚠️ WebXR Gotchas:**
- HTTPS mandatory (use mkcert for local certs)
- Use `renderer.setAnimationLoop()` not `requestAnimationFrame`
- See `docs/PITFALLS.md` for common mistakes and solutions

**🔌 Büro/Firmen-Netzwerk Setup (USB-C + ADB):**
- Kein WiFi nötig! Quest verbindet über USB-C
- `adb reverse tcp:3000 tcp:3000` leitet localhost zur Quest
- Im Quest Browser: `https://localhost:3000`
- USB-C muss Datenkabel sein (nicht nur Ladekabel)

*Created: 2026-01-15 | Updated: 2026-01-19*
