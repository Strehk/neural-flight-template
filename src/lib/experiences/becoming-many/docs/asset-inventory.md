# Sinneswandler — Static Asset Inventory

> Complete inventory of the models, audio, and other static assets that the legacy
> `sinneswandler_test1` experience ships and references. Feeds the rewrite's asset-pipeline
> planning (what to keep, what to drop, what to convert to glTF/Draco/KTX2, what is broken).
>
> **Headline findings:** (1) **no referenced asset path under `static/` is missing**; but
> (2) **two code-referenced models bundled from the *source* tree are absent on disk** (bat +
> fly) — the experience's bat mount and moth geometry currently fail to load; (3) **~53% of the
> `.obj` models (79/150) are shipped but never loaded**, including the entire autumn tree set.

---

## 1. Totals

| Bucket | Location | Size | Files |
|---|---|---|---|
| Vegetation/rock models | `static/sinneswandler_test1/models/` | ~15 MB | 150 `.obj` + 150 `.mtl` + 2 `.glb` + 3 `.md` |
| Background/transition audio | `static/sinneswandler_test1/Sound/` | ~14 MB | 1 `.mp3` + 1 `.wav` |
| Intro narration audio | `static/sinneswandler_test1/intro/` | ~1.9 MB | 5 `.mp3` |
| **Served subtotal** | `static/sinneswandler_test1/` | **~31 MB** | **312 files** |
| Bundled archive (source tree) | `src/.../sinneswandler_test1/Bat.rar` | 1.2 MB | 1 `.rar` (unextracted) |

By type across the experience: `.obj ×150`, `.mtl ×150`, `.glb ×2`, `.mp3 ×6`, `.wav ×1`,
`.md ×3` (placeholders), `.rar ×1` (source tree, unreferenced).

No image textures anywhere — `.obj`/`.mtl` use vertex colours / inline materials.

---

## 2. Models — `static/sinneswandler_test1/models/`

Loaded by `world-models.ts` with `BASE_URL = "/sinneswandler_test1/models"`. Each `.obj` pairs
with a `.mtl`.

| Category | Format | Count | Examples | Size |
|---|---|---|---|---|
| trees/autumn | obj+mtl | 25 | Birch/Common/Pine/Willow `_Autumn_1..5` | ~2.1 MB |
| trees/birch | obj+mtl | 5 | `BirchTree_1..5` | ~430 KB |
| trees/common | obj+mtl | 5 | `CommonTree_1..5` | ~500 KB |
| trees/dead | obj+mtl | 15 | Birch/Common/Willow `_Dead_1..5` | ~1.0 MB |
| trees/palm | obj+mtl | 4 | `PalmTree_1..4` | ~270 KB |
| trees/pine | obj+mtl | 5 | `PineTree_1..5` | ~430 KB |
| trees/snow | obj+mtl | 40 | many `_Snow_*` / `_Dead_Snow_*` | ~3.3 MB |
| trees/willow | obj+mtl | 5 | `Willow_1..5` | ~420 KB |
| **trees total** | | **104** | | **~7.7 MB** |
| rocks/moss | obj+mtl | 7 | `Rock_Moss_1..7` | ~60 KB |
| rocks/regular | obj+mtl | 7 | `Rock_1..7` | ~70 KB |
| rocks/snow | obj+mtl | 7 | `Rock_Snow_1..7` | ~80 KB |
| **rocks total** | | **21** | | ~224 KB |
| plants | obj+mtl | 12 | Bush, BushBerries, Flowers, Plant_1..5 | 332 KB |
| grass | obj+mtl | 6 | Grass, Grass_Short, Wheat, Corn_1/2 | 148 KB |
| cacti | obj+mtl | 10 | Cactus_1..5, CactusFlower(s)_* | 548 KB |
| props | obj+mtl | 7 | TreeStump(_Moss/_Snow), WoodLog(_Moss/_Snow), Lilypad | 152 KB |
| bee | glb | 1 | `bee/bee.glb` (rigged) | 4.2 MB |
| bird | glb | 1 | `bird/bird_BS.glb` (rigged) | 1.7 MB |

Placeholder docs (ignore): `models/{trees,rocks,grass}/HIER_MODELLE_ABLEGEN.md`.

---

## 3. Audio

| File | Format | Size | Role |
|---|---|---|---|
| `Sound/Hintergrundmusik.mp3` | mp3 | 12 MB | looping ambient background (gain 0.22) |
| `Sound/Übergang.wav` | wav | 2.5 MB | sense-transition stinger (gain 0.72); referenced URL-encoded `U%CC%88bergang.wav` |
| `intro/Nichts.mp3` | mp3 | 256 KB | Luft narration |
| `intro/A_Bat_echo.mp3` | mp3 | 360 KB | Echo narration |
| `intro/fire_beetle_red.mp3` | mp3 | 376 KB | Infrarot narration |
| `intro/bee_chemical.mp3` | mp3 | 416 KB | Duft narration |
| `intro/swarm.mp3` | mp3 | 584 KB | Netzwerk narration |

All 7 referenced and present. (`Hintergrundmusik.mp3` at 12 MB is the single biggest asset —
a candidate for compression/streaming in the rewrite.)

---

## 4. ⚠ Broken / missing models (action required for the rewrite)

Two models are referenced from the **source tree** via `new URL("./assets/...", import.meta.url)`
(so Vite would bundle them) — but **`src/lib/experiences/sinneswandler_test1/assets/` does not
exist**:

| Reference | Code | Status |
|---|---|---|
| `./assets/Bat/VAMP_BAT.OBJ` | `bat-mount.ts:4` | **MISSING** — bat mount has no geometry at runtime |
| `./assets/Fly/19912_Horse_fly_V1_.obj` | `fly-model.ts:5-7` | **MISSING** — `loadFlyGeometry()` throws; moth swarm has no mesh |

The only related on-disk artifact is `src/.../sinneswandler_test1/Bat.rar` (1.2 MB, unextracted,
not imported). The bat OBJ is presumably inside it. **Rewrite action:** source/convert these
(ideally to glTF) and place them where the new loader expects, or author replacements.

---

## 5. Orphaned models (shipped but never loaded)

`world-models.ts` wires only the lower-numbered variants per category (roughly `_1`–`_3`), so
**79 of 150 `.obj` (158 files incl. `.mtl`) are dead weight**:

- **Entire `trees/autumn/` (25 models) — unused.**
- `trees/snow/`: ~32 of 40 orphaned (only a handful of `_Snow_1/2` wired).
- `trees/dead/`: 11 of 15 orphaned.
- Rocks: `_4`–`_7` orphaned across all three rock folders.
- cacti: `Cactus_5`, `CactusFlower_1`, `CactusFlowers_3/4/5` orphaned.
- grass: `Corn_1/2` orphaned. plants: `Plant_4/5` orphaned. props: `Lilypad` orphaned.

**Rewrite action:** decide per category whether to (a) prune to the wired set, or (b) wire the
extras for variety. Either way, **convert the kept set from `.obj`/`.mtl` to a single
instancing-friendly format** (glTF, ideally Draco/meshopt-compressed) — 150 separate OBJ/MTL
fetches is a load-time and parse cost the WebGPU rebuild should not inherit.

---

## 6. Out of scope / unrelated

- `static/models/` (40 MB: `armpit_city.glb`, `icaros.glb`, `abandoned_alley_*.glb`,
  `apartment_floor_plan.glb`) belongs to **other experiences**, not sinneswandler.
  `abandoned_alley_*` and `apartment_floor_plan` are unreferenced repo-wide.
- `Bat.rar` should not be served and is not part of the build; treat as a raw source archive.

---

## 7. Asset-pipeline recommendations (rewrite)

1. **Resolve the two missing models first** (bat + fly) — they block creature parity.
2. **Convert OBJ→glTF** with Draco/meshopt; merge per-category atlases where possible.
3. **Prune orphans** (or consciously adopt them) — don't ship 79 unused meshes.
4. **Compress the 12 MB background track**; consider streaming/opus.
5. **Co-locate vs static:** keep large shared models in `static/`; small per-experience models can
   stay bundled — but ensure they actually exist (the current bat/fly bug is exactly this trap).
6. **Texture/KTX2:** none today (vertex-colour only); if the rewrite adds PBR materials, budget for
   KTX2/Basis from the start rather than retrofitting.
