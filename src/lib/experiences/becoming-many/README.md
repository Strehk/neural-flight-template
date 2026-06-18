# Becoming Many

A **WebGPU + WebXR scaffold**. Long-term goal: mirror the `sinneswandler_test1`
experience exactly — its perception / sense-switching world — but rebuilt from the
ground up on `three/webgpu` + TSL + WebXR so the Quest performance budget is
respected by construction instead of retrofitted.

## Status: scaffolding only

Right now this experience does the bare minimum to prove the pipeline runs:

- Mounts a `WebGPURenderer` (via the shared `/vr` route + loader).
- Draws one spinning cube whose colour is a **TSL node graph** (`colorNode`).
- `Enter VR` works through the same `VRButton` / `renderer.xr` path.

There is **no movement, terrain, audio, or sense-switching yet** — those are the
roadmap below.

## How it plugs in

Unlike the other experiences (WebGL), this one sets `renderer: "webgpu"` in its
`manifest.ts`. That single flag is the whole renderer-agnostic contract:

- `src/lib/experiences/types.ts` — `RendererKind`, `AnyRenderer`, and the optional
  `manifest.renderer` field.
- `src/routes/vr/+page.svelte` — reads the flag and creates a `WebGPURenderer`
  (`await renderer.init()`) instead of a `WebGLRenderer`. The WebGL-only dev-console
  GPU timer is skipped for WebGPU.

Everything else (manifest lifecycle, catalog registration, settings sidebar, node
editor) is identical to a normal experience.

## Files

| File          | Role                                                          |
| ------------- | ------------------------------------------------------------- |
| `index.ts`    | Re-exports the manifest.                                      |
| `manifest.ts` | Identity, `renderer: "webgpu"`, parameters, scene defaults.   |
| `scene.ts`    | `setup`/`tick`/`dispose` — the TSL cube. Grow the world here. |
| `player.ts`   | `updatePlayer` no-op stub — future flight controller.         |
| `settings.ts` | `applySettings` — `rotationSpeed`, `spin`.                    |

## Planning docs (`docs/`)

The full rewrite plan and the captured Sinneswandler design now live in [`docs/`](./docs/):

- [`plan.md`](./docs/plan.md) — the **meta plan**: vision, goals/non-goals, reuse-vs-rebuild
  table, phased milestones (M0–M6), risks, open questions.
- [`sinneswandler-spec.md`](./docs/sinneswandler-spec.md) — faithful **design spec** of the
  source experience (structure, flight, world, senses, audio, creatures, 28 parameters) —
  intent, not rendering.
- [`asset-inventory.md`](./docs/asset-inventory.md) — every model/audio asset, the **broken
  bat/fly models**, and the 79 orphaned meshes.

## Roadmap toward mirroring Sinneswandler

(Summary — see [`docs/plan.md`](./docs/plan.md) §6 for the full milestone detail.)

1. **Flight controller** — port `flight-controller.ts` to a player rig (`player.ts`).
2. **World / terrain** — TSL/compute terrain to replace the WebGL terrain samplers.
3. **Sense-switching** — re-express the `PerceptionRouter` / material overrides as
   TSL node variants per sense.
4. **Swarms** — bee/moth swarms as GPU compute (TSL `Fn` + storage buffers).
5. **Audio + networking** — reuse the existing (renderer-agnostic) modules.

## Caveat

WebGPU + WebXR is new. Desktop preview renders reliably; immersive-vr on a given
headset/browser depends on that device's WebGPU-XR support. The scaffold is the
proving ground for exactly that.
