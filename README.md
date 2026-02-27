# ✈️ ICAROS VR Teaching Platform

> Modular WebXR platform for **Meta Quest 3** + **ICAROS** fitness device — students build their own VR experiences

A teaching platform where students create immersive VR worlds controlled through body movement on the ICAROS fitness device. The platform provides infrastructure and prototyping tools — students focus on the creative work.

---

## 🎯 What is this?

A **teaching project** that demonstrates:
- **WebXR** — Immersive VR in the browser (no app store)
- **WebSocket communication** — Real-time data between devices
- **Three.js** — 3D graphics in JavaScript
- **GLSL Shaders** — GPU programming with instant visual feedback
- **Device sensors** — Gyroscope, accelerometer via browser APIs

The ICAROS fitness device provides body-based flight control:
- **Pitch** (lean forward/back) → experience-specific (e.g., climb / dive)
- **Roll** (lean left/right) → experience-specific (e.g., bank / turn)

---

## 🏗️ Architecture

Three layers, strict separation:

```
┌─────────────────────────────────────────────────┐
│  Experiences (student-built VR worlds)          │  ← Students build here
│  Manifest-based, modular, catalog-driven        │
├─────────────────────────────────────────────────┤
│  Prototyping Tools                              │  ← Visual controls
│  Node Editor (Eurorack metaphor)                │
│  Shader Playground (signal-based GLSL editor)   │
├─────────────────────────────────────────────────┤
│  Infrastructure                                 │  ← Platform internals
│  WebXR, WebSocket, Controllers, SvelteKit       │
└─────────────────────────────────────────────────┘
```

### Experience System

Each experience is a self-contained VR world with its own physics and parameters:
- **Manifest** — declarative I/O contract (parameters, lifecycle, scene config)
- **Catalog** — static registry, students add 1 import + 1 line
- **Loader** — manages experience lifecycle (load → tick → dispose)

### Data Flow

```
ICAROS Device → Phone (Gyro API) → WebSocket → Server (broadcast) → Quest (VR Scene)
```

All data flows through the server. No direct client-to-client communication.

---

## 🚀 Quick Start

### Prerequisites

```bash
# 1. Install Bun (runtime)
curl -fsSL https://bun.sh/install | bash

# 2. Install mkcert (HTTPS certificates)
brew install mkcert    # Mac
mkcert -install

# 3. Install ADB (Quest connection)
brew install android-platform-tools    # Mac
```

> 📖 Full setup for Windows/Linux: [docs/SETUP.md](docs/SETUP.md)

### Run the Project

```bash
# Clone & install
git clone https://github.com/dweigend/simple_flight.git
cd simple_flight
bun install

# Generate HTTPS certificates (required for WebXR)
mkcert localhost

# Start dev server
bun run dev
```

### Connect Meta Quest

```bash
# 1. Connect Quest via USB-C cable
adb devices              # Should show your device

# 2. Forward local port to Quest
adb reverse tcp:5173 tcp:5173

# 3. Open on Quest Browser
# https://localhost:5173/vr → Click "Enter VR"
```

---

## 📍 Routes

| Route | Device | Purpose |
|-------|--------|---------|
| `/` | Any | 🏠 Experience Catalog (select VR world) |
| `/vr` | Quest | 🥽 WebXR VR scene (loads active experience) |
| `/gyro` | Phone | 📱 Gyroscope controller (ICAROS) |
| `/controller` | Laptop | 🎮 D-Pad controller + Settings sidebar |
| `/node-editor` | Laptop | 🔧 Visual node editor for VR parameters |
| `/shader-playground` | Laptop | 🎨 Live GLSL shader editor with 3D preview |

---

## 📁 Project Structure

```
src/
├── routes/
│   ├── +page.svelte                 # Experience Catalog
│   ├── vr/+page.svelte              # WebXR VR scene (generic shell)
│   ├── gyro/+page.svelte            # Gyroscope controller
│   ├── controller/+page.svelte      # Desktop controller
│   ├── node-editor/+page.svelte     # Visual node editor
│   └── shader-playground/+page.svelte  # Shader Playground
│
├── lib/
│   ├── experiences/             # 🌍 VR experiences (student-built)
│   │   ├── catalog.ts           # Experience registry
│   │   ├── loader.ts            # Lifecycle management
│   │   ├── types.ts             # ExperienceManifest, ParameterDef
│   │   ├── mountain-flight/     # Reference experience
│   │   └── template/            # Copy-template for students
│   │
│   ├── three/                   # 🎮 Shared 3D building blocks
│   │   ├── scene.ts             # Scene factory (lights, fog)
│   │   ├── player.ts            # FlightPlayer (camera + physics)
│   │   ├── sky.ts               # Low-poly gradient sky
│   │   ├── clouds.ts            # Procedural cloud groups
│   │   ├── rings.ts             # Collectible rings
│   │   └── terrain/             # Chunked terrain system
│   │
│   ├── shader-playground/       # 🎨 Signal-based GLSL editor
│   │   ├── modules/             # 24 shader modules (control, vertex, fragment)
│   │   ├── components/          # Rack UI, Preview, CodeView
│   │   ├── engine/              # Compiler + Three.js renderer
│   │   └── codegen.ts           # Module chain → GLSL assembly
│   │
│   ├── node-editor/             # 🔧 Visual node editor (Eurorack architecture)
│   │   ├── components/          # Atomic signal processors
│   │   ├── nodes/               # Node compositions (modules)
│   │   ├── canvas/              # SvelteFlow infrastructure
│   │   └── graph/               # Compute engine (headless)
│   │
│   ├── ws/                      # 📡 WebSocket protocol
│   ├── gyro/                    # 📱 Device Orientation
│   ├── config/                  # ⚙️ Configuration constants
│   ├── components/              # 🎨 UI components (bits-ui)
│   └── types/                   # 📝 TypeScript interfaces
│
├── hooks.server.ts              # WebSocket upgrade handler
└── app.css                      # Global design system
```

---

## 📡 WebSocket Protocol

All messages are JSON with a `type` field for routing.

### Message Types

```typescript
// 1. Orientation data (from gyro/controller)
{ type: "orientation", pitch: number, roll: number, timestamp: number }

// 2. Speed commands (accelerate/brake buttons)
{ type: "speed", action: "accelerate" | "brake", active: boolean, timestamp: number }

// 3. Settings update (from sidebar)
{ type: "settings", settings: Record<string, number | boolean | string>, timestamp: number }
```

### Data Flow

```
┌──────────────┐     WebSocket      ┌──────────────┐     WebSocket      ┌──────────────┐
│  Controller  │ ─────────────────▶ │    Server    │ ─────────────────▶ │   VR Scene   │
│  (/gyro)     │   OrientationData  │ (broadcasts) │   OrientationData  │   (/vr)      │
└──────────────┘                    └──────────────┘                    └──────────────┘
```

---

## ⚙️ Configuration

All tuning parameters live in `src/lib/config/flight.ts`:

| Constant | Purpose |
|----------|---------|
| `FLIGHT` | Speed, physics, spawn position |
| `CONTROLS` | Input sensitivity, button mappings |
| `TERRAIN` | Chunk size, noise parameters, water level |
| `RINGS` | Collectible appearance and behavior |
| `SCENE` | Lighting, fog distances |
| `CLOUDS` | Count, height, drift speed |
| `SKY` | Gradient colors |

Parameters can also be changed live via the Settings Sidebar or controlled through the Node Editor.

---

## ✏️ For Students

### Build a New Experience

The fastest way to create your own VR world:

1. **Copy template**: `src/lib/experiences/template/` → `src/lib/experiences/my-world/`
2. **Edit manifest**: Name, parameters, scene defaults
3. **Build scene**: Three.js objects in `setup()`, animation in `tick()`
4. **Register**: Add 1 import + 1 line in `catalog.ts`
5. **Test**: `bun run dev` → Open `/vr` on Quest

> 📖 Full guide: [`src/lib/experiences/README.md`](src/lib/experiences/README.md)

### Shader Playground

Learn GLSL shaders interactively at `/shader-playground`:
- Drag modules into a rack, connect signals, see 3D results instantly
- 24 modules: color, noise, displacement, SDF, post-processing
- Modulation engine with LFO waveforms for animated effects

> 📖 Details: [`src/lib/shader-playground/README.md`](src/lib/shader-playground/README.md)

### Other Extension Points

- **New input source**: Create a route, send `OrientationData` via WebSocket
- **New output client**: Create a route, listen for WebSocket messages
- **Modify VR world**: Edit files in `src/lib/three/`
- **Node Editor**: Visually wire signal processors to VR parameters at `/node-editor`

---

## 🗺️ Roadmap

- [x] WebXR flight scene with terrain, clouds, rings
- [x] WebSocket pipeline (Controller → Server → Quest)
- [x] Node Editor — visual parameter control (Eurorack metaphor)
- [x] Experience System — modular VR worlds (manifest, catalog, loader)
- [x] Shader Playground — signal-based GLSL editor with 3D preview
- [ ] More Experiences — students build diverse VR worlds
- [ ] Shader ↔ Experience integration — use playground shaders in VR scenes
- [ ] Tutorial system — guided GLSL learning paths (3 tracks, 14 lessons)
- [ ] Audio system — spatial 3D sound for immersive experiences
- [ ] Advanced experiences — Neural Noise, Breathe, Sound Body, Swarm Mind

---

## 🛠️ Development Commands

```bash
bun run dev                            # Start HTTPS dev server
bunx biome check --write .             # Lint + format code
bunx svelte-check --threshold warning  # Type check
```

---

## ⚠️ Troubleshooting

### "WebXR not available"
- WebXR requires HTTPS — use `bun run dev` (auto-HTTPS)
- Quest Browser only, not mobile browsers

### "Connection refused" on Quest
```bash
adb reverse tcp:5173 tcp:5173   # Re-establish tunnel
adb reverse --list              # Verify tunnel exists
```

### Gyroscope not working on phone
- HTTPS required for Device Orientation API
- iOS: Settings → Safari → Motion & Orientation Access → Enable
- Some browsers need a user gesture first (tap screen)

### High latency
- Use USB connection instead of Wi-Fi
- Close other Quest browser tabs
- Check WebSocket connection in browser DevTools

---

## 🔧 Tech Stack

| Component | Tool |
|-----------|------|
| Framework | SvelteKit |
| Runtime | Bun |
| 3D Engine | Three.js |
| VR/AR | WebXR API |
| UI | bits-ui |
| Linting | Biome |

---

## 📚 More Documentation

- [**SETUP.md**](docs/SETUP.md) — Full installation guide (Windows/Linux/Mac)
- [**CUSTOMIZATION.md**](docs/CUSTOMIZATION.md) — Detailed customization guide
- [**ARCHITECTURE.md**](docs/ARCHITECTURE.md) — System design deep-dive

---

## 📄 License

MIT
