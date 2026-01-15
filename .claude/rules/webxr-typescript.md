# WebXR + Three.js Development Rules

## Decision Tree (ALWAYS FOLLOW!)

```
1. Does this already exist in the codebase? → USE IT
2. Does Three.js have a built-in for this? → USE IT
3. Is there an example in Three.js/examples? → ADAPT IT
4. Only as LAST RESORT → Write custom code
```

## Principles

- **KISS** - Simplest solution wins
- **Separation of Concerns** - Scene setup / Logic / UI separate
- **Single Responsibility** - One function = one purpose
- **Early Returns** - Validate first, exit early
- **Functions < 20 lines** - Break down complex logic
- **Self-documenting names** - Clear names over comments
- **Explicit types** - No `any`, always interfaces

## Tech Stack

| Component | Tool | Replaces |
|-----------|------|----------|
| Runtime & Package Manager | **Bun** | Node.js, npm |
| Server | **Bun.serve()** | Express, Vite |
| 3D Engine | **Three.js** | - |
| VR/AR | **WebXR API** | - |
| Linting & Formatting | **Biome** | ESLint, Prettier |
| Type Checking | **TypeScript** | - |

## Commands

```bash
# Dev server (HTTPS required for WebXR!)
bun --hot ./server.ts

# Lint + Format
bunx biome check --write .

# Type check
bunx tsc --noEmit

# One-liner quality check
bunx biome check --write . && bunx tsc --noEmit
```

## WebXR Critical Requirements

### HTTPS is MANDATORY

WebXR only works over:
- `https://` (production)
- `localhost` (development)

Bun.serve() HTTPS setup:
```typescript
Bun.serve({
  port: 3000,
  tls: {
    key: Bun.file("localhost-key.pem"),
    cert: Bun.file("localhost.pem"),
  },
  // ...
});
```

Generate local certs with mkcert:
```bash
bunx mkcert localhost
```

### Meta Quest Browser Access

#### Option 1: USB-C + ADB (no WiFi needed) ⭐

Best for corporate networks where Quest can't connect:

```bash
# Install ADB (once)
brew install android-platform-tools

# Enable Developer Mode on Quest (via Meta app on phone)
# Connect USB-C data cable (not charge-only!)
# Accept "Allow USB Debugging" prompt on Quest

# Verify connection
adb devices

# Forward port (run before each session)
adb reverse tcp:3000 tcp:3000

# Start server
bun --hot ./server.ts

# Open in Quest Browser: https://localhost:3000
```

#### Option 2: WiFi (same network)

1. Both devices on same network
2. Find your IP: `ipconfig getifaddr en0`
3. Access via `https://[YOUR_IP]:3000` in Quest browser
4. Accept self-signed cert warning

## Three.js WebXR Pattern

```typescript
import * as THREE from "three";
import { VRButton } from "three/examples/jsm/webxr/VRButton.js";

// Scene setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });

// Enable WebXR
renderer.xr.enabled = true;
document.body.appendChild(VRButton.createButton(renderer));

// Animation loop (WebXR-compatible)
renderer.setAnimationLoop(() => {
  renderer.render(scene, camera);
});
```

## Project Structure

```
project/
├── server.ts          # Bun.serve() with HTTPS
├── index.html         # Entry point
├── src/
│   ├── main.ts        # Three.js scene setup
│   ├── scene/         # Scene objects
│   ├── xr/            # WebXR utilities
│   └── types/         # TypeScript interfaces
```

## NEVER

- ❌ Use `any` type
- ❌ Use HTTP for WebXR (must be HTTPS/localhost)
- ❌ Use `requestAnimationFrame` (use `renderer.setAnimationLoop`)
- ❌ Skip the VRButton for VR entry
- ❌ ESLint/Prettier (use Biome)
- ❌ Vite/Webpack (use Bun.serve() with HTML imports)

## Three.js Import Patterns

```typescript
// Core
import * as THREE from "three";

// Examples/addons - use specific imports
import { VRButton } from "three/examples/jsm/webxr/VRButton.js";
import { XRControllerModelFactory } from "three/examples/jsm/webxr/XRControllerModelFactory.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
```

*Updated: 2026-01-15*
