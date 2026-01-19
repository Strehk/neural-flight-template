# Research: AR Mode & Remote Control

Recherche-Ergebnisse für WebXR AR-Features und Remote-Control auf Meta Quest 3.

---

## 1. AR-Mode (Passthrough) in WebXR

### Kernprinzip

Statt `VRButton` verwendet man `ARButton` für immersive-ar Sessions:

```typescript
import { ARButton } from "three/examples/jsm/webxr/ARButton.js";

// Renderer mit Transparenz für Passthrough
const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: true  // ⚠️ WICHTIG für Passthrough!
});

renderer.xr.enabled = true;

// ARButton statt VRButton
document.body.appendChild(
  ARButton.createButton(renderer, {
    requiredFeatures: ['hit-test']  // Optional: Surface-Erkennung
  })
);
```

### Wichtige Unterschiede VR vs AR

| Aspekt | VR (immersive-vr) | AR (immersive-ar) |
|--------|-------------------|-------------------|
| Button | `VRButton` | `ARButton` |
| Renderer alpha | `false` | `true` ⚠️ |
| Hintergrund | Scene background | Passthrough (transparent) |
| Kamera | Scene-controlled | WebXR-controlled |

### Kamera in AR

```typescript
// In AR: Kamera wird von WebXR gesteuert!
camera.matrixAutoUpdate = false;

// Im Animation Loop:
renderer.setAnimationLoop((time, frame) => {
  if (frame) {
    const pose = frame.getViewerPose(referenceSpace);
    if (pose) {
      // WebXR liefert die Kamera-Matrix
      camera.matrix.fromArray(pose.views[0].transform.matrix);
      camera.updateMatrixWorld(true);
    }
  }
  renderer.render(scene, camera);
});
```

### Code-Beispiel: Minimal AR Scene

```typescript
import * as THREE from "three";
import { ARButton } from "three/examples/jsm/webxr/ARButton.js";

const scene = new THREE.Scene();
// KEIN scene.background für Passthrough!

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;
document.body.appendChild(renderer.domElement);

// AR Button
document.body.appendChild(ARButton.createButton(renderer));

// Objekt (schwebt 1m vor User)
const cube = new THREE.Mesh(
  new THREE.BoxGeometry(0.2, 0.2, 0.2),
  new THREE.MeshStandardMaterial({ color: 0x00ff88 })
);
cube.position.set(0, 0, -1); // 1m vor Kamera
scene.add(cube);

// Licht
scene.add(new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1));

renderer.setAnimationLoop(() => {
  cube.rotation.y += 0.01;
  renderer.render(scene, camera);
});
```

### Quellen
- [Three.js WebXR AR Examples](https://threejs.org/examples/?q=webxr#webxr_ar_cones)
- [Google ARCore WebXR](https://developers.google.com/ar/develop/webxr)

---

## 2. Objekt-Positionierung in VR/AR

### Problem

Objekte bei `position.set(0, 0, 0)` erscheinen am Weltkoordinaten-Ursprung - oft "unter" dem User oder weit weg.

### Lösung: Relativ zur Kamera positionieren

```typescript
function spawnInFrontOfCamera(distance: number = 2): THREE.Vector3 {
  const pose = frame.getViewerPose(referenceSpace);
  if (!pose) return new THREE.Vector3();

  const view = pose.views[0];
  const matrix = new THREE.Matrix4().fromArray(view.transform.matrix);

  // Forward-Richtung aus Matrix extrahieren (negative Z-Achse)
  const forward = new THREE.Vector3();
  forward.setFromMatrixColumn(matrix, 2).negate().normalize();

  // Position = Kamera-Position + (Forward * Distanz)
  const position = new THREE.Vector3();
  position.copy(view.transform.position);
  position.add(forward.multiplyScalar(distance));

  return position;
}

// Nutzung:
cube.position.copy(spawnInFrontOfCamera(2)); // 2m vor User
cube.lookAt(camera.position); // Optional: zum User drehen
```

### Einfachere Variante (statisch)

Für statische Szenen ohne dynamisches Spawning:

```typescript
// Cube 2m vor, 0.5m unter Augenhöhe
cube.position.set(0, 1.0, -2);  // y=1.0 ist ca. Brusthöhe
```

### Best Practices

| Distanz | Nutzung |
|---------|---------|
| 0.3-0.5m | UI-Elemente, Menüs |
| 1-2m | Interaktive Objekte |
| 3-5m | Umgebungsobjekte |
| >5m | Hintergrund, Landschaft |

### Hit-Test für AR (Surface Placement)

```typescript
// Objekt auf erkannte Oberfläche setzen
const hitTestSource = await session.requestHitTestSource({
  space: await session.requestReferenceSpace('viewer')
});

renderer.setAnimationLoop((time, frame) => {
  const results = frame.getHitTestResults(hitTestSource);
  if (results.length > 0) {
    const pose = results[0].getPose(referenceSpace);
    cube.matrix.fromArray(pose.transform.matrix);
    cube.matrix.decompose(cube.position, cube.quaternion, cube.scale);
  }
});
```

---

## 3. Remote AR-Start per ADB

### Ergebnis: Nicht direkt möglich

Es gibt **keinen ADB-Befehl** der direkt in AR/Passthrough-Modus schaltet.

### Was möglich ist

```bash
# Guardian deaktivieren (hilft bei Passthrough-Apps)
adb shell setprop debug.oculus.guardian_pause 0

# Browser mit AR-App starten
adb shell am start -a android.intent.action.VIEW \
  -d "https://localhost:3000" com.oculus.browser
```

### Workflow für "Auto-AR"

1. App so bauen, dass sie **automatisch AR-Session startet** (kein Button-Klick nötig)
2. Per ADB die URL öffnen
3. App geht direkt in AR

```typescript
// Auto-start AR Session (ohne Button)
async function autoStartAR() {
  if (!navigator.xr) return;

  const supported = await navigator.xr.isSessionSupported('immersive-ar');
  if (!supported) return;

  const session = await navigator.xr.requestSession('immersive-ar', {
    requiredFeatures: ['local-floor']
  });

  renderer.xr.setSession(session);
}

// Bei Page Load starten
window.addEventListener('load', autoStartAR);
```

⚠️ **Achtung:** Viele Browser blockieren Auto-Start ohne User-Gesture!

### Alternative: Query Parameter

```typescript
// URL: https://localhost:3000?autostart=ar
const params = new URLSearchParams(window.location.search);
if (params.get('autostart') === 'ar') {
  // Zeige "Tap to Start AR" Overlay
  showARStartOverlay();
}
```

```bash
adb shell am start -a android.intent.action.VIEW \
  -d "https://localhost:3000?autostart=ar" com.oculus.browser
```

---

## 4. Remote-Control via WebSocket

### Architektur

```
┌─────────────┐    WebSocket    ┌─────────────┐
│   Mac       │ ───────────────→│   Quest     │
│  Keyboard   │    localhost    │   WebXR     │
│  (Server)   │ ←───────────────│   (Client)  │
└─────────────┘                 └─────────────┘
```

### Server (Bun/Node auf Mac)

```typescript
// server.ts - erweitert um WebSocket
const clients = new Set<WebSocket>();

Bun.serve({
  port: 3000,
  tls: { /* ... */ },

  fetch(req, server) {
    // WebSocket Upgrade
    if (req.headers.get("upgrade") === "websocket") {
      const upgraded = server.upgrade(req);
      return upgraded ? undefined : new Response("Upgrade failed", { status: 400 });
    }
    // Normal HTTP...
  },

  websocket: {
    open(ws) {
      clients.add(ws);
      console.log("Quest connected");
    },
    close(ws) {
      clients.delete(ws);
    },
    message(ws, message) {
      // Von Quest empfangen
      console.log("From Quest:", message);
    }
  }
});

// Keyboard Input an alle Clients senden
process.stdin.setRawMode(true);
process.stdin.on('data', (key) => {
  const keyCode = key.toString();
  const message = JSON.stringify({ type: 'key', key: keyCode });

  for (const client of clients) {
    client.send(message);
  }
});
```

### Client (Three.js auf Quest)

```typescript
// main.ts - WebSocket Client
const socket = new WebSocket('wss://localhost:3000');

socket.onopen = () => console.log('Connected to control server');

socket.onmessage = (event) => {
  const data = JSON.parse(event.data);

  if (data.type === 'key') {
    handleKeyPress(data.key);
  }
};

function handleKeyPress(key: string) {
  switch(key) {
    case '\u001b[A': // Arrow Up
      cube.position.z -= 0.1;
      break;
    case '\u001b[B': // Arrow Down
      cube.position.z += 0.1;
      break;
    case '\u001b[C': // Arrow Right
      cube.position.x += 0.1;
      break;
    case '\u001b[D': // Arrow Left
      cube.position.x -= 0.1;
      break;
    case 'r':
      cube.material.color.setHex(0xff0000);
      break;
    case 'g':
      cube.material.color.setHex(0x00ff00);
      break;
    case 'b':
      cube.material.color.setHex(0x0000ff);
      break;
  }
}
```

### Einfachere Alternative: HTTP Polling

Falls WebSocket zu komplex:

```typescript
// Server: Endpoint für aktuellen State
let state = { x: 0, y: 0, z: -2, color: 0x00ff88 };

app.get('/state', () => Response.json(state));
app.post('/move', async (req) => {
  const body = await req.json();
  state = { ...state, ...body };
  return Response.json({ ok: true });
});

// Client: Polling
setInterval(async () => {
  const res = await fetch('/state');
  const state = await res.json();
  cube.position.set(state.x, state.y, state.z);
  cube.material.color.setHex(state.color);
}, 100); // 10fps polling
```

### Best Practices

1. **Binary statt JSON** für hohe Frequenz (Position updates)
2. **Rate Limiting** auf 30-60fps
3. **Fallback** wenn WebSocket disconnected
4. **ADB Port Forward** für WebSocket: `adb reverse tcp:3000 tcp:3000`

---

## Zusammenfassung: Implementation Roadmap

### Phase 2a: AR Mode
1. `VRButton` → `ARButton` wechseln
2. `renderer` mit `alpha: true`
3. `scene.background` entfernen
4. Cube-Position anpassen (1-2m vor Kamera)

### Phase 2b: Remote Control
1. WebSocket zu `server.ts` hinzufügen
2. Keyboard-Listener auf Server
3. Message-Handler in `main.ts`
4. Key-Mappings definieren

### Phase 2c: Polish
1. Auto-AR via Query Parameter
2. UI für Verbindungsstatus
3. Controller-Support (Quest Controller)

---

*Recherche: 2026-01-19*
*Quellen: Three.js Docs, MDN WebXR, Google ARCore, Perplexity AI*
