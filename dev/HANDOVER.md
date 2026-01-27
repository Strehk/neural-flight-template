# 📋 SESSION HANDOVER

## 📅 Session Info

**Date:** 2026-01-27
**Focus:** Flight Physics Refactor — Achsen-Entkopplung

---

## ✅ Completed This Session

### Flight Physics: Heading-basierte Entkopplung
- **Problem:** Euler XYZ-Order koppelte Pitch/Roll/Yaw — reiner Pitch erzeugte seitliche Drift
- **Lösung:** Forward-Vektor wird aus Kugelkoordinaten (heading + pitch) berechnet, nicht aus Rig-Quaternion
- `player.ts`: Neues `heading`-Feld, `tick()` komplett refactored:
  - Heading akkumuliert aus Roll (skalarer Winkel, kein Euler)
  - Forward-Vektor via `sin/cos` (garantiert entkoppelt)
  - Rig-Rotation nur visuell mit `'YXZ'`-Order
  - Pitch-Vorzeichen korrigiert: Down-Button → fliegt nach unten (nicht nur Blick)
- `flight.ts`: `PITCH_MULTIPLIER` entfernt (Pitch ist jetzt 1:1 in Radians)

---

## 🔧 Open: ICAROS Preview Ausrichtung

**Problem:** GLB-Modell zeigt nicht die korrekte Frontansicht im Default.
**Datei:** `src/lib/components/IcarosPreview.svelte`
**Ansatz:** OrbitControls nutzen um richtige Perspektive zu finden, dann Kamera-Position hardcoden.

## 🔧 Open: VR Score Overlay

Score-Overlay ist nur im 2D-Modus sichtbar (HTML). Für VR braucht man `THREE.Sprite` oder Text-Mesh.

---

## 📁 Changed Files (This Session)

| File | Change |
|------|--------|
| `src/lib/three/player.ts` | `tick()` komplett neu: heading-basiert, Kugelkoordinaten, YXZ-Order, Pitch-Vorzeichen fix |
| `src/lib/config/flight.ts` | `PITCH_MULTIPLIER` entfernt |
| `dev/PLAN.md` | Phase 1b Flight Physics als ✅ markiert |

---

## 🧠 Context for Next Session

- Flugphysik ist jetzt achsen-entkoppelt: Pitch = rein hoch/runter, Roll = rein drehen
- Heading ist ein skalarer Winkel (kein Euler) — kann beliebig akkumulieren ohne Gimbal-Lock
- Alle Lint/Type-Checks bestanden (0 errors, 0 warnings)
- `ssr = false` auf beiden Routes (Three.js + WebSocket brauchen Browser APIs)

---

*Updated: 2026-01-27*
