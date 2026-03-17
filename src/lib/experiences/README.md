# Experiences — Student Guide

## Quick Start

```bash
# 1. Template kopieren
cp -r src/lib/experiences/template/ src/lib/experiences/mein-name/

# 2. manifest.ts anpassen — id, name, description, author, parameters
# 3. scene.ts anpassen — eigene 3D-Objekte erstellen
# 4. In catalog.ts registrieren:
#    import { manifest as meinName } from "./mein-name";
#    → Eintrag in CATALOG hinzufügen

# 5. Testen
bun run dev
```

## Datei-Übersicht (5 Dateien pro Experience)

| Datei | Export | Aufgabe |
|-------|--------|---------|
| `index.ts` | Re-export | Entry Point — 1 Zeile |
| `manifest.ts` | `manifest` | Deklarativer Vertrag: Parameter, Scene-Config, Lifecycle |
| `scene.ts` | `setup()`, `tick()`, `dispose()` | 3D-Objekte erstellen, animieren, aufräumen |
| `player.ts` | `updatePlayer()` | Orientation-Daten → Kamera-Bewegung |
| `settings.ts` | `applySettings()` | Parameter-ID → Scene-Änderung |

## Referenz: Mountain Flight

`src/lib/experiences/mountain-flight/` ist die vollständige Referenz-Experience mit ~20 Parametern, Terrain-System, Clouds, Sky und FlightPlayer-Physik.

## Fehler-Nachrichten

Wenn `Experience "xyz" not found` erscheint, prüfe:
1. Ist der Ordner unter `src/lib/experiences/xyz/` vorhanden?
2. Ist die `manifest.id` in `manifest.ts` identisch zum Ordnernamen?
3. Wurde die Experience in `catalog.ts` importiert und eingetragen?

## Parameter hinzufügen

In `manifest.ts` einen Eintrag zum `parameters`-Array hinzufügen:

```typescript
{
  id: "myParam",        // Eindeutiger Key
  label: "My Param",    // Anzeigename im UI
  group: "Scene",       // Gruppierung in Settings Sidebar
  type: "number",       // "number" | "boolean" | "color"
  min: 0,               // Minimum (Slider)
  max: 100,             // Maximum (Slider)
  default: 50,          // Startwert
  step: 1,              // Schrittweite
  icon: "Box",          // Lucide Icon für Node Editor
}
```

Dann in `settings.ts` einen passenden `case` im `switch` hinzufügen:

```typescript
// settings.ts — Beispiel-Case
case "myParam":
  s.someObject.property = value as number;  // Einfach: State-Wert setzen
  break;
```

Drei Patterns für verschiedene Komplexitäten:
- **Einfach:** State-Property setzen → tick() liest es (`moveSpeed`, `rotationEnabled`)
- **Visuell:** Material/Fog/Licht direkt updaten (`blockColor`, `fogNear`)
- **Strukturell:** Alte Objekte disposen, neue generieren (`blockCount`) — siehe Memory-Leak-Warnung im Template

## Shared Library (Building Blocks)

Fertige 3D-Bausteine in `src/lib/three/`:

| Import | Funktion |
|--------|----------|
| `createClouds()` | Wolken-Gruppe (count, spread, height, opacity) |
| `createSky()` | Gradient-Himmelskugel (3 Farben) |
| `createWater()` | Transparente Wasser-Ebene |
| `FlightPlayer` | Physik-basierte Flugsteuerung (Trägheit, Smoothing) |
| `TerrainManager` | Prozedurales Terrain mit Chunks |
| `loadGLTF()` | GLTF/GLB 3D-Modelle laden |

Beispiel:

```typescript
import { createClouds } from "$lib/three/clouds";

const clouds = createClouds({ count: 20, spread: 100, heightMin: 30, heightMax: 50 });
ctx.scene.add(clouds);
```

## AI-Assisted Level Creation

Use any AI coding agent (Claude Code, Codex, Cursor, Gemini, OpenCode, etc.) to scaffold a new experience with guided prompts.

**Agent Skills** (cross-agent standard in `.agents/skills/new-level/`):
- The `new-level` skill walks you through the 5-file pattern step by step
- It knows the template, shared library, architecture rules, and performance budget
- It asks the right questions and generates all files for you

**How to use:**
- **Claude Code:** Type `/new_level my-experience-name`
- **Other agents:** Point them to `.agents/skills/new-level/SKILL.md`

**What's in the skill directory:**

| File | Content |
|------|---------|
| `SKILL.md` | Guided workflow (Phase A-E) |
| `TEMPLATE.md` | All 5 template files as code blocks |
| `SHARED_LIBRARY.md` | Available building blocks with API signatures |
| `RULES.md` | Rules E1-E12, performance budget, dispose patterns |
| `EXAMPLES.md` | How Mountain Flight and Gradient Prism adapted the template |
