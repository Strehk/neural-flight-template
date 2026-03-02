/**
 * Shader categories for organizing the fragment shader library.
 *
 * - `"noise"` — Procedural noise patterns (FBM, domain warp, Perlin)
 * - `"sdf"` — Signed distance field / raymarching shaders
 * - `"landscape"` — Nature scenes (mountains, clouds, ocean)
 * - `"generative"` — Fractals, creative coding, algorithmic art
 * - `"lighting"` — Lighting effects (rim light, fresnel, glow)
 * - `"abstract"` — Visual experiments, Shadertoy adaptations
 * - `"particle"` — Particle rendering shaders (billboards, glow, trails)
 * - `"postfx"` — Post-processing effects (film grain, chromatic aberration)
 */
export type ShaderCategory =
	| "noise"
	| "sdf"
	| "landscape"
	| "generative"
	| "lighting"
	| "abstract"
	| "particle"
	| "postfx";

/** Performance tier indicating target hardware capability. */
export type PerfTier = "quest-safe" | "desktop-only" | "showcase";
