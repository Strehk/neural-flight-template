# PROJECT PLAN

## Overview

**Project:** WebXR VR/AR Starter Template
**Goal:** Minimal WebXR setup for Meta Quest 3 – reusable starter for VR/AR experiments
**Stack:** Bun + Three.js + WebXR API + TypeScript
**Device:** Meta Quest 3

---

## Phases

### Phase 1: Minimal VR Scene

**Goal:** Display a simple cube in VR on Meta Quest 3

**Pre-requisites:**
- [ ] Install ADB: `brew install android-platform-tools`
- [ ] Enable Developer Mode on Quest (via Meta App)
- [ ] Connect Quest via USB-C (data cable!)
- [ ] Verify: `adb devices` shows Quest

**Implementation:**
- [ ] Set up HTTPS server with Bun.serve()
- [ ] Generate SSL certs: `bunx mkcert localhost`
- [ ] Create minimal index.html with Three.js
- [ ] Implement basic scene with rotating cube
- [ ] Add VRButton for WebXR entry

**Testing:**
- [ ] `adb reverse tcp:3000 tcp:3000`
- [ ] Start server: `bun --hot ./server.ts`
- [ ] Open `https://localhost:3000` in Quest Browser
- [ ] Click "Enter VR" and verify cube in VR

**Exit Criteria:** Can view rotating cube in VR on Quest 3 via USB-C

---

### Phase 2: Template Polish

**Goal:** Make this a reusable starter template

- [ ] Add proper TypeScript types
- [ ] Structure code for extensibility
- [ ] Add controller support (optional)
- [ ] Document setup process in README
- [ ] Add development scripts to package.json

**Exit Criteria:** Clone-ready template with clear documentation

---

### Phase 3: AR Foundation (Future)

**Goal:** Add AR capabilities

- [ ] Research AR session types
- [ ] Implement hit testing
- [ ] Add plane detection
- [ ] Test passthrough on Quest 3

**Exit Criteria:** Working AR demo with passthrough

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
