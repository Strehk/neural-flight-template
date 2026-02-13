# Gradient Prism

Generative infinite-dolly through recursive 3D subdivision panels with gradient materials, atmospheric fog, bloom, and film grain.

## Visual Goal

- Large flat gradient panels filling the view (especially Y-axis — tall vertical surfaces)
- Large dark/black volumes for contrast between colorful panels
- Visible background sky gradient (not eaten by fog)
- Saturated, colorful palette — NOT desaturated pastels
- Film grain + bloom for cinematic feel
- Depth layering via fog (panels fade, but background stays visible)
- Corridor-like depth feel with panels forming walls

## Module Dependencies

- `$lib/three/lab/labyrinth.ts` — Recursive subdivision generator (axisWeights, depth-scaled overlays)
- `$lib/three/lab/gradient_material.ts` — Custom gradient ShaderMaterial
- `$lib/three/lab/gradient_sky.ts` — Procedural sky sphere
- `$lib/three/lab/starfield.ts` — Background star particles
- `$lib/three/lab/post_processing.ts` — Bloom + Afterimage + Grain + Vignette pipeline

## Current Parameters

### Labyrinth Config

| Parameter | Value | Notes |
|-----------|-------|-------|
| `maxDepth` | `3` | Stable since R1 |
| `minCellSize` | `5.0` | Stable since R1 |
| `wallProbability` | `0.5` | Stable since R1 |
| `translucencyChance` | `0.4` | Stable since R1 |
| `overlayChance` | `0.15` | R2: up from 0.06, depth-scaled internally |
| `platformChance` | default (0.04) | R2 REVERTED: 0 killed horizontal variety |
| `axisWeights` | `{ x: 1.0, y: 0.5, z: 1.0 }` | R2 REVERTED: {0.6, 0.25, 1.8} made scene too sparse |
| `palettes` | default (saturated) | R2 REVERTED: pastels were too bland |
| `seed` | `7` | Stable since R1 |

### Atmosphere

| Parameter | Value | Notes |
|-----------|-------|-------|
| Fog | `0x080412 / 0.022` | R2 REVERTED: 0.035 killed background gradient |
| Sky top | `0x020206` | R2 REVERTED: warmer tint not visible |
| Sky middle | `0x6b1d4a` | R2 REVERTED |
| Sky bottom | `0x3a1a0e` | R2 REVERTED |

### Post-Processing

| Parameter | Value | Notes |
|-----------|-------|-------|
| `bloomStrength` | `0.5` | Stable |
| `bloomThreshold` | `0.7` | Stable |
| `bloomRadius` | `0.6` | Stable |
| `grainIntensity` | `0.10` | R2: up from 0.05 — KEEP, more cinematic |
| `vignetteIntensity` | `0.55` | Stable |
| `afterimageDecay` | `0.96` | Stable |

### Corridor Light

| Parameter | Value | Notes |
|-----------|-------|-------|
| PointLight | `0xd4a070, 0.8, 40, 1.5` | R2: NEW — KEEP, adds depth |
| Focal sphere | `color(0.4, 0.25, 0.12)` | R2: NEW — KEEP, bloom glow |

## Decision Log

### Round 1: Foundation
- Depth-scaled wall coverage, glow sphere hotspots, 3D chunk grid, collision avoidance
- Result: Good base, but panels felt like random floating objects

### Round 2: Corridor Attempt — PARTIAL FAILURE
Changes and outcomes:

| Change | Result | Verdict |
|--------|--------|---------|
| `axisWeights: {x:0.6, y:0.25, z:1.8}` | Scene too sparse, large Y panels gone | REVERT to defaults |
| `PASTEL_PALETTES` (desaturated) | Too bland, lost the colorful punch | REVERT to defaults |
| `platformChance: 0` | Lost horizontal variety | REVERT to default |
| Fog `0.035` | Background gradient invisible, too dark | REVERT to 0.022 |
| Warmer sky colors | Barely visible under dense fog | REVERT |
| `overlayChance: 0.15` + depth-scaling | More panel detail at shallow depth | KEEP |
| Corridor focal light + emissive sphere | Adds warm depth glow | KEEP |
| `grainIntensity: 0.10` | More cinematic | KEEP |

**Key Lesson:** The original saturated palette + default axis weights already produced the "large colorful volumes" the user likes. The problem was never the colors — it was the lack of corridor depth. The focal light alone adds corridor feel without needing to restructure the geometry.

### Round 3: Selective Revert (next)
Plan: Revert failed R2 changes (palette, axisWeights, fog, sky, platformChance), keep successful ones (focal light, grain, depth-scaled overlays, overlayChance 0.15).
