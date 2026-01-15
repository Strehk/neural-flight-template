# WebXR VR/AR Starter Template

Meta Quest 3 WebXR development template with Three.js and Bun.

## Project Info

**Goal:** Minimal WebXR setup for Meta Quest 3 – a reusable starter for VR/AR experiments
**Stack:** Bun + Three.js + WebXR API + TypeScript
**Device:** Meta Quest 3

## Quick Start

```bash
# Install dependencies
bun install

# Generate HTTPS certs (required for WebXR)
bunx mkcert localhost

# Start dev server
bun --hot ./server.ts

# Access from Quest: https://[YOUR_IP]:3000
```

## Commands

```bash
# Dev server with HMR
bun --hot ./server.ts

# Lint + Format
bunx biome check --write .

# Type check
bunx tsc --noEmit

# Quality check (all)
bunx biome check --write . && bunx tsc --noEmit
```

## Quest 3 Connection

### Option 1: USB-C + ADB ⭐ EMPFOHLEN (Büro/Firmen-Netzwerk)

Kein WiFi nötig! Ideal wenn Quest nicht ins Netzwerk kann.

```bash
# 1. ADB installieren (einmalig)
brew install android-platform-tools

# 2. Quest verbinden (USB-C Datenkabel!)
# → Developer Mode muss auf Quest aktiviert sein (Meta App → Einstellungen → Developer)
# → "Allow USB Debugging" auf Quest bestätigen

# 3. Verbindung prüfen
adb devices
# Sollte Quest anzeigen

# 4. Port forwarding einrichten
adb reverse tcp:3000 tcp:3000

# 5. Server starten
bun --hot ./server.ts

# 6. Im Quest Browser öffnen:
# https://localhost:3000
```

### Option 2: WiFi (gleiches Netzwerk)

Wenn beide Geräte im selben Netzwerk sind:

```bash
# IP finden
ipconfig getifaddr en0

# Im Quest Browser öffnen:
# https://[DEINE_IP]:3000
# → Self-signed Cert Warning akzeptieren
```

## Critical: WebXR Requirements

⚠️ **HTTPS ist Pflicht** für WebXR! Entweder `localhost` oder HTTPS mit Zertifikaten.

## Project Structure

```
├── server.ts          # Bun.serve() with HTTPS
├── index.html         # Entry HTML
├── src/
│   ├── main.ts        # Three.js scene + WebXR setup
│   └── types/         # TypeScript interfaces
├── dev/               # Development docs
│   ├── WORKFLOW.md    # Development steps
│   ├── PLAN.md        # Project phases
│   └── HANDOVER.md    # Session notes
```

## Rules

- See `.claude/rules/webxr-typescript.md` for WebXR patterns
- Use `renderer.setAnimationLoop()` NOT `requestAnimationFrame`
- Use Three.js examples/jsm for VRButton, controllers, etc.
- Biome for linting (not ESLint)
- Bun.serve() for server (not Vite/Express)

## Three.js WebXR Pattern

```typescript
import * as THREE from "three";
import { VRButton } from "three/examples/jsm/webxr/VRButton.js";

renderer.xr.enabled = true;
document.body.appendChild(VRButton.createButton(renderer));
renderer.setAnimationLoop(render);
```

## Docs

- [Three.js WebXR](https://threejs.org/docs/#manual/en/introduction/How-to-create-VR-content)
- [WebXR Device API](https://developer.mozilla.org/en-US/docs/Web/API/WebXR_Device_API)
- [Bun.serve() Docs](https://bun.sh/docs/api/http)
