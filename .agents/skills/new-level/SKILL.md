---
name: new-level
description: Creates a new VR Experience (Level) for Neural Flight. Step-by-step guided workflow — creates folder, adapts 5 files from template, defines parameters, registers in catalog. Supports reference images and descriptions. Use when the user wants to create, scaffold, or add a new experience or level.
---

# New Level — Experience Builder

You are creating a new VR Experience for the Neural Flight platform.
Follow these phases in order. Ask questions — don't guess.

## Phase A: Gather Input

Ask the user for:

1. **Name** — Will become the folder name (kebab-case, e.g. `cosmic-drift`)
2. **Description** — "What does the user experience?" (2-3 sentences)
3. **Reference images?** — Optional, for visual style guidance
4. **Movement type:**
   - Flight with physics (→ `FlightPlayer`)
   - Ground movement (→ direct camera)
   - Floating/drifting (→ auto-movement in tick)
   - Custom
5. **Visual elements** (pick any):
   - Terrain, Clouds, Sky, Water
   - Starfield, Particles, Floating Objects
   - Procedural Architecture, City, Grid Floor
   - Custom Shaders, GLTF Models, Custom Geometry
6. **Author name**

## Phase B: Research

Before generating code:

1. Read `→ TEMPLATE.md` for the 5-file template
2. Read `→ RULES.md` for architecture rules E1-E12 and performance budget
3. Read `→ SHARED_LIBRARY.md` for available building blocks
4. Check if `src/lib/experiences/$ARGUMENTS/` already exists (abort if it does)
5. If specific building blocks were chosen, read the source in `src/lib/three/` to get exact API signatures

Optionally read `→ EXAMPLES.md` for inspiration (Mountain Flight, Gradient Prism, Star Float).

## Phase C: Scaffold (5+1 Files)

Generate all files in `src/lib/experiences/{name}/`:

### C1: `index.ts`
Always the same: `export { manifest } from "./manifest";`

### C2: `manifest.ts`
- Set `id`, `name`, `description`, `author` from Phase A
- Define `parameters: ParameterDef[]` based on chosen elements
  - Group logically (Movement, Scene, Atmosphere, etc.)
  - Include appropriate types: `"number"` for sliders, `"boolean"` for toggles, `"color"` for pickers
  - Set sensible min/max/default/step values
  - Add Lucide `icon` names
- Configure `scene` defaults to match the experience mood
- Set `spawn` position appropriate to movement type
- Set `interfaces` based on movement type (`speed: true` for FlightPlayer)

### C3: `scene.ts`
- Define `{Name}State extends ExperienceState` with all objects needed in tick/settings
- `setup()`: Create 3D objects using chosen building blocks, add to scene
- `tick()`: Update animations, physics, building block update functions
- `dispose()`: Dispose ALL geometries, materials, textures. Remove from scene.

### C4: `player.ts`
- **FlightPlayer**: Forward orientation/speed to player instance (like Mountain Flight)
- **Direct camera**: Apply pitch/roll to camera.position (like Template)
- **Auto-drift**: Minimal — movement handled in tick()

### C5: `settings.ts`
- One `case` per parameter ID
- Use the correct pattern:
  - **Simple state**: set property, read in tick()
  - **Visual update**: mutate material/fog/light directly
  - **Structural rebuild**: dispose old → create new (debounce if slider-driven)

### C6: `shaders.ts` (only if custom shaders were chosen)
- Import GLSL from `src/lib/shaders/`
- Export factory functions for shader materials

### C7: Register in `catalog.ts`
Add 2 lines to `src/lib/experiences/catalog.ts`:
```typescript
import { manifest as {camelName} } from "./{name}";
// + entry in CATALOG object: "{name}": {camelName},
```

## Phase D: Verify

```bash
bunx biome check --write src/lib/experiences/{name}/
bunx svelte-check --threshold warning
bun run dev
```

Fix any lint or type errors before proceeding.

## Phase E: Next Steps

Show the user:
- Which files to edit for specific changes (scene.ts for visuals, settings.ts for parameters, etc.)
- Suggest a git branch name: `feat/experience-{name}`
- Suggest a commit message: `feat: add {name} experience`

## References (load on demand)

- `→ TEMPLATE.md` — Complete 5-file template with code blocks
- `→ SHARED_LIBRARY.md` — All available building blocks with API signatures
- `→ RULES.md` — Rules E1-E12, performance budget, dispose patterns, settings patterns
- `→ EXAMPLES.md` — How Mountain Flight, Gradient Prism, and Star Float adapted the template
