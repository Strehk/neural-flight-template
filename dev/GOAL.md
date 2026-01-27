# 🎯 GOAL — ICAROS VR Flight Sim Prototyp

## Vision

Ein VR-Flugsimulator für die Meta Quest 3, gesteuert über das ICAROS Fitness-Gerät.
Der Spieler liegt bäuchlings auf dem ICAROS und steuert durch Gewichtsverlagerung (Pitch + Roll) durch eine endlose, prozedural generierte Landschaft — und fliegt dabei durch Ringe.

## Prototyp-Scope

Der Prototyp simuliert die ICAROS-Steuerung über eine Web-Oberfläche mit **visuellen Buttons + Pfeiltasten** — die echte Device-Orientation-Integration folgt später.

### Key Features

| Feature | Details |
|---------|---------|
| **Controller UI** | `/controller` Route mit Richtungs-Buttons + Pfeiltasten-Support |
| **3D ICAROS-Modell** | Geometrische Primitiven (Torus-Arcs, Box, Zylinder) als visuelles Feedback |
| **Speed-System** | Pitch-basiert (vorwärts = schneller) + Accelerate/Brake-Buttons |
| **Endloses Terrain** | Simplex-Noise Heightmap, Chunk-basiert, Object-Pooling |
| **Ringe** | InstancedMesh Torus-Geometrie, Distanz-basierte Kollision |
| **Flugphysik** | Arcade-Style: Roll → direkte Drehrate, Pitch → Höhe + Speed |

### 3D ICAROS-Modell (Controller-Seite)

Vereinfachte 3D-Darstellung aus geometrischen Primitiven:
- **Frame:** `TorusGeometry`-Arcs → Wippgestell
- **Platform:** Flache `BoxGeometry` → Liegefläche
- **Handles:** Zwei kleine `CylinderGeometry` → Griffe
- **Rotation:** `pitch → rotation.x`, `roll → rotation.z`
- Kleiner Three.js-Canvas auf der Controller-Seite als Echtzeit-Feedback

### Datenfluss

```
Controller (/controller)          VR Scene (/vr)
┌─────────────────────┐           ┌──────────────────┐
│ Buttons / Pfeiltasten│──WebSocket──▶│ Flight Physics   │
│ Speed Buttons        │           │ Terrain + Rings   │
│ 3D ICAROS Preview   │           │ WebXR on Quest    │
└─────────────────────┘           └──────────────────┘
```

### Architektur-Entscheidungen

| Entscheidung | Gewählt | Nicht im Prototyp |
|-------------|---------|-------------------|
| Input | Buttons + Pfeiltasten | Device Orientation API |
| ICAROS-Modell | Geometrische Primitiven | GLTF/FBX |
| Speed | Pitch + Buttons (dual) | Nur Pitch |
| Terrain | Endlos (Chunks) | Feste Strecke |
| Noise | Simplex | Perlin |
| Ring-Kollision | Distanz-Sphere | Ray-Torus |
| WebSocket | Broadcast-to-all | Room-basiert |
| Physik | Arcade | Realistische Simulation |

## ❌ Nicht im Prototyp

- Device Orientation API (→ spätere Integration mit echtem ICAROS)
- GLTF/FBX-Modelle (nur geometrische Primitiven)
- Scoring-System / Leaderboard
- Audio-Feedback
- Room-basiertes WebSocket-Pairing

---

*Created: 2026-01-27*
