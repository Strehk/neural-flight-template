# WebXR Development Tutorial

A step-by-step guide to understanding and extending this WebXR starter template.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Project Setup](#project-setup)
3. [Understanding the Architecture](#understanding-the-architecture)
4. [Running Your First Session](#running-your-first-session)
5. [Adding New Features](#adding-new-features)
6. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software

| Software | Installation | Purpose |
|----------|--------------|---------|
| **Bun** | `curl -fsSL https://bun.sh/install \| bash` | JavaScript runtime |
| **ADB** | `brew install android-platform-tools` | Quest connection |
| **mkcert** | Installed via Bun (`bunx mkcert`) | HTTPS certificates |

### Meta Quest Setup

1. **Enable Developer Mode:**
   - Install Meta app on your phone
   - Go to Settings → Developer → Enable Developer Mode
   - Create/link a Meta developer account if prompted

2. **Connect via USB-C:**
   - Use a **data cable** (not charge-only)
   - Accept "Allow USB Debugging" prompt on Quest
   - Verify: `adb devices` should show your Quest

---

## Project Setup

### Step 1: Clone and Install

```bash
# Clone the template
git clone <repository-url> my-webxr-project
cd my-webxr-project

# Install dependencies
bun install
```

### Step 2: Generate HTTPS Certificates

WebXR requires HTTPS. Generate local certificates:

```bash
bunx mkcert localhost
```

This creates:
- `localhost.pem` - Certificate
- `localhost-key.pem` - Private key

### Step 3: Verify Installation

```bash
# Check all dependencies
bun --version        # Should show 1.x
adb devices          # Should show Quest if connected
ls localhost*.pem    # Should show both certificate files
```

---

## Understanding the Architecture

### The Three Components

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Controller    │────▶│     Server      │────▶│     Quest       │
│  (Mac Browser)  │     │   (Bun HTTPS)   │     │  (VR/AR Scene)  │
└─────────────────┘     └─────────────────┘     └─────────────────┘
  controller.html         server.ts           index.html + main.ts
```

### How They Communicate

1. **Controller** sends JSON commands via WebSocket
2. **Server** receives and broadcasts to all other clients
3. **Quest** receives commands and updates the 3D scene

### Key Files Explained

| File | Purpose |
|------|---------|
| `server.ts` | HTTPS server + WebSocket hub + TypeScript transpiler |
| `index.html` | Entry point for VR/AR scene, loads main.ts |
| `src/main.ts` | Three.js scene setup + command handler |
| `controller.html` | Touch/keyboard UI for remote control |
| `start.sh` | One-command startup script |

---

## Running Your First Session

### Method 1: Automated (Recommended)

```bash
./start.sh vr
```

This will:
1. Setup ADB port forwarding
2. Start the HTTPS server
3. Open controller in Mac browser
4. Launch Quest browser with the scene URL

### Method 2: Manual

```bash
# Terminal 1: Start server
bun --hot ./server.ts

# Terminal 2: Setup Quest connection
adb reverse tcp:3000 tcp:3000

# On Mac: Open controller
open https://localhost:3000/controller.html

# On Quest: Open browser and navigate to
# https://localhost:3000/?mode=vr
```

### Verify It Works

1. **Controller** should show "🟢 Connected"
2. **Quest scene** should show a rotating green cube
3. **Click arrow buttons** → cube should move
4. **Click color buttons** → cube should change color

---

## Adding New Features

### Example 1: Add Rotation Speed Control

Let's add a slider to control cube rotation speed.

#### Step 1: Define the Command Type

In `src/main.ts`, add a new command interface:

```typescript
interface RotationCommand {
  type: "rotation";
  speed: number;  // 0.0 to 0.1
}

type Command = MoveCommand | ColorCommand | RotationCommand;
```

#### Step 2: Add State Variable

```typescript
// At the top of main.ts, after imports
let rotationSpeed = 0.01;
```

#### Step 3: Handle the Command

Update `handleCommand`:

```typescript
function handleCommand(cmd: Command): void {
  switch (cmd.type) {
    case "move":
      cube.position[cmd.axis] += cmd.value;
      break;
    case "color":
      material.color.setHex(COLOR_MAP[cmd.color] ?? 0x00ff88);
      break;
    case "rotation":
      rotationSpeed = cmd.speed;
      break;
  }
}
```

#### Step 4: Use the Variable

Update the animation loop:

```typescript
renderer.setAnimationLoop(() => {
  cube.rotation.x += rotationSpeed;
  cube.rotation.y += rotationSpeed;
  renderer.render(scene, camera);
});
```

#### Step 5: Add UI Control

In `controller.html`, add a slider:

```html
<div class="slider-section">
  <label>Rotation Speed</label>
  <input type="range" id="rotation-slider" min="0" max="10" value="1">
</div>
```

And the JavaScript:

```javascript
document.getElementById('rotation-slider').addEventListener('input', (e) => {
  const speed = e.target.value / 100;  // 0.0 to 0.1
  sendCommand({ type: "rotation", speed });
});
```

### Example 2: Add a Reset Button

#### In controller.html:

```html
<button class="btn reset" data-action="reset">Reset</button>
```

```javascript
const actions = {
  // ... existing actions
  "reset": () => sendCommand({ type: "reset" }),
};
```

#### In src/main.ts:

```typescript
interface ResetCommand {
  type: "reset";
}

type Command = MoveCommand | ColorCommand | ResetCommand;

function handleCommand(cmd: Command): void {
  switch (cmd.type) {
    // ... existing cases
    case "reset":
      cube.position.set(0, mode === "ar" ? 1.0 : 0, -2);
      material.color.setHex(0x00ff88);
      break;
  }
}
```

---

## Troubleshooting

### "Disconnected" Status

**Symptoms:** Controller or Quest shows "🔴 Disconnected"

**Solutions:**
1. Verify server is running: `lsof -i :3000`
2. Check ADB connection: `adb devices`
3. Re-run port forwarding: `adb reverse tcp:3000 tcp:3000`
4. Restart server: Kill existing and run `bun --hot ./server.ts`

### Quest Browser Shows Security Warning

**Symptoms:** "Your connection is not private" error

**Solutions:**
1. This is expected with self-signed certificates
2. Click "Advanced" → "Proceed to localhost"
3. Or use mkcert to trust the certificate system-wide

### TypeScript Errors in Browser

**Symptoms:** Console shows "Unexpected token ':'" or similar

**Cause:** Server isn't transpiling TypeScript

**Solutions:**
1. Verify `Bun.Transpiler` is configured in server.ts
2. Check file extension is `.ts` not `.js`
3. Restart server to pick up changes

### WebXR Not Available

**Symptoms:** VR/AR button disabled or not showing

**Solutions:**
1. Ensure using HTTPS (not HTTP)
2. Check Quest is in Developer Mode
3. Try refreshing the page in Quest browser
4. Verify WebXR is supported: `navigator.xr` in console

### ADB Device Not Found

**Symptoms:** `adb devices` shows no devices

**Solutions:**
1. Check USB cable is data-capable (not charge-only)
2. Accept USB debugging prompt on Quest
3. Try different USB port
4. Restart ADB: `adb kill-server && adb start-server`

### Port Already in Use

**Symptoms:** "EADDRINUSE" error when starting server

**Solutions:**
```bash
# Find and kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Then restart server
bun --hot ./server.ts
```

---

## Best Practices

### Development Workflow

1. **Always use hot reload:** `bun --hot ./server.ts`
2. **Keep Quest connected via USB** for fastest iteration
3. **Use controller.html** to test commands before wearing headset
4. **Check server console** for WebSocket messages

### Code Quality

```bash
# Before committing
bunx biome check --write .   # Lint + format
bunx tsc --noEmit            # Type check
```

### Git Commits

```bash
git add -A
git commit -m "feat: ✨ add rotation speed control"
```

Commit types:
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation
- `refactor:` Code restructure
- `chore:` Maintenance

---

## Next Steps

- [ ] Add Quest controller input (hand tracking)
- [ ] Implement multi-object scenes
- [ ] Add spatial audio
- [ ] Create persistent state (save/load)
- [ ] Deploy to public HTTPS server

---

## Resources

- [Three.js Documentation](https://threejs.org/docs/)
- [WebXR Device API](https://developer.mozilla.org/en-US/docs/Web/API/WebXR_Device_API)
- [Bun Documentation](https://bun.sh/docs)
- [Meta Quest Developer](https://developer.oculus.com/)
