# Sinneswandler — System & Feature Specification

> **Purpose.** This is the reference "what & why" for `sinneswandler_test1`, captured so
> the **Becoming Many** WebGPU+WebXR rewrite can mirror the experience faithfully without
> reading the legacy source line-by-line. It documents **structure, features, content, and
> design intent** — *not* rendering strategy. Wherever the legacy implements something via a
> WebGL material / post-process / shader, that is flagged `→ redo in TSL` and the *intent* is
> recorded, not the GLSL.
>
> **Scope.** The experience module internals only (`src/lib/experiences/sinneswandler_test1/`,
> 35 files, ~10.4k LOC). Shared platform pieces (`/vr` route, manifest contract, dev-console,
> controller/gyro, worldgen worker pool, noise/cache libs) are treated as black boxes and only
> named where the experience touches them.
>
> **Confidence.** Numbers below were extracted from source by exploration agents. Treat them as
> a faithful map, but re-verify any specific constant against the source before depending on it
> in code — a handful were inferred from context (flagged inline).

---

## 0. The experience in one paragraph

A poetic first-person **night flight** as a bat over an infinite, procedurally streamed
landscape (forest / grassland / mountains / snow / desert / barrens). The world is almost
invisible by default; the player **switches between perceptual senses** — air/void,
echolocation, infrared, smell, network — each of which reveals the same world differently and
is coupled to a **synthesized, sense-appropriate soundscape**. Echolocation pulses (manual or
auto) reveal geometry briefly and drive a Web-Audio sonar synth. The player collects **moths**
(echo system) and **scent hotspots** (smell system); both feed a single `score` output. Bee
and bird/moth swarms populate the world deterministically. An intro sequence narrates each
sense as the player first enters it.

---

## 1. Structure / Lifecycle / Composition

### 1.1 Module contract (`manifest.ts`, `config.ts`)
- **Identity:** id `sinneswandler_test1`; camera FOV **78°**, near **0.1**, far **620 m**.
- **Spawn:** `(0, 26, 0)` — airborne start at 26 m.
- **Scene defaults:** very dark fog (`#040812`), fog near 10 m / far 180 m, low ambient + sun.
- **Interfaces declared:** `{ orientation: true, speed: true, triggers: [<pulse trigger id>] }`.
- **Outputs:** single `score` = `collectedMoths + chemosenseScore` (live tally).
- **Parameters:** **28 tunables** across 4 groups (Flight, Echo, Audio, World) — full table in §7.

### 1.2 Lifecycle (`scene.ts`)
`setup → tick → render → dispose`. `setup()` builds all subsystems and returns a
`BatEcholocationState` that owns every runtime object. `tick()` runs a strict ordered update;
`render()` applies per-mode depth/inversion passes; `dispose()` tears down in reverse order.

### 1.3 Per-frame update order (the spine of the experience)
1. **Input & mode switch** — consume keyboard + controller; apply to flight controller; handle
   invert-output toggle; apply any pending sense switch; play transition stinger on change.
2. **World anchor & terrain** — tick `SenseSwitchManager` (blend modes, atmosphere from biome);
   tick flight controller with terrain height sampling; move sky + moon with player; sample
   biome weights; advance chunk scheduler → returns active moth list.
3. **Perception layers** — chemosense particles (smell), network boids/nodes, bee swarm,
   whiteout particles, bat-mount visibility — each blended by current mode's layer factor.
4. **Echo & moths** — collect manual pulses (if echo enabled, respecting cooldown); emit
   auto-pulses on interval; scale moths up in echo mode; spawn/refresh collection bursts;
   expire old pulses; push echo uniforms to materials.
5. **Audio & sky** — tick audio engine (synth decay/emission); animate gradient sky.

### 1.4 Composition graph (ownership)
```
scene.ts (state owner)
├─ BatFlightController .......... rig + camera, flight physics, altitude clamp
├─ BatWorld ..................... terrain + decoration + moths + echo probe
│   ├─ TerrainSampler ........... height / biome / derived-field sampling (+ LRU cache)
│   ├─ ChunkScheduler ........... streaming chunks (build/keep radius, disposal)
│   ├─ WorldgenWorkerPool ....... off-main-thread chunk builds
│   ├─ DecorationPlacer ......... 16 instanced biome-scatter passes
│   ├─ MothSwarm ............... deterministic instanced moths + collection
│   └─ EchoProbe ............... fan raycast → acoustic profile
├─ EchoAudioManager ............ Web-Audio sonar synth (per-pulse voices)
├─ SenseSwitchManager .......... 7 vision modes + PerceptionRouter (masks/overrides)
├─ ChemosenseLayer ............. smell hotspots (particles + collection)
├─ NetworkLayer ............... boid bird flocks + ground node graph
├─ BeeSwarm ................... ambient instanced bees
├─ KeyboardInput + ControllerInput
├─ IntroSequence ............... per-sense audio narration
└─ Sky / Moon / FX / Whiteout particles
```

---

## 2. Flight / Player / Input

### 2.1 Flight model (`flight-controller.ts`)
First-person bat flight with banking turns and soft terrain-floor collision.
- **Velocity blending:** desired velocity → actual via exponential smoothing (rate ≈ 3.5/s).
  Position integrates `position += velocity·dt`.
- **Components:** forward (pitch-driven, on XZ plane), strafe (perpendicular, `sin(bank)·strafeSpeed`),
  vertical (`-sin(pitch)·climbSpeed + |sin(bank)|·liftAssist`).
- **Banking → yaw:** `yaw -= bankRad · turnSpeed · dt · 0.8` (steeper bank = tighter turn).
- **Orientation smoothing:** pitch & roll exponentially blended with `lookSmoothing = 0.12 s`;
  internal scales pitch×0.78, bank×0.92; input clamps pitch ±65°, roll ±75°.
- **Altitude floor:** min **5 m** above terrain; below floor → lerp up (0.28/frame) and damp
  downward velocity (`vy *= 0.15`). Height via black-box `sampleHeight(x,z)`.
- **Camera bob:** subtle `sin` offsets on camera (x ≈ 0.04, y ≈ 0.06) — cosmetic.
- **Rig:** `THREE.Group` with child camera; rotation applied as Euler `YXZ`
  `(-pitch, yaw, -bank·0.55)`.

### 2.2 Speed model
| Mode | Value | Source |
|---|---|---|
| Cruise | **11 m/s** | baseline forward |
| Boost | 18 m/s × **3** = ~54 m/s | Space / trigger |
| Brake | -18 × 0.55 (descent only, never reverses) | S key |
| Strafe | 5.5 m/s | roll angle |
| Climb | 8 m/s | pitch |
| Lift assist | 1.4 m/s | passive when banking |

Defaults live in `BAT_FLIGHT_DEFAULTS` (`config.ts`); fields are public/runtime-tunable.

### 2.3 Input mapping
**Keyboard** (`keyboard-input.ts`): `W` climb (−15°), `S` descend (+28°), `A`/`D` roll ∓40°,
`Space` boost; `1–7` direct sense select (edge-triggered); `↑/→` next biome, `↓/←` prev biome;
`I` toggle color invert. Continuous keys via a Set; one-shot actions via `pending*` consumed per tick.

**Controller / WebXR** (`controller-input.ts`): right thumbstick = roll (axis 2) + pitch (axis 3),
deadzone 0.15; trigger ≥0.5 = boost; A/B = next/prev sense (edge); stick-click = invert toggle;
left trigger = boost alt. Resolves controllers via `renderer.xr.getSession().inputSources`
(handedness) with desktop `navigator.getGamepads()` fallback. Orientation only overrides when
stick is moved, otherwise yields to external `updatePlayer()` orientation.

### 2.4 Update wiring (`player.ts`)
`updatePlayer(orientation{pitch,roll}, speed{accelerate,brake}, state, dt)` injects external
(network) input → `player.setOrientation` / `player.setSpeed`. Call order each tick:
keyboard → controller (overrides) → `controller.tick(dt, sampleHeight)`.

---

## 3. World / Terrain / Biomes / Decoration

### 3.1 Streaming layout (`world.ts`, `world-config.ts`)
Infinite, anchor-based chunk streaming. Chunk **112 m**, terrain **40×40** segments, **build
radius 2** / **keep radius 3** (hysteresis), **max 3 builds/frame**, anchor advances per chunk
boundary crossed. Chunks built off-main-thread via worker pool. Each chunk also bakes an
**acoustic field** (terrain samples on a 4 m grid) so echo lookups are O(1) nearest-cell.

### 3.2 Terrain generation
14-layer seeded noise stack (master seed `0xba75eed`, per-layer derived seeds) + coordinate
warp (~52 m). Height composed from named contributors:
`height = continent·24 + rolling·9 + (forest/grass/barren/mountain/snow/desert relief) + detail − canyonCut`.
Mountains dominate via `mountainMass·(22 + ridge·mountainHeight·0.95 + cliff·mountainHeight·0.32)`
(default `mountainHeight = 68` → ~40–65 m peaks). Typical span 0–120 m; water implicit ≈ 0 m.
*(Full per-layer scale/octave/gain table and contributor formulas exist in source — reproduce
the values, but the WebGPU rewrite may move this to a compute pass; the design intent is
"layered FBM + ridge noise + biome-weighted relief + coordinate warp".)*

### 3.3 Biomes
Six mutually-exclusive biomes via **hybrid Voronoi + noise** placement: Voronoi cells **280 m**
(jitter ±60%, blend 120 m), weighted **92% Voronoi + 8% local noise** so every biome appears
within a predictable distance while noise adds local character. Each biome has a scoring
function over temperature / moisture / ruggedness / highland / basin signals. Debug override can
force a single biome. Biome weights also drive height relief, decoration density, fog tint, and
echo material reflectivity.

### 3.4 Derived altitude fields
After height: `altitudeFactor` (gray tint 14→86 m), `vegetationFactor` (treeline 8→58 m),
`midAltitudeFactor` (bell 22–54 m), `alpineFactor` (48→88 m), `cliffiness`. These gate flora,
colours, and acoustics.

### 3.5 Decoration (`decoration-data.ts`, `decoration-placer.ts`)
**16 instanced scatter passes**, deterministic per-chunk seed, biome-coupled density. Capacity
formulas scale off `treeDensity` / `grassDensity` / `mountainHeight`. Categories & intent:
pine/common/birch/willow trees (forest), dead/snow/palm trees (niche biomes), cacti (desert),
rocks/moss-rocks/snow-rocks (mountain/forest/snow), grass (densest, ~260+), bushes, flowers,
forest props (stumps/logs), snow plants. Placement: sample candidate → biome gatekeep → saturated
probability from biome+derived weights → seeded accept → seeded transform/scale → vertex-colour
tint. Each type is tagged with an **echo material** (`tree`/`rock`/`grass`) carrying base
reflectivity (rock 0.84 > tree 0.42 > grass 0.28) + biome boost. Four shared materials
(crown/trunk/rock/grass) back all 16 — `→ redo as TSL material variants`.

### 3.6 Echo acoustic sampling
Per-hit the world resolves **density** (cluster mix + biome boost), **ruggedness**
(slope + cliffiness + mountain mass + vertical offset; slope from exact uncached height), and
**reflectivity** (material base + biome). This feeds both the visual reveal and the audio synth.

---

## 4. Perception / Sense-Switching (design intent — `→ redo in TSL`)

`SenseSwitchManager` + `PerceptionRouter` drive **7 modes** in a linear cycle. Switching:
keys `1–7` direct, A/B controller = next/prev. Auto trigger zones/rings exist but are
**disabled** (`AUTO_MODE_TRIGGERS_ENABLED = false`). **Transition ≈ 4.5 s** with choreographed
easing (styling leads radius change so newly-revealed terrain is always styled before visible).
Each mode sets fog near/far, a **view-radius cutoff** (how far you see), depth-band styling, and
a layer mask. Modes self-rank (luft 0 → normal 6); higher-rank effects (edge/noir, stacked
duft/netzwerk layers, bee visibility) blend in additively by rank.

| # | Mode | Sense it evokes | Player experience | View radius | Reveals |
|---|---|---|---|---|---|
| 1 | **Luft** | sensory void / white-out | total whiteout, only fog + drifting particles; world culled | 0 (nothing) | nothing |
| 2 | **Echo Location** | bat sonar | tight dark bubble; terrain dark at centre → readable at edge; quantized "papercut" depth bands; pulse afterglow | ~120 m | geometry via depth bands + pulses |
| 3 | **Infrarot** | thermal vision | wide field, thermal tint, edge emphasis + noir shadowing, subtle banding | ~620 m | heat-tinted terrain |
| 4 | **Duft** | smell / chemosense | scent hotspots bloom & drift as particle clouds; **collectable** (radius ~5.5 m + source size, 8 s respawn); accumulates chemosense score | ~620 m | scent gradient fields |
| 5 | **Netzwerk** | collective/neural network | wide field, red accent, node-link overlay over organisms/regions | ~680 m | connectivity graph + boid flocks |
| 6 | **Depth Debug** | dev diagnostic | quantized greyscale depth bands for inspection | ~460 m | raw depth |
| 7 | **Normal** | daylight human vision | full-colour lit scene, blue sky gradient, sun/moon | ~500 m | everything, naturalistic |

**Cross-mode systems:** biome-tinted fog (blend 0.18 dark / 0.60 day, lerp 1.4/s); inverted-depth
greyscale is the core spatial cue for modes 2–5 (`uDepthLevels` quantization is a live dev-console
tweak); bee swarm visible only for rank ≥ echo (density 0.12 in echo, 1.0 in infrared+); per-mode
audio coupling (echo clicks, smell collection chime, network hum). **Implementation today:**
shared echo uniforms + material overrides + depth post-process + (disabled) watercolor/Kuwahara
post-process + `THREE.Points` chemosense particles — **all of this is the rendering layer to
re-express in TSL/compute; only the intent above carries over.**

---

## 5. Audio / Acoustics (`audio.ts`, `acoustics.ts`)

Real-time **Web-Audio sonar synthesis** — *not* sample playback for the echo. Renderer-agnostic,
so largely reusable as-is in the rewrite.

- **Graph:** per-pulse **voice** = 3 harmonic layers (low sine / mid+high triangle, each with a
  tone bandpass/lowpass + a noise layer) → per-voice mix → master gain → **compressor**
  (thr −26 dB, ratio 3.2:1) → makeup ×1.35 → destination. Up to **4 concurrent pulses**.
- **Mapping (echo hit → sound):** hits binned into 8–18 temporal slices; **distance→pitch** is
  logarithmic (`110 → ~930 Hz`, curve `pitchCurve 1.65`); **density→texture richness**;
  **material→timbre** (tree soft lowpass, rock tight bandpass, grass diffuse highpass, moth bright
  Q≈12.6 + 3-osc "sparkle", terrain mid); **ruggedness→filter Q**; **pan** from hit azimuth
  (`stereoWidth`). Per-hit transients fire at each hit's delay; harmonic drone layers track the
  slice envelope.
- **Static audio assets:** background loop `Hintergrundmusik.mp3` (gain 0.22), transition stinger
  `Übergang.wav` (gain 0.72), and 5 intro narration clips (§6).
- **Intent:** the soundscape *is* the navigation aid in the dark modes — built from the same world
  hits as the visuals, never decoupled UI sounds.

---

## 6. Intro / Onboarding (`intro-sequence.ts`)

On first entry to each sense, plays one narration clip (gain 0.95), detached after playback:
`luft → intro/Nichts.mp3`, `echo → intro/A_Bat_echo.mp3`, `infrarot → intro/fire_beetle_red.mp3`,
`duft → intro/bee_chemical.mp3`, `netzwerk → intro/swarm.mp3`. The `Übergang.wav` stinger plays on
each mode change.

---

## 7. Full parameter catalog (28)

| ID | Label | Group | Min | Max | Default | Unit |
|---|---|---|---|---|---|---|
| cruiseSpeed | Cruise Speed | Flight | 4 | 24 | 11 | m/s |
| boostSpeed | Boost Speed | Flight | 6 | 34 | 18 | m/s |
| strafeSpeed | Bank Drift | Flight | 0 | 14 | 5.5 | m/s |
| climbSpeed | Climb Speed | Flight | 2 | 18 | 8 | m/s |
| turnSpeed | Turn Response | Flight | 0.4 | 2.4 | 1.2 | — |
| lookSmoothing | Look Smoothing | Flight | 0.04 | 0.35 | 0.12 | s |
| minAltitude | Ground Clearance | Flight | 2 | 18 | 5 | m |
| echoRange | Echo Range | Echo | 36 | 180 | 132 | m |
| echoSpeed | Wave Speed | Echo | 20 | 90 | 58 | m/s |
| echoCooldown | Pulse Cooldown | Echo | 0.4 | 4.5 | 0.85 | s |
| autoPulseInterval | Auto Pulse | Echo | 0 | 8 | 2.1 | s |
| revealDuration | Ping Tail | Echo | 0.08 | 0.9 | 0.28 | s |
| revealIntensity | Reveal Intensity | Echo | 0.3 | 2.4 | 1.5 | — |
| wireThickness | Wire Strength | Echo | 0.5 | 2.5 | 1.3 | — |
| audioPitchCurve | Pitch Curve | Audio | 0.8 | 2.8 | 1.65 | — |
| audioDistanceVolume | Distance Volume | Audio | 0.4 | 2 | 1.08 | — |
| audioMaxLayers | Max Layers | Audio | 1 | 3 | 3 | — |
| audioDensityComplexity | Density Complexity | Audio | 0.2 | 2 | 1.1 | — |
| audioDecay | Audio Decay | Audio | 0.4 | 5 | 2.35 | s |
| audioDroneIntensity | Drone Intensity | Audio | 0 | 1.5 | 1.08 | — |
| audioMaterialInfluence | Material Influence | Audio | 0 | 1.5 | 0.82 | — |
| audioStereoWidth | Stereo Width | Audio | 0 | 1 | 0.32 | — |
| audioMasterVolume | Audio Level | Audio | 0 | 1.6 | 0.82 | — |
| biomeScale | Biome Scale | World | 0.0007 | 0.0024 | 0.00115 | — |
| mountainHeight | Mountain Height | World | 24 | 120 | 68 | m |
| treeDensity | Tree Density | World | 6 | 44 | 24 | — |
| grassDensity | Grass Density | World | 6 | 80 | 44 | — |
| fogIntensity | Mist Density | World | 0.2 | 1 | 0.66 | — |
| baseVisibility | Base Visibility | World | 0 | 0.035 | 0.0195 | — |

---

## 8. Creatures / Swarms

### 8.1 Bee swarm (`bee-swarm.ts`)
**54 bees** (`BEE_COUNT`), ambient/visual only (not collectible). **Non-deterministic**
(`Math.random()` wander, respawn on despawn). Spawn ring 18–260 m, despawn 320 m. Flocking via
velocity damping (course change every 1.4–4.2 s), wobble, model `models/bee/bee.glb` (rigged,
cloned per-bee with skeleton anim), additive 3-sprite glow. Visibility gated by mode rank.
→ small population, fine on CPU; sprite glow is rendering.

### 8.2 Moth swarm (`moth-swarm.ts`, `fly-model.ts`)
**Up to 36 active** (`maxActive`), **deterministic** seeded per chunk (+ 6 escort moths near the
player so there's always prey). Orbit+drift hover motion (height 3.6–12.4 m, biome-modulated),
single **InstancedMesh**. **Collection:** catch radius **4.2 m**, collected keys persisted
(never respawn), triggers burst FX + increments score; active moths fed to echo probe as bonus
targets; scaled up ×~1.64 in echo mode for readability. Biome-tinted reddish colours.
→ **good GPU-compute candidate** in the rewrite (orbit math per instance).

### 8.3 Network boids (`network-layer.ts`)
Bird flocks (separation/alignment/cohesion) + ground node/line graph, cell-seeded, visible only
in **netzwerk** mode. Model `models/bird/bird_BS.glb`.

### 8.4 Player bat mount (`bat-mount.ts`)
First-person bat body fixed under/behind camera (pos `(0,-0.72,-1.12)`, rot `(0.14, π, 0.02)`,
scale 7.4), dark unlit double-sided material, depth-test off (always in front), hidden in
non-echo modes. **Model `./assets/Bat/VAMP_BAT.OBJ` — see §9 broken-asset warning.**

---

## 9. Asset wiring (summary — full inventory in `asset-inventory.md`)

- **Vegetation/rocks:** 150 `.obj`+`.mtl` under `static/sinneswandler_test1/models/`, loaded by
  `world-models.ts` (`BASE_URL=/sinneswandler_test1/models`). **~79 are orphaned** (incl. the
  entire `trees/autumn/` set) — only `_1`–`_3`-ish variants per category are wired.
- **Bee/bird:** `models/bee/bee.glb`, `models/bird/bird_BS.glb` (in `static/`).
- **Audio:** 7 files (`Sound/` + `intro/`), all referenced.
- **⚠ Broken bundled models:** `bat-mount.ts` and `fly-model.ts` load
  `./assets/Bat/VAMP_BAT.OBJ` and `./assets/Fly/19912_Horse_fly_V1_.obj` via `import.meta.url`,
  but **no `assets/` directory exists in the source tree** — only an unextracted
  `Bat.rar` (1.2 MB) sits beside the code. So the **bat mount and moth geometry loads currently
  fail at runtime** (the fly loader throws; the bat mount silently has no model). The rewrite must
  source/extract these (the bat OBJ is presumably inside `Bat.rar`) or replace them with new assets.

---

## 10. Notes for the rewrite (carry-over vs redo)

**Carries over (renderer-agnostic, reuse largely as-is):** flight model & input mapping, world
streaming logic & noise/biome/decoration *design* (values + rules), echo acoustic sampling
*model*, the entire **audio synth**, sense-switching *state machine & intent*, intro sequence,
parameter catalog, moth/bee/network *behaviour rules*, collection mechanics & scoring.

**Must be rebuilt for WebGPU/TSL (`→ redo`):** every material & shader (terrain/decoration echo
reveal, depth post-process, watercolor/Kuwahara, chemosense particles, sky), the depth-band
"papercut" styling, instanced-mesh rendering paths, and any GPU-coupled visibility/uniform plumbing.
Swarm/particle simulation is a candidate to move from CPU to **TSL compute + storage buffers**.
