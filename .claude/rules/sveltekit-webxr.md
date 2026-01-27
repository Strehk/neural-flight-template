# SvelteKit + Three.js + WebXR Rules

## Decision Tree (ALWAYS FOLLOW!)

```
1. Does this already exist in the codebase? → USE IT
2. Does SvelteKit / bits-ui have a built-in? → USE IT
3. Does Three.js have a built-in or example? → USE IT / ADAPT IT
4. Only as LAST RESORT → Write custom code
```

## Tech Stack

| Component | Tool | Replaces |
|-----------|------|----------|
| Framework | **SvelteKit** | vanilla HTML |
| Runtime | **Bun** | Node.js |
| 3D Engine | **Three.js** | - |
| VR/AR | **WebXR API** | - |
| UI Components | **bits-ui** | custom HTML |
| Linting | **Biome** | ESLint, Prettier |
| Type Checking | **TypeScript** | - |

## Three.js in Svelte

Three.js requires browser APIs → always use `onMount()`:

```svelte
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import * as THREE from 'three';

  let canvas: HTMLCanvasElement;
  let renderer: THREE.WebGLRenderer;

  onMount(() => {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.xr.enabled = true;
    // ... scene setup
    renderer.setAnimationLoop(render);
  });

  onDestroy(() => {
    renderer?.setAnimationLoop(null);
    renderer?.dispose();
  });
</script>

<canvas bind:this={canvas}></canvas>
```

Key rules:
- `bind:this` for canvas reference
- `onMount()` for all Three.js initialization
- `onDestroy()` for cleanup: stop animation loop + dispose renderer
- Never import Three.js at top-level in SSR context

## WebSocket Protocol

### OrientationData

```typescript
interface OrientationData {
  pitch: number;    // -90 to 90 degrees (forward/back lean)
  roll: number;     // -90 to 90 degrees (left/right lean)
  timestamp: number; // Date.now()
}
```

### Flow

```
Phone/ICAROS → DeviceOrientation API → WebSocket → SvelteKit Server → WebSocket → Quest VR Scene
```

WebSocket upgrade in `hooks.server.ts`:
```typescript
// Handle WebSocket upgrade in SvelteKit's handle hook
```

## Quest Performance Budget

Target: **72 fps** (Quest refresh rate)

| Metric | Budget |
|--------|--------|
| Draw calls | < 100 |
| Triangles | < 500k |
| Textures | < 256MB VRAM |
| JS frame time | < 11ms |

Optimization patterns:
- `THREE.InstancedMesh` for repeated geometry (rings, trees)
- Chunked terrain with LOD
- Object pooling for terrain chunks
- Frustum culling (Three.js default, don't disable)

## NEVER

- ❌ `any` type
- ❌ HTTP for WebXR (must be HTTPS/localhost)
- ❌ `requestAnimationFrame` (use `renderer.setAnimationLoop`)
- ❌ ESLint/Prettier (use Biome)
- ❌ Top-level Three.js in `.svelte` files without `onMount`
- ❌ Forget `dispose()` in `onDestroy`
- ❌ Skip WebSocket flow testing

*Updated: 2026-01-27*
