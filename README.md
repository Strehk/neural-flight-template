# ✈️ ICAROS VR Starter

> WebXR flight simulation template for **Meta Quest** + **ICAROS** fitness device

Fly through procedural low-poly landscapes using body-based pitch and roll input. This starter provides a complete WebSocket pipeline, terrain generation, and flight physics — ready to customize.

<!-- TODO: Screenshot/GIF here -->

## 📍 Routes

| Route | Device | Purpose |
|-------|--------|---------|
| `/vr` | Quest | 🥽 WebXR flight scene (Three.js + VR) |
| `/controller` | Laptop/Tablet | 🎮 D-Pad controls + Settings sidebar |
| `/gyro` | Phone | 📱 Gyroscope controls (real ICAROS) |

## ✅ What's Included

- **WebSocket Pipeline** — Controller → Server → Quest (30Hz orientation data)
- **WebXR Setup** — Meta Quest-optimized Three.js renderer
- **Procedural Terrain** — Chunked heightmap with trees, rocks, water
- **Flight Physics** — Arcade-style pitch/roll controls with speed modes
- **Settings Sidebar** — Live parameter tuning (fog, clouds, terrain, etc.)
- **Ring Collectibles** — Scoring system with per-chunk spawning
- **Gyroscope Controller** — Device Orientation API with calibration

## 🎨 What You Customize

| File | Purpose |
|------|---------|
| `src/lib/config/flight.ts` | Tuning parameters (speed, terrain, colors, etc.) |
| `src/lib/three/` | VR world components (sky, clouds, terrain, player) |
| `src/lib/three/terrain/` | Heightmap generation, decorations, water |
| `src/routes/vr/+page.svelte` | Main VR scene composition |

## 🚀 Quick Start

```bash
bun install
bun run dev
```

### Connect Quest via USB (Recommended)

```bash
adb devices                        # Verify Quest connected
adb reverse tcp:5173 tcp:5173      # Tunnel local server to Quest
```

Then open on Quest Browser:
- **VR Scene**: `https://localhost:5173/vr` → Enter VR
- **Controller**: `https://localhost:5173/controller` (on laptop)
- **Gyro Controller**: `https://<network-ip>:5173/gyro` (on phone, same WiFi)

> 📖 **Full setup guide**: [docs/SETUP.md](docs/SETUP.md)

## 📁 Project Structure

```
src/
├── routes/
│   ├── vr/+page.svelte          # WebXR flight scene
│   ├── controller/+page.svelte  # Touch controller UI
│   └── gyro/+page.svelte        # Gyroscope controller UI
├── lib/
│   ├── three/                   # Three.js modules
│   │   ├── scene.ts             # Scene factory (lights, fog)
│   │   ├── player.ts            # FlightPlayer (camera rig + physics)
│   │   ├── sky.ts               # Low-poly sky dome
│   │   ├── clouds.ts            # Procedural cloud groups
│   │   ├── rings.ts             # Collectible rings
│   │   └── terrain/             # Chunked terrain system
│   ├── gyro/                    # Device Orientation API
│   │   ├── orientation.svelte.ts # Gyro hook (Svelte 5 runes)
│   │   └── calibration.ts       # Calibration + localStorage
│   ├── ws/                      # WebSocket (client + server + protocol)
│   ├── config/                  # All tuning constants
│   ├── components/              # Svelte UI (bits-ui)
│   └── types/                   # TypeScript interfaces
└── hooks.server.ts              # WebSocket upgrade handler
```

## 🛠️ Tech Stack

| Component | Tool |
|-----------|------|
| Framework | SvelteKit |
| Runtime | Bun |
| 3D Engine | Three.js |
| VR/AR | WebXR API |
| UI | bits-ui |
| Linting | Biome |

## 📚 Documentation

- [**SETUP.md**](docs/SETUP.md) — Prerequisites, HTTPS certs, ADB, troubleshooting
- [**CUSTOMIZATION.md**](docs/CUSTOMIZATION.md) — How to modify the VR world
- [**ARCHITECTURE.md**](docs/ARCHITECTURE.md) — System design and data flow
- [**AGENTS.md**](AGENTS.md) — AI-assisted development guide

## 🎮 ICAROS Concept

The ICAROS fitness device provides body-based input:

- **Pitch** (forward/back lean) → altitude / speed
- **Roll** (left/right lean) → banking / turning

### Input Options

**Option 1: Touch Controller** (`/controller`)
```
D-Pad / Arrow Keys → WebSocket → Quest (flight controls)
```

**Option 2: Gyroscope Controller** (`/gyro`)
```
Phone on ICAROS → Device Orientation API → Calibration → WebSocket → Quest
```

The gyro controller maps:
- `beta` (device tilt forward/back) → pitch
- `gamma` (device tilt left/right) → roll

## 📜 Scripts

```bash
bun run dev                            # Dev server (HTTPS)
bunx biome check --write .             # Lint + format
bunx svelte-check --threshold warning  # Type check
```

## 📄 License

MIT
