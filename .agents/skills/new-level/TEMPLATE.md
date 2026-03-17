# Experience Template — 5+1 Files

Each experience consists of exactly 5 files (+ optional `shaders.ts`).
Copy the template and adapt it.

Path: `src/lib/experiences/{your-name}/`

---

## 1. `index.ts` — Entry Point

```typescript
export { manifest } from "./manifest";
```

Always the same single line. The catalog imports from here.

---

## 2. `manifest.ts` — Declarative Contract

```typescript
import type { ExperienceManifest, ParameterDef } from "../types";
import { updatePlayer } from "./player";
import { dispose, setup, tick } from "./scene";
import { applySettings } from "./settings";

// ── Parameter Definitions ──────────────────────────────────────
// Each parameter automatically appears in the Settings Sidebar (Slider/Toggle/ColorPicker)
// and in the Node Editor (as Output Node, 0-1 signal remapped to min/max).
//
// Fields:
//   id       → Unique key — used as switch-case in applySettings()
//   label    → Display name in UI
//   group    → Grouping in Settings Sidebar
//   type     → "number" (Slider), "boolean" (Toggle), "color" (ColorPicker) — default: "number"
//   min/max  → Value range (for boolean: 0/1, for color: ignored)
//   default  → Initial value
//   step     → Increment step for slider
//   icon     → Lucide icon name for the Node Editor Output Node
//
// See Mountain Flight manifest.ts for an extensive example (~20 parameters).

const parameters: ParameterDef[] = [
	// ── Movement ────────────────────────────────────
	{
		id: "moveSpeed",
		label: "Move Speed",
		group: "Movement",
		min: 1,
		max: 20,
		default: 5,
		step: 0.5,
		unit: "m/s",
		icon: "Gauge",
	},
	{
		id: "rotationEnabled",
		label: "Block Rotation",
		group: "Movement",
		type: "boolean",
		min: 0,
		max: 1,
		default: true,
		step: 1,
		icon: "RotateCw",
	},

	// ── Scene ───────────────────────────────────────
	{
		id: "blockCount",
		label: "Block Count",
		group: "Scene",
		min: 5,
		max: 100,
		default: 30,
		step: 1,
		icon: "Box",
	},
	{
		id: "blockColor",
		label: "Block Color",
		group: "Scene",
		type: "color",
		min: 0,
		max: 1,
		default: "#111111",
		step: 1,
		icon: "Palette",
	},
];

// ── Manifest ───────────────────────────────────────────────────
// The manifest is the "contract" between your experience and the platform.
// The platform reads from it: which parameters exist, what the scene looks like,
// and which lifecycle functions to call.

export const manifest: ExperienceManifest = {
	// ── Identity ──
	// TODO: Change these fields for your own experience!
	id: "my-experience", // kebab-case, must be unique
	name: "My Experience", // Display name in Catalog
	description: "TODO: Describe your experience in one sentence",
	version: "0.1.0",
	author: "TODO: Your Name",

	// ── I/O Contract ──
	parameters,
	outputs: [], // Optional: values your experience sends back (e.g. score)
	interfaces: { orientation: true, speed: false }, // Which inputs do you need?

	// ── Scene Defaults ──
	// These values are set by the Loader before setup() is called
	camera: { fov: 70, near: 0.1, far: 500 },
	scene: {
		background: "#1a1a2e", // Background color
		fogNear: 20,
		fogFar: 150,
		fogColor: "#1a1a2e", // Fog color = background for seamless transition
		ambientIntensity: 0.4,
		sunIntensity: 1.5,
		sunColor: "#ffffff",
		sunPosition: { x: 50, y: 80, z: 30 },
	},
	spawn: { position: { x: 0, y: 2, z: 0 } },

	// ── Lifecycle ──
	// These functions are called by the platform:
	setup, //    → Once on load (create 3D objects)
	tick, //     → Every frame (animation, physics)
	applySettings, // → When a parameter changes
	updatePlayer, //  → When orientation data arrives
	dispose, //  → On unload (clean up!)
};
```

---

## 3. `scene.ts` — 3D Objects + Animation + Lifecycle

```typescript
import * as THREE from "three";
import type { ExperienceState, SetupContext, TickContext } from "../types";
// ── Shared Library ─────────────────────────────────────────────
// The platform provides ready-made building blocks in src/lib/three/:
//   import { createClouds, disposeClouds, updateClouds } from "$lib/three/clouds";
//   import { createSky } from "$lib/three/sky";
//   import { createWater } from "$lib/three/terrain/water";
// See SHARED_LIBRARY.md for the complete catalog.

// ── State ──────────────────────────────────────────────────────
// Your State interface holds all Three.js objects you need in tick() or
// applySettings(). Everything you create in setup() and want to reference
// later belongs here.

export interface TemplateState extends ExperienceState {
	blocks: THREE.Group;
	ground: THREE.Mesh;
	blockMaterial: THREE.MeshStandardMaterial;
	camera: THREE.PerspectiveCamera;
	moveSpeed: number;
	rotationEnabled: boolean;
}

// ── Helpers ────────────────────────────────────────────────────

/** Creates N randomly distributed blocks and returns them as a Group */
function createBlocks(
	count: number,
	material: THREE.MeshStandardMaterial,
): THREE.Group {
	const group = new THREE.Group();
	const geometry = new THREE.BoxGeometry(1, 1, 1);

	for (let i = 0; i < count; i++) {
		const mesh = new THREE.Mesh(geometry, material);
		mesh.position.set(
			(Math.random() - 0.5) * 80,
			0.5 + Math.random() * 2,
			(Math.random() - 0.5) * 80,
		);
		const scale = 0.5 + Math.random() * 1.5;
		mesh.scale.set(scale, scale, scale);
		mesh.castShadow = true;
		group.add(mesh);
	}

	return group;
}

// ── Lifecycle: setup() ─────────────────────────────────────────
// Called once when the experience loads.
// Create all 3D objects and add them to the scene here.

export async function setup(ctx: SetupContext): Promise<TemplateState> {
	// Ground
	const groundGeometry = new THREE.PlaneGeometry(200, 200);
	const groundMaterial = new THREE.MeshStandardMaterial({ color: "#333333" });
	const ground = new THREE.Mesh(groundGeometry, groundMaterial);
	ground.rotation.x = -Math.PI / 2;
	ground.receiveShadow = true;
	ctx.scene.add(ground);

	// Block material — shared across all blocks (efficient + easy color changes)
	const blockMaterial = new THREE.MeshStandardMaterial({ color: "#111111" });

	// Blocks — randomly distributed
	const blocks = createBlocks(30, blockMaterial);
	ctx.scene.add(blocks);

	// ╔══════════════════════════════════════════════════════════╗
	// ║  Add your own 3D objects here!                           ║
	// ║  e.g. spheres, imported GLTF models, particles...      ║
	// ╚══════════════════════════════════════════════════════════╝

	return {
		blocks,
		ground,
		blockMaterial,
		camera: ctx.camera,
		moveSpeed: 5,
		rotationEnabled: true,
	};
}

// ── Lifecycle: tick() ──────────────────────────────────────────
// Called every frame (60x per second).
// delta = time since last frame in seconds (typically ~0.016)

export function tick(
	state: ExperienceState,
	_ctx: TickContext,
): { state: ExperienceState; outputs?: Record<string, number> } {
	const s = state as TemplateState;

	// Slowly rotate blocks (as an animation example)
	if (s.rotationEnabled) {
		for (const child of s.blocks.children) {
			child.rotation.y += 0.005;
			child.rotation.x += 0.002;
		}
	}

	return { state: s };
}

// ── Lifecycle: dispose() ───────────────────────────────────────
// IMPORTANT: Dispose all geometries, materials, and textures!
// Otherwise GPU memory leaks (especially critical on Quest).

export function dispose(state: ExperienceState, scene: THREE.Scene): void {
	const s = state as TemplateState;

	// Clean up blocks
	for (const child of s.blocks.children) {
		if (child instanceof THREE.Mesh) {
			child.geometry.dispose();
		}
	}
	s.blockMaterial.dispose();
	scene.remove(s.blocks);

	// Clean up ground
	if (s.ground.geometry) s.ground.geometry.dispose();
	if (s.ground.material instanceof THREE.Material) s.ground.material.dispose();
	scene.remove(s.ground);
}
```

---

## 4. `player.ts` — Controls

```typescript
import type { ExperienceState } from "../types";
import type { TemplateState } from "./scene";

// ── Player Movement ────────────────────────────────────────────
// Simple controls: pitch → forward/backward, roll → left/right.
// Applied directly to camera.position, without FlightPlayer class.
//
// For more complex physics (inertia, smoothing, terrain collision)
// see FlightPlayer in src/lib/three/player.ts — used by Mountain Flight.

export function updatePlayer(
	orientation: { pitch: number; roll: number },
	_speed: { accelerate: boolean; brake: boolean },
	state: ExperienceState,
	delta: number,
): void {
	const s = state as TemplateState;

	// pitch: tilt forward/backward → movement on Z axis
	// roll: tilt left/right → movement on X axis
	// Values arrive normalized from -1 to +1 (ICAROS/Gyro/Controller)
	const moveZ = -orientation.pitch * s.moveSpeed * delta;
	const moveX = orientation.roll * s.moveSpeed * delta;

	s.camera.position.x += moveX;
	s.camera.position.z += moveZ;
}
```

---

## 5. `settings.ts` — Parameter → Scene Mutation

```typescript
import * as THREE from "three";
import type { ExperienceState } from "../types";
import type { TemplateState } from "./scene";

// ── Settings ───────────────────────────────────────────────────
// Called when a parameter changes (Sidebar slider, Node Editor signal).
// Each case matches a parameter ID from manifest.ts.
//
// 3 Patterns:
//   1. Simple State   → Store value, tick() reads it
//   2. Visual Update  → Mutate material/fog/light directly
//   3. Structural     → Dispose old objects, create new ones

export function applySettings(
	id: string,
	value: number | boolean | string,
	state: ExperienceState,
	scene: THREE.Scene,
): void {
	const s = state as TemplateState;

	switch (id) {
		// ── Pattern 1: Simple State ────────────────────
		case "moveSpeed":
			s.moveSpeed = value as number;
			break;

		case "rotationEnabled":
			s.rotationEnabled = value as boolean;
			break;

		// ── Pattern 3: Structural Rebuild ──────────────
		case "blockCount": {
			const count = value as number;
			// Dispose old blocks
			for (const child of s.blocks.children) {
				if (child instanceof THREE.Mesh) {
					child.geometry.dispose();
				}
			}
			scene.remove(s.blocks);
			// Create new blocks
			const geometry = new THREE.BoxGeometry(1, 1, 1);
			const group = new THREE.Group();
			for (let i = 0; i < count; i++) {
				const mesh = new THREE.Mesh(geometry, s.blockMaterial);
				mesh.position.set(
					(Math.random() - 0.5) * 80,
					0.5 + Math.random() * 2,
					(Math.random() - 0.5) * 80,
				);
				const scale = 0.5 + Math.random() * 1.5;
				mesh.scale.set(scale, scale, scale);
				mesh.castShadow = true;
				group.add(mesh);
			}
			s.blocks = group;
			scene.add(s.blocks);
			break;
		}

		// ── Pattern 2: Visual Update ───────────────────
		case "blockColor":
			s.blockMaterial.color.set(value as string);
			break;

		default:
			break;
	}
}
```

---

## 6. `shaders.ts` — Optional (shader experiences only)

```typescript
// ============================================================================
// shaders.ts — Shader imports + material factories (OPTIONAL)
//
// Only needed for experiences with custom shaders. Standard experiences using
// MeshStandardMaterial don't need this file.
//
// Pattern: Import shaders from src/lib/shaders/ → create factory functions
// Rule: NEVER put inline GLSL in scene.ts. All GLSL lives in the shader library.
//
// Example:
//   import myVert from '$lib/shaders/vertex/terrain.vert?raw';
//   import myFrag from '$lib/shaders/fragment/landscape/my-effect.frag?raw';
//
//   export function createMyMaterial(): THREE.ShaderMaterial {
//     return createShaderMaterial({
//       vertexShader: myVert,
//       fragmentShader: myFrag,
//       uniforms: { uSpeed: { value: 1.0 } },
//     });
//   }
// ============================================================================

export {};
```

---

## Registration in `catalog.ts`

After creating your experience, add 2 lines to `src/lib/experiences/catalog.ts`:

```typescript
// 1. Add import (at the top with the other imports):
import { manifest as myLevel } from "./my-level";

// 2. Add entry in the CATALOG object:
const CATALOG: Record<string, ExperienceManifest> = {
	"gradient-prism": gradientPrism,
	"mountain-flight": mountainFlight,
	"shader-demo": shaderDemo,
	"my-level": myLevel,  // ← NEW
};
```

**Important:** The key must be identical to `manifest.id` and the folder name.
