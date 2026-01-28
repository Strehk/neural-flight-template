# ✈️ ICAROS VR Flight Sim

VR flight simulation for **Meta Quest 3** controlled by the **ICAROS** fitness device. Fly through procedural low-poly landscapes using body-based pitch and roll input.

<!-- TODO: Screenshot/GIF here -->

## Quick Start

```bash
bun install
bun run dev
```

### Quest via USB (recommended)

```bash
adb devices
adb reverse tcp:5173 tcp:5173
# Quest Browser → https://localhost:5173/vr
# Phone/Laptop → https://localhost:5173/controller
```

## Routes

| Route | Purpose |
|-------|---------|
| `/vr` | 🥽 WebXR flight scene (Three.js + VR) |
| `/controller` | 🎮 ICAROS controller UI (D-Pad, speed, 3D preview) |

## Architecture

```
Phone/ICAROS ──→ Controller UI ──→ WebSocket ──→ VR Scene (Quest)
               (pitch + roll)    (SvelteKit)   (Three.js + WebXR)
```

The controller captures orientation input and sends it via WebSocket to the VR scene running on the Quest. All flight physics, terrain generation, and rendering happen client-side.

→ See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the full system design.

## Project Structure

```
src/
├── routes/vr/              # WebXR flight scene
├── routes/controller/      # ICAROS controller UI
├── lib/three/              # Three.js modules (scene, player, sky, clouds, terrain/)
├── lib/ws/                 # WebSocket client + server + protocol
├── lib/components/         # Svelte UI components
├── lib/config/             # All tuning constants
└── lib/types/              # TypeScript interfaces
```

## Tech Stack

| Component | Tool |
|-----------|------|
| Framework | SvelteKit |
| Runtime | Bun |
| 3D Engine | Three.js |
| VR/AR | WebXR API |
| UI | bits-ui |
| Linting | Biome |

## Scripts

```bash
bun run dev                          # Dev server (HTTPS)
bunx biome check --write .           # Lint + format
bunx svelte-check --threshold warning  # Type check
```

## ICAROS Concept

The ICAROS fitness device provides body-based input:
- **Pitch** (forward/back lean) → altitude / speed
- **Roll** (left/right lean) → banking / turning

Data flow: ICAROS → Phone (Device Orientation API) → WebSocket → Quest (flight controls)
