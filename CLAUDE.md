# ✈️ ICAROS VR Flight Sim

## Project Info

**Goal:** VR flight simulation for Meta Quest controlled by ICAROS device (pitch + roll → flight)
**Stack:** SvelteKit + Bun + Three.js + WebXR + bits-ui + WebSocket
**Device:** Meta Quest 3 + ICAROS fitness device

## Quick Start

```bash
bun install
bun run dev          # SvelteKit dev server (HTTPS)
bunx biome check --write .
bunx svelte-check --threshold warning
```

## Routes

| Route | Purpose |
|-------|---------|
| `/vr` | 🥽 WebXR flight scene (Three.js + VR) |
| `/controller` | 🎮 ICAROS controller UI (bits-ui, sends pitch/roll via WebSocket) |

## Module Structure

```
src/
├── routes/
│   ├── vr/+page.svelte          # VR flight scene
│   └── controller/+page.svelte  # ICAROS controller UI
├── lib/
│   ├── three/                   # Three.js scene, terrain, rings, player
│   ├── ws/                      # WebSocket client + server utilities
│   ├── components/              # Svelte UI components (bits-ui based)
│   └── types/                   # Shared TypeScript interfaces
├── hooks.server.ts              # WebSocket upgrade handler
└── app.html
```

## ICAROS Concept

The ICAROS fitness device provides body-based input:
- **Pitch** (forward/back lean) → altitude / speed control
- **Roll** (left/right lean) → banking / turning

Data flows: ICAROS → Phone (Device Orientation API) → WebSocket → Quest (flight controls)

## Quest Connection

```bash
# USB-C + ADB (recommended)
adb devices
adb reverse tcp:5173 tcp:5173
bun run dev
# Quest Browser: https://localhost:5173/vr
```

## Workflow

Claude implements everything autonomously: code, dependencies (`bun add`), linting, type-checking, testing.
David decides architecture and strategy — Claude asks when trade-offs or design direction need input.

## Rules

See `.claude/rules/sveltekit-webxr.md` for:
- SvelteKit + Three.js patterns
- WebSocket protocol (OrientationData)
- Quest performance budget
- Decision tree
