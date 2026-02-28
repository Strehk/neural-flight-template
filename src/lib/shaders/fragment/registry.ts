import type { ShaderDef, ShaderCategory } from "../types.js";

// ── Fragment Shader Registry ──
// 36 adapted Shadertoy shaders, categorized and Three.js-compatible

export const SHADER_REGISTRY: ShaderDef[] = [
	{
		id: "XsX3zl",
		name: "70s Melt",
		description: "Iterative sine distortion creating psychedelic melt patterns",
		category: "abstract" as ShaderCategory,
		fragmentShader: "", // Load via: import frag from "./abstract/70s-melt.frag?raw"
		uniforms: [],
		credits: "tomorrowevening — https://www.shadertoy.com/view/XsX3zl",
		tags: ["sine", "distortion", "psychedelic", "vignette"],
	},
	{
		id: "abstract-glassy-field",
		name: "Abstract Glassy Field",
		description: "Adapted Shadertoy shader",
		category: "abstract" as ShaderCategory,
		fragmentShader: "", // Load via: import frag from "./abstract/abstract-glassy-field.frag?raw"
		uniforms: [],
		credits: "Unknown",
	},
	{
		id: "wcyBD3",
		name: "Abstract Vortex",
		description: "Low-step volumetric raymarching through turbulent dot noise field with ACES tonemapping — only 10 raymarch steps",
		category: "abstract" as ShaderCategory,
		fragmentShader: "", // Load via: import frag from "./abstract/abstract-vortex.frag?raw"
		uniforms: [],
		credits: "Frostbyte_ — https://www.shadertoy.com/view/wcyBD3",
		tags: ["volumetric", "vortex", "tunnel", "noise", "tonemapping", "efficient"],
	},
	{
		id: "cloudy-spiral",
		name: "Cloudy Spiral",
		description: "Adapted Shadertoy shader",
		category: "abstract" as ShaderCategory,
		fragmentShader: "", // Load via: import frag from "./abstract/cloudy-spiral.frag?raw"
		uniforms: [],
		credits: "Unknown",
	},
	{
		id: "XstfzB",
		name: "Disco Tunnel",
		description: "Colorful ring-based tunnel fly-through with procedural camera path and glowing ring geometry",
		category: "abstract" as ShaderCategory,
		fragmentShader: "", // Load via: import frag from "./abstract/disco-tunnel.frag?raw"
		uniforms: [],
		credits: "WAHa_06x36 — https://www.shadertoy.com/view/XstfzB",
		tags: ["tunnel", "rings", "flythrough", "colorful", "glow"],
	},
	{
		id: "MsjSW3",
		name: "Ether",
		description: "Compact volumetric raymarcher with rotating SDF and layered lighting",
		category: "abstract" as ShaderCategory,
		fragmentShader: "", // Load via: import frag from "./abstract/ether.frag?raw"
		uniforms: [],
		credits: "nimitz — https://www.shadertoy.com/view/MsjSW3",
		tags: ["volumetric", "rotation", "compact", "elegant"],
	},
	{
		id: "4c3fRj",
		name: "Eye of Old Magic Dragon",
		description: "Multi-layered composition blending 4D Mandelbox fractal, Star Nest volumetrics, FBM nebula, and star burst effects",
		category: "abstract" as ShaderCategory,
		fragmentShader: "", // Load via: import frag from "./abstract/eye-of-old-magic.frag?raw"
		uniforms: [],
		credits: "nayk — https://www.shadertoy.com/view/4c3fRj",
		tags: ["fractal", "mandelbox", "volumetric", "star-nest", "composition", "complex"],
	},
	{
		id: "fbm-lightning",
		name: "Fbm Lightning",
		description: "Adapted Shadertoy shader",
		category: "abstract" as ShaderCategory,
		fragmentShader: "", // Load via: import frag from "./abstract/fbm-lightning.frag?raw"
		uniforms: [],
		credits: "Unknown",
	},
	{
		id: "galaxy-audio-visualizer",
		name: "Galaxy Audio Visualizer",
		description: "Adapted Shadertoy shader",
		category: "abstract" as ShaderCategory,
		fragmentShader: "", // Load via: import frag from "./abstract/galaxy-audio-visualizer.frag?raw"
		uniforms: [],
		credits: "Unknown",
	},
	{
		id: "4ffXDf",
		name: "Galaxy Sphere Warp",
		description: "Volumetric star field with perlin cloud layers and mouse rotation",
		category: "abstract" as ShaderCategory,
		fragmentShader: "", // Load via: import frag from "./abstract/galaxy-sphere-warp.frag?raw"
		uniforms: [],
		credits: "EthanZappa — https://www.shadertoy.com/view/4ffXDf",
		tags: ["volumetric", "galaxy", "perlin-noise", "clouds"],
	},
	{
		id: "music-grassy-space",
		name: "Music Grassy Space",
		description: "Adapted Shadertoy shader",
		category: "abstract" as ShaderCategory,
		fragmentShader: "", // Load via: import frag from "./abstract/music-grassy-space.frag?raw"
		uniforms: [],
		credits: "Unknown",
	},
	{
		id: "WlGXR1",
		name: "Neon Globules",
		description: "Volumetric simplex noise planes with neon glow and mouse-controlled camera",
		category: "abstract" as ShaderCategory,
		fragmentShader: "", // Load via: import frag from "./abstract/neon-globules.frag?raw"
		uniforms: [],
		credits: "WAHa_06x36 — https://www.shadertoy.com/view/WlGXR1",
		tags: ["volumetric", "simplex-noise", "neon", "glow"],
	},
	{
		id: "wlGXRD",
		name: "Psychedelic Sakura",
		description: "Polar flower pattern with cosine palette coloring",
		category: "abstract" as ShaderCategory,
		fragmentShader: "", // Load via: import frag from "./abstract/psychedelic-sakura.frag?raw"
		uniforms: [],
		credits: "Reva — https://www.shadertoy.com/view/wlGXRD",
		tags: ["polar", "flower", "cosine-palette", "psychedelic"],
	},
	{
		id: "ring-of-fire",
		name: "Ring Of Fire",
		description: "Adapted Shadertoy shader",
		category: "abstract" as ShaderCategory,
		fragmentShader: "", // Load via: import frag from "./abstract/ring-of-fire.frag?raw"
		uniforms: [],
		credits: "Unknown",
	},
	{
		id: "lcjyDR",
		name: "Star New",
		description: "Volumetric star field with ellipse curves and super-formula shapes",
		category: "abstract" as ShaderCategory,
		fragmentShader: "", // Load via: import frag from "./abstract/star-new.frag?raw"
		uniforms: [],
		credits: "nayk — https://www.shadertoy.com/view/lcjyDR",
		tags: ["volumetric", "star-field", "ellipse", "generative"],
	},
	{
		id: "XXySWy",
		name: "Star in Space",
		description: "Volumetric star field with water highlights and spiral twist",
		category: "abstract" as ShaderCategory,
		fragmentShader: "", // Load via: import frag from "./abstract/star-in-space.frag?raw"
		uniforms: [],
		credits: "nayk — https://www.shadertoy.com/view/XXySWy",
		tags: ["volumetric", "star-field", "water", "spiral"],
	},
	{
		id: "topologica",
		name: "Topologica",
		description: "Adapted Shadertoy shader",
		category: "abstract" as ShaderCategory,
		fragmentShader: "", // Load via: import frag from "./abstract/topologica.frag?raw"
		uniforms: [],
		credits: "Unknown",
	},
	{
		id: "MtBcR3",
		name: "Apollonian Fractal",
		description: "Raymarched Apollonian gasket with orbit-trap coloring and ambient occlusion",
		category: "generative" as ShaderCategory,
		fragmentShader: "", // Load via: import frag from "./generative/apollonian-fractal.frag?raw"
		uniforms: [],
		credits: "aiekick — https://www.shadertoy.com/view/MtBcR3",
		tags: ["apollonian", "fractal", "raymarching", "orbit-trap"],
	},
	{
		id: "tsXBzS",
		name: "Fractal Pyramid",
		description: "Iterated folding fractal with volumetric color accumulation",
		category: "generative" as ShaderCategory,
		fragmentShader: "", // Load via: import frag from "./generative/fractal-pyramid.frag?raw"
		uniforms: [],
		credits: "bradjamesgrant — https://www.shadertoy.com/view/tsXBzS",
		tags: ["fractal", "folding", "raymarching", "volumetric"],
	},
	{
		id: "4df3Rn",
		name: "Mandelbrot - Smooth",
		description: "Smooth iteration count Mandelbrot with animated zoom and cosine coloring",
		category: "generative" as ShaderCategory,
		fragmentShader: "", // Load via: import frag from "./generative/mandelbrot-smooth.frag?raw"
		uniforms: [],
		credits: "iq — https://www.shadertoy.com/view/4df3Rn",
		tags: ["mandelbrot", "fractal", "zoom", "antialiasing"],
	},
	{
		id: "MdBGDK",
		name: "Ribbon Assault",
		description: "Iterative Julia-like fractal with ribbon-shaped orbit traps",
		category: "generative" as ShaderCategory,
		fragmentShader: "", // Load via: import frag from "./generative/ribbon-assault.frag?raw"
		uniforms: [],
		credits: "Dave_Hoskins — https://www.shadertoy.com/view/MdBGDK",
		tags: ["julia-set", "fractal", "orbit-trap", "interactive"],
	},
	{
		id: "mtyGWy",
		name: "Shader Art Intro",
		description: "Elegant fractal UV subdivision with cosine palette coloring — great teaching example for creative coding",
		category: "generative" as ShaderCategory,
		fragmentShader: "", // Load via: import frag from "./generative/shader-art-intro.frag?raw"
		uniforms: [],
		credits: "kishimisu — https://www.shadertoy.com/view/mtyGWy",
		tags: ["generative", "palette", "fractal", "beginner", "cosine-palette"],
	},
	{
		id: "ltfXzj",
		name: "Sigmoids n Sines",
		description: "Iterated sigmoid and sine wave feedback system producing organic, evolving color patterns with built-in antialiasing",
		category: "generative" as ShaderCategory,
		fragmentShader: "", // Load via: import frag from "./generative/sigmoids-n-sines.frag?raw"
		uniforms: [],
		credits: "victor_shepardson — https://www.shadertoy.com/view/ltfXzj",
		tags: ["generative", "math", "feedback", "sigmoid", "organic", "antialiased"],
	},
	{
		id: "dreaming-clouds",
		name: "Dreaming Clouds",
		description: "Adapted Shadertoy shader",
		category: "landscape" as ShaderCategory,
		fragmentShader: "", // Load via: import frag from "./landscape/dreaming-clouds.frag?raw"
		uniforms: [],
		credits: "Unknown",
	},
	{
		id: "mystery-mountains",
		name: "Mystery Mountains",
		description: "Adapted Shadertoy shader",
		category: "landscape" as ShaderCategory,
		fragmentShader: "", // Load via: import frag from "./landscape/mystery-mountains.frag?raw"
		uniforms: [],
		credits: "Unknown",
	},
	{
		id: "noise-electric",
		name: "Noise Electric",
		description: "Adapted Shadertoy shader",
		category: "noise" as ShaderCategory,
		fragmentShader: "", // Load via: import frag from "./noise/noise-electric.frag?raw"
		uniforms: [],
		credits: "Unknown",
	},
	{
		id: "lsl3RH",
		name: "Warping - Procedural 2",
		description: "Multi-layer domain warping with FBM and procedural lighting",
		category: "noise" as ShaderCategory,
		fragmentShader: "", // Load via: import frag from "./noise/warping-procedural-2.frag?raw"
		uniforms: [],
		credits: "iq — https://www.shadertoy.com/view/lsl3RH",
		tags: ["domain-warp", "fbm", "noise", "procedural"],
	},
	{
		id: "alien-core",
		name: "Alien Core",
		description: "Adapted Shadertoy shader",
		category: "sdf" as ShaderCategory,
		fragmentShader: "", // Load via: import frag from "./sdf/alien-core.frag?raw"
		uniforms: [],
		credits: "Unknown",
	},
	{
		id: "3sySRK",
		name: "CineShader Lava",
		description: "Smooth metaball union with raymarching and iridescent coloring",
		category: "sdf" as ShaderCategory,
		fragmentShader: "", // Load via: import frag from "./sdf/cineshader-lava.frag?raw"
		uniforms: [],
		credits: "edankwan — https://www.shadertoy.com/view/3sySRK",
		tags: ["raymarching", "metaballs", "smooth-union", "iridescent"],
	},
	{
		id: "ltlSWf",
		name: "Flux Core",
		description: "Complex raymarched fractal structure with spiral space warping, rust texturing, animated camera, and volumetric glows",
		category: "sdf" as ShaderCategory,
		fragmentShader: "", // Load via: import frag from "./sdf/flux-core.frag?raw"
		uniforms: [],
		credits: "otaviogood — https://www.shadertoy.com/view/ltlSWf",
		tags: ["raymarching", "sdf", "fractal", "spiral", "glow", "complex"],
	},
	{
		id: "fractal-flythrough",
		name: "Fractal Flythrough",
		description: "Adapted Shadertoy shader",
		category: "sdf" as ShaderCategory,
		fragmentShader: "", // Load via: import frag from "./sdf/fractal-flythrough.frag?raw"
		uniforms: [],
		credits: "Unknown",
	},
	{
		id: "repelling",
		name: "Repelling",
		description: "Adapted Shadertoy shader",
		category: "sdf" as ShaderCategory,
		fragmentShader: "", // Load via: import frag from "./sdf/repelling.frag?raw"
		uniforms: [],
		credits: "Unknown",
	},
	{
		id: "ttK3Wt",
		name: "Sponge Tunnel",
		description: "Raymarched Menger sponge tunnel with polar modulation",
		category: "sdf" as ShaderCategory,
		fragmentShader: "", // Load via: import frag from "./sdf/sponge-tunnel.frag?raw"
		uniforms: [],
		credits: "hatuxes — https://www.shadertoy.com/view/ttK3Wt",
		tags: ["raymarching", "menger-sponge", "fractal", "tunnel"],
	},
	{
		id: "ts3yD7",
		name: "Timeless Depths",
		description: "Gyroid-based tunnel with dynamic bioluminescent colors and raymarching",
		category: "sdf" as ShaderCategory,
		fragmentShader: "", // Load via: import frag from "./sdf/timeless-depths.frag?raw"
		uniforms: [],
		credits: "kesson — https://www.shadertoy.com/view/ts3yD7",
		tags: ["raymarching", "gyroid", "tunnel", "bioluminescent"],
	},
	{
		id: "truchet-tentacles",
		name: "Truchet Tentacles",
		description: "Adapted Shadertoy shader",
		category: "sdf" as ShaderCategory,
		fragmentShader: "", // Load via: import frag from "./sdf/truchet-tentacles.frag?raw"
		uniforms: [],
		credits: "Unknown",
	},
	{
		id: "volume-skin",
		name: "Volume Skin",
		description: "Adapted Shadertoy shader",
		category: "sdf" as ShaderCategory,
		fragmentShader: "", // Load via: import frag from "./sdf/volume-skin.frag?raw"
		uniforms: [],
		credits: "Unknown",
	},
];

/** Get all shaders in a category */
export function getShadersByCategory(category: ShaderCategory): ShaderDef[] {
	return SHADER_REGISTRY.filter((s) => s.category === category);
}

/** Find shader by ID */
export function getShaderById(id: string): ShaderDef | undefined {
	return SHADER_REGISTRY.find((s) => s.id === id);
}
