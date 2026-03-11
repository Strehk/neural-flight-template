# LAB WORKFLOW — Visual Experiments

Workflow for building isolated Three.js visual experiments.
Each experiment lives in `src/routes/lab/{name}/+page.svelte`.

## Principles

- **Isolated** — No imports from experiments into production code
- **Disposable** — Delete any experiment without side effects
- **Visual only** — No WebSocket, no controllers, no game logic
- **Reusable parts** — Shared components in `src/lib/three/lab/`

---

## STEPS

### STEP: reference

TRIGGER: Starting a new visual experiment
ACTIONS:
1. Pick reference images from `dev/resources/references/`
2. Read `dev/resources/references/catalog.json` for shader_strategy + three_js_relevance
3. Decompose into elements: Geometry + Material/Shader + Lighting + Post-Processing + Atmosphere

OUTPUT: Element list with Three.js mapping

---

### STEP: check-lib

TRIGGER: After reference
ACTIONS:
1. Check `src/lib/three/lab/` — does a reusable component already exist?
2. Check `src/lib/three/` — can a production component be reused as-is?
3. If missing: build new component in `src/lib/three/lab/`
   - Header: `// LAB EXPERIMENT — temporary, not production code`
   - Factory pattern: `createXxx(config?: XxxConfig): THREE.Object3D`
   - Always export config interface

SKIP_IF: All needed components already exist

---

### STEP: build-component

TRIGGER: Component missing from check-lib
ACTIONS:
1. Create file in `src/lib/three/lab/{name}.ts`
2. Follow factory pattern: config interface + defaults + create function
3. Include dispose helper if component creates geometries/materials
4. Verify with `bunx biome check --write .` + `bunx svelte-check --threshold warning`

REPEAT: For each missing component

---

### STEP: assemble

TRIGGER: All components ready
ACTIONS:
1. Create `src/routes/lab/{experiment-name}/+page.svelte`
2. Structure:
   - `onMount()`: Renderer + Scene + Camera + Components + AnimationLoop
   - `onDestroy()`: Stop loop + dispose all
   - `<canvas bind:this>` fullscreen
3. Camera: Static or slow auto-orbit (no user controls needed)
4. Update lab index: add entry to `src/routes/lab/+page.svelte` experiments array

---

### STEP: verify

TRIGGER: After assemble
ACTIONS:
1. `bunx biome check --write .`
2. `bunx svelte-check --threshold warning`
3. `bun run dev` → open `https://localhost:5173/lab/{name}`
4. Visual check: Do the visuals match the reference images?
5. Console check: No errors

MAX_ITERATIONS: 3

---

### STEP: commit

TRIGGER: After verify
ACTION: `git commit -m "feat: ✨ lab experiment {name}"`

---

## EXPERIMENT TEMPLATE

Minimal +page.svelte skeleton:

```svelte
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import * as THREE from 'three';
  // import lab components from $lib/three/lab/

  let canvas: HTMLCanvasElement;
  let renderer: THREE.WebGLRenderer;

  onMount(() => {
    // 1. Renderer
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);

    // 2. Scene + Camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 2, 8);

    // 3. Add components
    // scene.add(createGradientSky({ ... }));
    // scene.add(createCheckerboard({ ... }));

    // 4. Animation loop
    const clock = new THREE.Clock();
    renderer.setAnimationLoop(() => {
      const t = clock.getElapsedTime();
      // animate camera, uniforms, etc.
      renderer.render(scene, camera);
    });

    // 5. Resize handler
    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', onResize);
  });

  onDestroy(() => {
    renderer?.setAnimationLoop(null);
    renderer?.dispose();
  });
</script>

<canvas bind:this={canvas}></canvas>

<style>
  canvas { display: block; width: 100vw; height: 100vh; }
  :global(body) { margin: 0; overflow: hidden; }
</style>
```

---

## AVAILABLE LAB COMPONENTS

| Component | File | Factory | Output |
|-----------|------|---------|--------|
| Gradient Material | `$lib/three/lab/gradient_material.ts` | `createGradientMaterial(config)` | `MeshBasicNodeMaterial` |
| Gradient Sky | `$lib/three/gradient-sky.ts` | `createGradientSky(config)` | `Mesh` |
| Architecture | `$lib/three/lab/architecture.ts` | `createArchitecture(config)` | `Group` |
| Reflective Water | `$lib/three/lab/reflective_water.ts` | `createReflectiveWater(config)` | `{ mesh, update, dispose }` |
| Starfield | `$lib/three/starfield.ts` | `createStarfield(config)` | `Points` |
| Post-Processing | `$lib/three/lab/post_processing.ts` | `createPostProcessing(...)` | `{ postProcessing, update }` |

---

## CONSTRAINTS

- ❌ Never import lab code into production routes (/vr, /controller, /node-editor)
- ❌ Never use `any` type
- ❌ Never use `requestAnimationFrame` (use `renderer.setAnimationLoop`)
- ✅ Always dispose geometries + materials in onDestroy
- ✅ Always add experiment to lab index page
- ✅ Header comment in every lab file: `// LAB EXPERIMENT — temporary, not production code`
