# Becoming Many — Meta Plan

> **What this is.** The roadmap for rebuilding the `sinneswandler_test1` experience as
> **Becoming Many**: a WebGPU + WebXR (`three/webgpu` + TSL) experience that mirrors
> Sinneswandler's *design* — its world, flight, senses, audio, and creatures — but is built
> **performance-first from the ground up**, so the Quest budget is respected by construction
> rather than retrofitted.
>
> **Read alongside:**
> - [`sinneswandler-spec.md`](./sinneswandler-spec.md) — the faithful "what & why" of the source experience (design intent, not rendering).
> - [`asset-inventory.md`](./asset-inventory.md) — every model/audio asset, the broken bat/fly models, and the 79 orphaned meshes.
>
> **Current state of Becoming Many:** scaffolding only — mounts a `WebGPURenderer` via the shared
> `/vr` route, draws one TSL-coloured spinning cube, `Enter VR` works. No movement, world, audio,
> or senses yet. The single contract that distinguishes it from the WebGL experiences is
> `manifest.renderer: "webgpu"`.

---

## 1. Vision

Recreate the *feeling* of Sinneswandler — a poetic night flight where the near-invisible world
is read through shifting animal senses, each fused with a synthesized soundscape — on a renderer
and data architecture chosen so that **terrain, swarms, and per-sense reveal effects scale on the
GPU** and hold frame budget in stereo on a Quest. The experience design is fixed (it already
exists and works); this is a **re-implementation**, not a redesign. Where the original retrofitted
WebGL, we get to choose the right WebGPU/TSL/compute primitive up front.

## 2. Goals

- **Design parity** with Sinneswandler: same 7 senses, same flight feel, same world character,
  same audio coupling, same collection/score loop (see spec §0).
- **Performance-first**: hold a stereo Quest frame budget with terrain + decoration + swarms +
  per-sense post effects active. Compute-driven where it pays (terrain, swarms, particles).
- **Renderer-agnostic reuse**: keep the parts that are already renderer-independent (flight,
  input, audio synth, sense state machine, world *rules*) and only rebuild the rendering layer.
- **Clean asset pipeline**: glTF + compression, no 150 separate OBJ fetches, no missing models.
- **WebXR-correct from the start**: stereo + foveation considerations baked into the render path,
  not bolted on.

## 3. Non-goals

- **Not a gameplay redesign.** Mechanics, parameters, and senses are ported as-specified.
- **Not a port of the WebGL shaders.** Every material/post-process is re-expressed in TSL; the
  GLSL is reference for *intent* only (spec §4, §10).
- **Not touching the shared platform.** `/vr` route, manifest contract, dev-console,
  controller/gyro, worldgen worker pool, noise/cache libs are consumed as-is. Where a shared
  piece is WebGL-only (e.g. the dev-console GPU timer), we note it but don't rewrite it here.
- **Not chasing visual fidelity beyond the original.** Match the stylized look; don't gold-plate.

## 4. Architecture principles

1. **Compute where it scales.** Terrain height/biome fields, swarm motion (moths, bees, network
   boids), and particle systems (chemosense, whiteout) are candidates for **TSL `Fn` + storage
   buffers** instead of per-frame CPU loops. Decide per-system in its milestone (§6).
2. **One material model, many sense-variants.** The 7 senses are *view modes* over the same world.
   Express them as **TSL node-graph variants / uniforms over shared materials** (echo reveal,
   depth bands, thermal, daylight) rather than swapping material sets. Keep the "papercut" depth
   banding as a node function reused across modes.
3. **Renderer-agnostic core stays pure.** Flight, input, audio, sense state machine, world rules,
   scoring — no `three` rendering types leak in. They already largely satisfy this; preserve it.
4. **Streaming stays off the main thread.** Keep the chunk scheduler + worker-pool design; the
   rewrite changes what a "built chunk" *is* (GPU buffers / instanced data), not the scheduling.
5. **Budget is a first-class artifact.** Each milestone lands with a measured frame-time number on
   target hardware (desktop + Quest), tracked in the dev-console.

## 5. Reuse vs rebuild (at a glance)

| Subsystem | Disposition | Notes |
|---|---|---|
| Flight controller + input mapping | **Reuse** (port values) | renderer-agnostic; spec §2 |
| Audio synth (`audio.ts`/`acoustics.ts`) | **Reuse** | Web-Audio, renderer-agnostic; spec §5 |
| Sense-switch state machine + intent | **Reuse logic, rebuild visuals** | spec §4 |
| World streaming / scheduler / worker pool | **Reuse design** | chunk *payload* becomes GPU data |
| Terrain noise/biome/decoration *rules* | **Reuse rules** | candidate to move to compute; spec §3 |
| Echo acoustic sampling model | **Reuse** | feeds both audio + reveal; spec §3.6 |
| Moth/bee/network behaviour | **Reuse rules** | moths → GPU compute candidate; spec §8 |
| All materials / post-processes | **Rebuild in TSL** | echo reveal, depth bands, thermal, chemosense particles, sky, watercolor; spec §4/§10 |
| Decoration instancing path | **Rebuild** | TSL instanced materials; convert assets |
| Asset format (OBJ/MTL) | **Rebuild** | → glTF/Draco; fix missing bat/fly; spec §9, inventory |

## 6. Phased milestones

Each milestone is independently demoable, ends with a frame-time measurement, and builds on the
existing scaffold. Ordering favors **the spine first** (move + see ground), then **the soul**
(senses + audio), then **density** (world + swarms), then **polish + XR hardening**.

### M0 — Foundations (mostly done)
- ✅ WebGPU renderer mounts via `/vr`, TSL cube, Enter VR works.
- **Add:** dev-console frame-time already present for WebGPU (timestamp queries) — confirm it
  reads cleanly; establish the **budget dashboard** (frame ms, draw calls) as the milestone gate.
- **Add:** a TSL "material kit" skeleton — shared node helpers (depth-band function, fog, fresnel
  edge) that later senses reuse.

### M1 — Flight + bare ground (the spine)
- Port the flight controller + keyboard/controller input into `player.ts` (spec §2, values verbatim).
- Flip `manifest.interfaces` orientation/speed on.
- A single **flat or single-chunk TSL terrain** to fly over with the min-altitude floor working.
- Camera bob, banking, boost. **Gate:** smooth flight desktop + Quest, frame-time logged.

### M2 — Senses skeleton + audio (the soul)
- Port the **sense-switch state machine** (7 modes, cycle order, ~4.5 s transition, key/controller
  switching) — logic only, spec §4.
- Implement **2 senses end-to-end as the pattern**: **Normal** (daylight) and **Echo Location**
  (dark bubble + depth-band "papercut" via the M0 depth-band node + per-mode view-radius/fog).
- Wire the **audio synth** (reuse `audio.ts`) to echo pulses (manual + auto) over the M1 terrain's
  echo sampling. **Gate:** switch Normal↔Echo, pulse reveals + sounds, transition feels right.

### M3 — Real streaming world (density part 1)
- Re-home the **chunk scheduler + worker pool**; define the GPU chunk payload (terrain mesh +
  instanced decoration buffers).
- Port **terrain generation rules** (spec §3.2) — decide here: CPU-in-worker (port as-is) vs
  **TSL compute** height/biome field. Recommend starting CPU-in-worker for parity, then moving
  the hot path to compute once correct.
- Port **biome placement** (Voronoi+noise) and **decoration scatter** (16 instanced passes) with
  converted glTF assets (asset-inventory §7). **Gate:** infinite world streams within budget.

### M4 — Remaining senses (the soul, complete)
- Implement **Infrarot, Duft (chemosense + collection), Netzwerk, Luft, Depth-Debug** as TSL
  view-variants + the chemosense/network/whiteout layers (spec §4).
- **Chemosense particles** and **whiteout drift** → TSL points/compute.
- Hook **intro narration** + transition stinger per sense (spec §6). **Gate:** all 7 senses,
  biome fog tinting, score from scent collection.

### M5 — Creatures (density part 2)
- **Moth swarm** as **GPU compute** (orbit/drift in storage buffers, instanced draw) with
  deterministic seeding + collection (catch radius, persisted keys, score, echo bonus targets).
  Fix/convert the **fly model** (currently missing — inventory §4).
- **Bee swarm** (small, CPU ok) + **network boids** in netzwerk mode.
- **Player bat mount** — fix/convert `VAMP_BAT.OBJ` (currently missing). **Gate:** swarms +
  collection at budget.

### M6 — XR hardening + polish
- Stereo correctness, foveation, controller ergonomics on Quest; verify WebGPU-XR on target
  device/browser (scaffold caveat).
- Sky/moon, watercolor/edge post (optional, was disabled), final parameter tuning to match the
  original's feel. **Gate:** full experience in immersive-vr within budget.

## 7. Risks & open questions

**Risks**
- **WebGPU + WebXR maturity.** Immersive-vr under WebGPU is device/browser-dependent (scaffold
  README caveat). M6 may surface blockers; keep desktop preview as the always-working fallback.
- **Compute-vs-parity tension.** Moving terrain/swarms to compute risks diverging from the
  original's exact output. Mitigate: port to CPU/worker first for parity, then port the hot path to
  compute behind a flag and diff visually.
- **Missing source models** (bat, fly) block creature parity until sourced/converted (inventory §4).
- **TSL surface area.** Re-expressing 7 senses + depth banding + thermal + particles in TSL is the
  bulk of the work and the least de-risked; M2's two-sense vertical slice is the proving ground.
- **Asset load cost.** 150 OBJ/MTL fetches must become compressed glTF or load time regresses.

**Open questions (decide before/within the relevant milestone)**
1. **Terrain on CPU-worker or compute?** (M3) — recommend parity-first, compute-later.
2. **Prune or adopt the 79 orphaned meshes?** (M3/asset pipeline) — affects variety vs payload.
3. **Auto sense-triggers** (zones/rings) are disabled in the original — port them or keep
   key/controller-only switching? (M2/M4)
4. **Watercolor/Kuwahara post** is disabled in the original — in or out of scope? (M6)
5. **Target Quest model + browser** for the budget gate — pins the perf numbers each milestone
   must hit.
6. **Does the rewrite keep all 28 parameters** exposed, or trim to the ones that matter for the
   new pipeline? (cross-cutting)

## 8. Definition of done

Becoming Many is "done mirroring Sinneswandler" when, in immersive-vr on the target Quest within
the agreed frame budget: you can fly the bat over an infinite streamed world, switch between all
7 senses with their distinct reveal + audio, collect moths and scent hotspots into the score, and
the swarms and intro narration are present — with no WebGL fallback and no missing assets.
