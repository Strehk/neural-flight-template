# 🎓 WebXR Concepts for Beginners

> **Zielgruppe:** Entwickler, die neu in WebXR/Three.js sind
> **Voraussetzungen:** Grundlegendes JavaScript/TypeScript-Verständnis

---

## 📖 Table of Contents

1. [Was ist WebXR?](#-was-ist-webxr)
2. [Three.js Scene Graph](#-threejs-scene-graph)
3. [VR vs AR im WebXR-Kontext](#-vr-vs-ar-im-webxr-kontext)
4. [Der Render Loop](#-der-render-loop)
5. [WebSocket Real-Time-Kommunikation](#-websocket-real-time-kommunikation)
6. [TypeScript im Browser](#-typescript-im-browser)

---

## 🥽 Was ist WebXR?

**WebXR** ist eine Browser-API, die Virtual Reality (VR) und Augmented Reality (AR) im Web ermöglicht.

### Die wichtigsten Konzepte

```
┌─────────────────────────────────────────────────────────┐
│                     WebXR Device API                     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐ │
│  │  VR Mode    │    │  AR Mode    │    │  Inline     │ │
│  │  (immersive)│    │ (passthrough)│    │  (Desktop)  │ │
│  └─────────────┘    └─────────────┘    └─────────────┘ │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

| Modus | Beschreibung | Use Case |
|-------|--------------|----------|
| **immersive-vr** | Vollständig virtuelle Umgebung | Gaming, Simulationen |
| **immersive-ar** | Virtuelle Objekte in realer Welt | Möbel-Preview, Navigation |
| **inline** | Kein Headset, normaler Browser | Desktop-Vorschau |

### ⚠️ Wichtige Einschränkung

**WebXR funktioniert NUR über HTTPS!**

```bash
# HTTP → WebXR API blockiert ❌
http://192.168.1.10:3000

# HTTPS → WebXR API verfügbar ✅
https://localhost:3000
```

Warum? Sicherheit! VR/AR-APIs haben Zugriff auf Kamera, Sensoren und Tracking-Daten.

---

## 🎨 Three.js Scene Graph

Three.js organisiert 3D-Szenen in einem **hierarchischen Baum** (Scene Graph).

### Die 4 Grundbausteine

```
Scene (Container)
├── Camera (Blickwinkel)
├── Mesh (sichtbares Objekt)
│   ├── Geometry (Form)
│   └── Material (Aussehen)
└── Light (Beleuchtung)
```

### Code-Beispiel aus `src/main.ts`

```typescript
// 1. Scene - Der Container für alles
const scene = new THREE.Scene();

// 2. Camera - Bestimmt was wir sehen
const camera = new THREE.PerspectiveCamera(
  75,      // FOV (Field of View) - Blickwinkel
  16/9,    // Aspect Ratio - Seitenverhältnis
  0.1,     // Near Plane - Minimum Sichtweite
  1000     // Far Plane - Maximum Sichtweite
);

// 3. Renderer - Zeichnet die Scene
const renderer = new THREE.WebGLRenderer();
renderer.xr.enabled = true;  // WebXR aktivieren!

// 4. Mesh = Geometry + Material
const geometry = new THREE.BoxGeometry(1, 1, 1);  // Form: Würfel
const material = new THREE.MeshStandardMaterial({ color: 0x00ff88 });
const cube = new THREE.Mesh(geometry, material);
scene.add(cube);  // Zur Scene hinzufügen
```

### 📐 Das Koordinatensystem

```
        Y (up)
        │
        │
        │
        └────── X (right)
       /
      /
     Z (toward viewer)
```

| Achse | Richtung | Beispiel |
|-------|----------|----------|
| **X** | Links (-) / Rechts (+) | `cube.position.x = 2` → 2m nach rechts |
| **Y** | Unten (-) / Oben (+) | `cube.position.y = 1` → 1m hoch |
| **Z** | Weg (-) / Zu (+) | `cube.position.z = -3` → 3m vor dir |

---

## 👓 VR vs AR im WebXR-Kontext

### VR-Modus (immersive-vr)

```typescript
// Komplette virtuelle Umgebung
scene.background = new THREE.Color(0x1a1a2e);  // Hintergrundfarbe

const renderer = new THREE.WebGLRenderer();
// alpha: false (default) - keine Transparenz nötig
```

**Eigenschaften:**
- Nutzer sieht NUR die virtuelle Welt
- Volle Kontrolle über die Umgebung
- Hintergrund kann jede Farbe/Textur sein

### AR-Modus (immersive-ar)

```typescript
// Transparenter Hintergrund für Passthrough
scene.background = null;  // Kein Hintergrund!

const renderer = new THREE.WebGLRenderer({
  alpha: true  // ← WICHTIG für Transparenz!
});
```

**Eigenschaften:**
- Nutzer sieht reale Welt durch Passthrough-Kameras
- Virtuelle Objekte "schweben" im Raum
- Scene-Background muss transparent sein

### Mode-Switch Pattern (aus `src/main.ts`)

```typescript
// URL: /?mode=ar oder /?mode=vr
const mode = new URLSearchParams(location.search).get("mode") || "vr";

// Renderer: Transparenz nur für AR
const renderer = new THREE.WebGLRenderer({
  alpha: mode === "ar"  // Bedingte Transparenz
});

// Background: Nur für VR setzen
if (mode !== "ar") {
  scene.background = new THREE.Color(0x1a1a2e);
}

// Button: ARButton oder VRButton
const xrButton = mode === "ar"
  ? ARButton.createButton(renderer)
  : VRButton.createButton(renderer);
```

---

## 🔄 Der Render Loop

### ❌ Falsch: requestAnimationFrame

```typescript
// So NICHT in WebXR!
function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}
animate();
```

**Problem:** `requestAnimationFrame` läuft mit 60fps des Monitors. WebXR-Headsets laufen aber oft mit 72/90/120fps und haben eigenes Timing.

### ✅ Richtig: setAnimationLoop

```typescript
// WebXR-kompatibel!
renderer.setAnimationLoop(() => {
  cube.rotation.y += 0.01;
  renderer.render(scene, camera);
});
```

**Warum?**
- Synchronisiert mit dem XR-Session-Timing
- Pausiert automatisch wenn keine XR-Session aktiv
- Funktioniert auch ohne Headset (Desktop)

### Zusammenfassung

| Methode | Desktop | WebXR | Empfohlen |
|---------|---------|-------|-----------|
| `requestAnimationFrame` | ✅ | ❌ | Nein |
| `setAnimationLoop` | ✅ | ✅ | **Ja** |

---

## 🔌 WebSocket Real-Time-Kommunikation

### Warum WebSocket?

HTTP ist **Request-Response** - der Server kann nicht von sich aus Daten senden.

```
HTTP (Pull):
Client ──────────────► Server
       "Neue Daten?"
       ◄──────────────
           "Ja/Nein"
```

WebSocket ist **bidirektional** - beide können jederzeit senden.

```
WebSocket (Push):
Client ◄────────────────► Server
       Jederzeit senden!
```

### Das Broadcast-Pattern (aus `server.ts`)

```typescript
// Alle verbundenen Clients
const clients = new Set<ServerWebSocket>();

// Broadcast: An alle ANDEREN senden
function broadcast(data: string, sender?: ServerWebSocket) {
  for (const client of clients) {
    if (client !== sender) {  // Nicht an Sender zurück!
      client.send(data);
    }
  }
}
```

**Warum "alle außer Sender"?**
- Controller sendet Befehl → Server empfängt
- Server broadcastet → Quest empfängt
- Controller soll seinen eigenen Befehl nicht zurückbekommen (Echo-Vermeidung)

### Datenfluss in diesem Projekt

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│ Controller  │  ─────► │   Server    │  ─────► │   Quest     │
│  (Mac)      │  JSON   │ (broadcast) │  JSON   │   (VR)      │
└─────────────┘         └─────────────┘         └─────────────┘

JSON-Befehle:
{"type":"move","axis":"x","value":0.1}
{"type":"color","color":"red"}
```

---

## 📦 TypeScript im Browser

### Das Problem

Browser können TypeScript NICHT direkt ausführen:

```html
<!-- ❌ Funktioniert NICHT -->
<script src="main.ts"></script>
```

### Klassische Lösung: Build-Step

```bash
# TypeScript → JavaScript kompilieren
tsc main.ts --outDir dist

# Dann das kompilierte JS laden
# <script src="dist/main.js"></script>
```

**Nachteil:** Jede Änderung erfordert Neukompilierung.

### Unsere Lösung: On-the-fly Transpilation

Der Server transpiliert TypeScript **beim Request** zu JavaScript:

```typescript
// server.ts
const transpiler = new Bun.Transpiler({ loader: "ts" });

if (path.endsWith(".ts")) {
  const source = await Bun.file(path).text();
  const js = transpiler.transformSync(source);  // TS → JS
  return new Response(js, {
    headers: { "Content-Type": "application/javascript" }
  });
}
```

**Vorteile:**
- Kein Build-Schritt nötig
- Änderungen sofort sichtbar (mit `--hot`)
- TypeScript-Typen bleiben im Quellcode für IDE-Support

### Import-Handling

```typescript
// Im Browser: Three.js kommt von node_modules
import * as THREE from "three";

// Der Server löst "three" zu:
// node_modules/three/build/three.module.js
```

---

## 🎯 Zusammenfassung

| Konzept | Kernpunkt |
|---------|-----------|
| **WebXR** | Browser-API für VR/AR, benötigt HTTPS |
| **Scene Graph** | Hierarchie: Scene → Camera/Mesh/Light |
| **VR vs AR** | VR = geschlossen, AR = transparent (`alpha: true`) |
| **Render Loop** | `setAnimationLoop()` statt `requestAnimationFrame()` |
| **WebSocket** | Bidirektional, Broadcast für Multi-Client |
| **TypeScript** | On-the-fly Transpilation durch Server |

---

## 📚 Weiterführende Ressourcen

- [Three.js Fundamentals](https://threejs.org/manual/#en/fundamentals)
- [WebXR Device API (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/WebXR_Device_API)
- [Bun.serve() Dokumentation](https://bun.sh/docs/api/http)
- [Meta Quest Developer Hub](https://developer.oculus.com/)

---

*Erstellt: 2026-01-19*
