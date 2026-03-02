/**
 * Defines a single shader uniform with type, default value, and optional UI hints.
 *
 * Type mapping to Three.js / JavaScript:
 * - `"float"` → `number`
 * - `"int"` → `number` (integer)
 * - `"vec2"` → `[x, y]` or `THREE.Vector2`
 * - `"vec3"` → `[x, y, z]` or `THREE.Vector3` (also used for colors)
 * - `"vec4"` → `[x, y, z, w]` or `THREE.Vector4`
 * - `"sampler2D"` → `THREE.Texture`
 */
export interface UniformDef {
	/** GLSL uniform name (e.g. `"uNoiseScale"`) */
	name: string;
	/** GLSL type — determines the JavaScript value shape */
	type: "float" | "vec2" | "vec3" | "vec4" | "int" | "sampler2D";
	/** Initial value — number for float/int, number[] for vec types */
	default: number | number[];
	/** Minimum value for UI slider (float/int only) */
	min?: number;
	/** Maximum value for UI slider (float/int only) */
	max?: number;
	/** Human-readable label for the UI control */
	label?: string;
}

/**
 * Shader categories for organizing the registry.
 *
 * - `"noise"` — Procedural noise patterns (FBM, domain warp, Perlin)
 * - `"sdf"` — Signed distance field / raymarching shaders
 * - `"landscape"` — Nature scenes (mountains, clouds, ocean)
 * - `"generative"` — Fractals, creative coding, algorithmic art
 * - `"lighting"` — Lighting effects (rim light, fresnel, glow)
 * - `"abstract"` — Visual experiments, Shadertoy adaptations
 * - `"particle"` — Particle rendering shaders (billboards, glow, trails)
 */
export type ShaderCategory =
	| "noise"
	| "sdf"
	| "landscape"
	| "generative"
	| "lighting"
	| "abstract"
	| "particle";

/** Performance tier indicating target hardware capability. */
export type PerfTier = "quest-safe" | "desktop-only" | "showcase";

/**
 * Complete definition of a shader in the registry.
 *
 * The `fragmentShader` field is empty in the registry file — it gets loaded
 * at runtime via Vite's `?raw` import (e.g. `import frag from "./sdf/alien-core.frag?raw"`).
 */
export interface ShaderDef {
	/** URL-safe identifier (e.g. `"fractal-flythrough"`) */
	id: string;
	/** Display name shown in the UI */
	name: string;
	/** Short description of the visual effect */
	description: string;
	/** Category for filtering in the shader browser */
	category: ShaderCategory;
	/** Fragment shader GLSL source (empty in registry, loaded via `?raw`) */
	fragmentShader: string;
	/** Optional custom vertex shader (defaults to standard.vert) */
	vertexShader?: string;
	/** Configurable uniforms exposed to UI controls */
	uniforms: UniformDef[];
	/** Attribution — author name and Shadertoy URL if adapted */
	credits?: string;
	/** Searchable tags for filtering */
	tags?: string[];
	/** Target hardware tier for performance budgeting */
	perfTier?: PerfTier;
}
