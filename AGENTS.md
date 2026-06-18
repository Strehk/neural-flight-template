# 🤖 AI Development Guide

Instructions for Claude, Copilot, and other AI coding assistants.

> **CLAUDE.md** in the repo root points here. This file is the single source of
> truth for how to write graphics code in this project.

---

## Project Context

**ICAROS VR Starter** — WebXR flight simulation for Meta Quest controlled by ICAROS fitness device.

| Stack            | Tool                                  |
| ---------------- | ------------------------------------- |
| Framework        | SvelteKit (Svelte 5 runes)            |
| Runtime          | Bun                                   |
| 3D Engine        | Three.js **r182** (`three/webgpu`)    |
| Shaders          | **TSL** (Three.js Shading Language)   |
| GPU compute      | WebGPU compute kernels + storage bufs |
| VR/AR            | WebXR API                             |
| UI               | bits-ui                               |
| Linting          | Biome                                 |
| Type Checking    | TypeScript (strict)                   |

---

## 🚨 WebGPU + TSL — THE NON-NEGOTIABLE RENDERING RULES

All **new** graphics work in this repo targets **WebGPU + TSL**, mirroring the
official three.js example
[`webgpu_compute_particles_fluid`](https://threejs.org/examples/?q=webgpu#webgpu_compute_particles_fluid).
The reference implementation in this repo is
`src/lib/experiences/becoming-many/scene.ts` — read it before writing new GPU code.

### ✅ ALWAYS

- ✅ **Import three classes from `three/webgpu`** — never from plain `three` in a
  WebGPU module. `WebGPURenderer`, `Scene`, `Mesh`, `Sprite`, all the
  `*NodeMaterial` classes and `*BufferAttribute` classes live there (it re-exports
  core three too).
  ```ts
  import * as THREE from "three/webgpu";
  ```
- ✅ **Import TSL functions from `three/tsl`** — the node namespace: `Fn`, `If`,
  `Loop`, `uniform`, `instancedArray`, `instanceIndex`, `storage`, `vec3`,
  `float`, `uv`, `time`, `deltaTime`, `hash`, noise (`mx_noise_vec3`), etc.
  ```ts
  import { Fn, instancedArray, instanceIndex, uniform, vec3, time } from "three/tsl";
  ```
- ✅ **Author materials with TSL node slots**, not GLSL. Use the `*NodeMaterial`
  variants (`MeshStandardNodeMaterial`, `SpriteNodeMaterial`,
  `PointsNodeMaterial`, …) and assign `colorNode` / `positionNode` /
  `emissiveNode` / `scaleNode` / `opacityNode` / `roughnessNode` etc.
- ✅ **Keep per-particle / per-element state in GPU storage buffers** via
  `instancedArray(count, type)`. Drive simulation with **compute kernels**
  (`Fn(() => …)().compute(count)`) dispatched with `renderer.compute(kernel)`.
  Bind the buffer to the render material with `.toAttribute()` or
  `.element(instanceIndex)` — **no CPU round-trip per frame**.
- ✅ **`await renderer.init()`** before any manual `render()` / `compute()` /
  `computeAsync()` outside the animation loop (the `/vr` route already does this
  before `setup()` runs — so one-time init compute in `setup()` is safe).
- ✅ **Steer shaders via `uniform()` nodes**: create once, mutate `.value` from JS
  each frame or on a settings change. Cheapest possible steering path.
- ✅ **`renderer.setAnimationLoop(fn)`** — never `requestAnimationFrame` (required
  for WebXR, and it lazy-inits the renderer on the first frame).

### ❌ NEVER

- ❌ Import `WebGPURenderer` or any node material from plain `'three'` — they only
  exist in `'three/webgpu'`.
- ❌ Use deprecated/removed paths: `three/nodes`, `three/examples/jsm/nodes/*`,
  the old `three/examples/jsm/tsl`, or the `three-nodes` package. **Only**
  `three/webgpu` (classes) + `three/tsl` (functions).
- ❌ Use removed TSL identifiers: **`timerLocal` / `timerGlobal` / `timerDelta`
  are gone** → use `time` / `deltaTime`. **`ShaderNodeMaterial` is not exported**
  → use a concrete `*NodeMaterial` or base `NodeMaterial`.
- ❌ Index storage buffers with `[]` → use `.element(index)`; struct fields →
  `.get('field')`.
- ❌ Write GLSL `ShaderMaterial` / `RawShaderMaterial` for new work — node
  features are WebGPURenderer-only in r182. Port GLSL to TSL.
- ❌ `any` types, `requestAnimationFrame`, top-level three imports without
  `onMount()`, forgetting `dispose()`.

> **Legacy exception:** the older WebGL experiences (e.g. `sinneswandler_test1`)
> still import from plain `three` + `WebGLRenderer`. Leave them as-is unless
> migrating. The rules above govern **all new graphics code** and anything under
> `becoming-many/`.

---

## 📚 WebGPU + TSL Key Findings (three.js r182, verified against the installed build)

Training data for TSL is frequently **outdated** — the API churned hard. The
following is verified against `three@0.182.0` (`node_modules/three/build/*`) and
the official r182 examples. Treat it as ground truth over memory.

### Imports — what lives where

- **`three/webgpu`** (classes, PascalCase): `WebGPURenderer`; node materials
  `MeshBasicNodeMaterial`, `MeshStandardNodeMaterial`, `MeshPhysicalNodeMaterial`,
  `PointsNodeMaterial`, `SpriteNodeMaterial`, `LineBasicNodeMaterial`,
  `ShadowNodeMaterial`, base `NodeMaterial`, …; storage attrs
  `StorageInstancedBufferAttribute`, `StorageBufferAttribute`,
  `IndirectStorageBufferAttribute`; `ComputeNode`, `Node`; `PostProcessing`,
  `PMREMGenerator`; **plus all of core three re-exported** (Scene, Mesh, Vector3…).
- **`three/tsl`** (functions, camelCase): control flow `Fn`, `If`/`.ElseIf`/`.Else`,
  `Loop`, `Switch`, `Return`, `Break`, `Continue`; types `float bool int uint
  vec2 vec3 vec4 mat3 mat4 ivec3 color`; data `uniform`, `uniformArray`,
  `attribute`, `storage`, `instancedArray`, `instanceIndex`, `vertexIndex`,
  `struct`, `array`, `texture`, `textureStore`; builtins `time deltaTime uv
  positionLocal positionWorld normalLocal normalWorld cameraPosition screenUV`;
  math `add sub mul div mix clamp smoothstep step pow sin cos abs floor fract dot
  cross normalize length`; atomics `atomicAdd atomicStore atomicLoad atomicMax`;
  barriers `workgroupBarrier storageBarrier`; noise `mx_noise_float`,
  `mx_noise_vec3`, `mx_fractal_noise_vec3`, `triNoise3D`, `hash`, `rand`; sprite
  helper `shapeCircle`.

### Renderer setup

```ts
const renderer = new THREE.WebGPURenderer({ antialias: true });
// forceWebGL: true → force the WebGL2 fallback backend
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(w, h);
await renderer.init();              // required before manual render()/compute()
renderer.setAnimationLoop(animate); // lazy-inits if you skip the await
```

- Sync `render()` / `compute()` are correct **inside** the animation loop (the
  official examples do this). `renderAsync` / `computeAsync` return Promises and
  are only needed when the CPU must await the GPU (read-back, one-time init).
- Detect backend: `renderer.backend.isWebGPUBackend`.
- Reading a storage buffer in the **vertex** stage (e.g. `positionNode = Fn(() =>
  buffer.element(instanceIndex).get('position'))()`) needs
  `new WebGPURenderer({ requiredLimits: { maxStorageBuffersInVertexStage: 1 } })`.
  Using `buffer.toAttribute()` does **not** (it's a plain instanced attribute).

### Node materials

```ts
const mat = new THREE.MeshStandardNodeMaterial();
mat.colorNode    = texture(map).mul(color(0xff8800));
mat.positionNode = positionLocal.add(normalLocal.mul(sin(time))); // vertex displace
mat.roughnessNode = uniform(0.5);

const u = uniform(1.0);            // steerable uniform
mat.emissiveNode = color(0xffffff).mul(u);
// per frame: u.value = 0.5 + 0.5 * Math.sin(t);
// or: u.onFrameUpdate(() => …) / u.onObjectUpdate(({object}) => …)
```

`Fn` shader functions, control flow, ternary:
```ts
const osc = Fn(([t = time]) => t.sin().mul(0.5).add(0.5));
mat.colorNode = mix(color(0x000000), color(0xffffff), osc());
If(cond, () => { /* … */ }).ElseIf(c2, () => { /* … */ }).Else(() => { /* … */ });
Loop(count, ({ i }) => { /* … */ });
const v = select(cond, a, b);
```

### Compute + storage buffers — the canonical particle pattern

```ts
import * as THREE from "three/webgpu";
import { Fn, instancedArray, instanceIndex, vec3, uniform, hash, shapeCircle } from "three/tsl";

const count = 100_000;
const positions  = instancedArray(count, "vec3");   // persistent GPU buffers
const velocities = instancedArray(count, "vec3");    // velocities start zero-filled

// init kernel — invoke the Fn with (), then .compute(count)
const init = Fn(() => {
  positions.element(instanceIndex).assign(vec3(hash(instanceIndex).sub(0.5), 1, 0).mul(10));
})().compute(count);
await renderer.init();
await renderer.computeAsync(init);    // run once

// per-frame kernel
const gravity = uniform(-0.0098);
const update = Fn(() => {
  const pos = positions.element(instanceIndex);
  const vel = velocities.element(instanceIndex);
  vel.addAssign(vec3(0, gravity, 0));
  pos.addAssign(vel);
})().compute(count);

// material reads the SAME buffer — no CPU copy
const material = new THREE.SpriteNodeMaterial();
material.positionNode = positions.toAttribute();
material.opacityNode  = shapeCircle();

const particles = new THREE.Sprite(material);
particles.count = count;            // instanced draw count
particles.frustumCulled = false;    // GPU owns positions; CPU bounds are stale
scene.add(particles);

renderer.setAnimationLoop(() => {
  renderer.compute(update);          // simulate on GPU
  renderer.render(scene, camera);    // draw
});
```

**Advanced (from the fluid example):** typed `struct({ position:{type:'vec3'},
velocity:{type:'vec3'}, C:{type:'mat3'} })`, field access `.element(i).get('position')`;
**integer atomics** `struct({ x:{type:'int', atomic:true} })` + `atomicAdd/Store/Load`
(WebGPU has integer atomics only → encode floats as fixed-point `int(f.mul(1e7))`);
explicit workgroup size `.compute(count, [64, 1, 1])`; typed loops `Loop({ start:0,
end:3, type:'int', name:'gx', condition:'<' }, ({ gx }) => …)`; early-out `If(c, () =>
{ Return(); })`; **indirect dispatch** `IndirectStorageBufferAttribute` + `storage(buf,
'uint', 3)` passed as `renderer.compute(kernel, indirectBuffer)`; batch kernels with
`renderer.compute([k1, k2, k3])`.

Node ops: `.element(i)`, `.get('field')`, `.toVar()`, `.toConst()`, `.assign()`,
`.addAssign()`, `.mulAssign()`, `.negate()`, `.length()`, `.normalize()`,
`.cross(v)`, `.distance(p)`, `.lessThan(x)`.

### Dev panel — `Inspector`

The official examples attach the three.js WebGPU **Inspector** dev panel
(Performance incl. GPU frame timing, Console, Parameters, Viewer tabs):

```ts
import { Inspector } from "three/addons/inspector/Inspector.js";
renderer.inspector = new Inspector();   // after renderer.init()
```

It self-mounts next to the canvas on first render and ships its own toggle button
— no manual DOM wiring. GPU timing requires `new WebGPURenderer({ trackTimestamp:
true })`. WebGPU-only (it extends `RendererInspector`). It is wired in
`src/routes/vr/+page.svelte` on the WebGPU path (removed via
`inspector.domElement.remove()` on unmount). This is separate from the project's
own `C`-key dev console (`src/lib/dev-console/`).

### WebXR + WebGPU (r182 status)

- `WebGPURenderer` has an XR manager: `renderer.xr.enabled = true` + WebXR
  `setAnimationLoop` work API-wise (the `/vr` route wires this).
- **Caveat:** XR currently runs only through the **WebGL2 fallback backend**. When
  an immersive session starts, WebGPU-only features (compute storage buffers) are
  **not** available. So an XR scene's *core render path* must not depend on compute
  kernels — desktop preview gets full WebGPU, headset falls back to WebGL2.
- Known issues: multiview can break stereo / right-eye projection; AA + multiview
  can flicker. Test on-device.

Sources: [r182 release](https://github.com/mrdoob/three.js/releases/tag/r182) ·
[WebGPURenderer manual](https://threejs.org/manual/en/webgpurenderer.html) ·
[TSL wiki](https://github.com/mrdoob/three.js/wiki/Three.js-Shading-Language) ·
[webgpu_compute_particles](https://github.com/mrdoob/three.js/blob/r182/examples/webgpu_compute_particles.html) ·
[webgpu_compute_particles_fluid](https://github.com/mrdoob/three.js/blob/r182/examples/webgpu_compute_particles_fluid.html)

---

## Architecture

```
Controller UI (/controller)
       ↓ WebSocket (pitch, roll, speed, settings)
SvelteKit Server (server.ts)
       ↓ broadcast
VR Scene (/vr on Quest)
       ↓ Experience manifest lifecycle (setup/tick/render/applySettings/dispose)
Renderer Render Loop @ 72fps  (WebGPURenderer for renderer:"webgpu", else WebGLRenderer)
```

Key directories:

- `src/lib/experiences/` — pluggable experiences. Each is a folder with a
  `manifest.ts` (the platform contract). `manifest.renderer: "webgpu"` selects the
  `WebGPURenderer` path; omitted/`"webgl"` selects `WebGLRenderer`.
  - `becoming-many/` — **the WebGPU + TSL reference experience.**
  - `sinneswandler_test1/` — legacy WebGL experience (do not migrate ad-hoc).
- `src/lib/tsl/` — shared TSL helpers (noise/color/gradient re-exports).
- `src/lib/three/` — shared WebGL 3D components (legacy).
- `src/lib/node-editor/` — visual node editor (Components → Nodes → Canvas).
- `src/lib/ws/` — WebSocket client/server.
- `src/lib/types/` — TypeScript interfaces.
- `src/routes/vr/+page.svelte` — mounts the renderer (reads `manifest.renderer`)
  and runs the experience lifecycle.

### The Experience contract (`src/lib/experiences/types.ts`)

A manifest provides `setup(ctx)` (async; `ctx.renderer` is already
`init()`-ed), `tick(state, ctx)`, optional `render(state, ctx)` (define it to own
the frame — dispatch GPU compute then `renderer.render()`), `applySettings`,
`updatePlayer`, `dispose`. `ParameterDef[]` entries surface as Settings Sidebar
widgets and Node Editor signals (Node Editor sends 0–1, the loader remaps to
min/max before `applySettings`).

---

## Constraints — general

### Never

- ❌ `any` type
- ❌ ESLint/Prettier (use **Biome**)
- ❌ `pip` (use **uv** for Python)
- ❌ Top-level Three.js imports without `onMount()`
- ❌ `requestAnimationFrame` (use `renderer.setAnimationLoop`)
- ❌ Forget `dispose()` in `onDestroy` / experience `dispose()`
- ❌ Hardcode tuning values (use config / manifest parameters)
- ❌ HTTP for WebXR (must be HTTPS — the dev server uses the local certs)

### Always

- ✅ Explicit TypeScript types
- ✅ `onMount()` for browser APIs, `onDestroy()` for cleanup
- ✅ Dispose every GPU resource you create (materials, geometries, storage buffers)
- ✅ Run `bunx biome check --write .` before committing

---

## Decision Tree

Before writing code:

1. **Does this exist?** → Search the codebase first
2. **Built-in solution?** → Check three.js (`three/webgpu`, `three/tsl`),
   SvelteKit, bits-ui
3. **Already installed?** → Check `package.json`
4. **Add dependency?** → Research first, then `bun add`
5. **Custom code** → Last resort

---

## File Patterns

### WebGPU experience scene module

```ts
// src/lib/experiences/<id>/scene.ts
import * as THREE from "three/webgpu";
import { Fn, instancedArray, instanceIndex, uniform, vec3 } from "three/tsl";
import type { ExperienceState, RenderContext, SetupContext } from "../types";

export async function setup(ctx: SetupContext): Promise<MyState> {
  const renderer = ctx.renderer as THREE.WebGPURenderer; // manifest.renderer === "webgpu"
  const buffer = instancedArray(N, "vec3");
  const init = Fn(() => { /* … */ })().compute(N);
  await renderer.computeAsync(init);
  // … build SpriteNodeMaterial / mesh, add to ctx.scene …
  return state;
}

export function render(state: ExperienceState, ctx: RenderContext): void {
  const s = state as MyState;
  const r = ctx.renderer as THREE.WebGPURenderer;
  r.compute(s.updateKernel);
  r.render(ctx.scene, ctx.camera);
}

export function dispose(state: ExperienceState, scene: THREE.Scene): void {
  const s = state as MyState;
  scene.remove(s.mesh);
  s.material.dispose();
  s.buffer.dispose();
}
```

### Svelte + Renderer mount

```svelte
<script lang="ts">
  import { onMount, onDestroy } from "svelte";

  let canvas: HTMLCanvasElement;
  let renderer: import("three/webgpu").WebGPURenderer;

  onMount(() => {
    void (async () => {
      const { WebGPURenderer } = await import("three/webgpu");
      renderer = new WebGPURenderer({ canvas, antialias: true });
      await renderer.init();
      renderer.xr.enabled = true;
      renderer.setAnimationLoop(tick);
    })();
  });

  onDestroy(() => {
    renderer?.setAnimationLoop(null);
    renderer?.dispose();
  });
</script>

<canvas bind:this={canvas}></canvas>
```

---

## Performance Budget

| Metric      | Target               |
| ----------- | -------------------- |
| FPS         | 72 (Quest refresh)   |
| Draw calls  | < 100                |
| JS frame    | < 11ms               |

Prefer one instanced draw (`Sprite`/`InstancedMesh` + storage buffer) over many
meshes. Move per-element work to compute kernels. Watch overdraw with additive
particles — fill-rate, not the sim, is the usual bottleneck.

---

## Testing

```bash
bun run dev                            # Manual testing in browser (HTTPS, local certs)
bunx biome check --write .             # Lint + format
bunx svelte-check --tsconfig ./tsconfig.json   # Type check
```

> Note: `svelte-check` currently reports a pre-existing `three-mesh-bvh` break in
> `sinneswandler_test1` (missing types). That is unrelated to WebGPU work — don't
> chase it when validating new code; confirm **your** files are clean.

No unit tests currently — focus on visual testing in VR.
