import type { ShaderCategory, ShaderDef } from "../types.js";

// ── Fragment Shader Registry ──
// 50 shaders (36 Shadertoy adaptations + 14 ICAROS originals), categorized and Three.js-compatible

export const SHADER_REGISTRY: ShaderDef[] = [
	{
		id: "70s-melt",
		name: "70s Melt",
		description: "Iterative sine distortion creating psychedelic melt patterns",
		category: "abstract" as ShaderCategory,
		fragmentShader: "", // Load via: import frag from "./abstract/70s-melt.frag?raw"
		uniforms: [],
		credits: "tomorrowevening — https://www.shadertoy.com/view/XsX3zl",
		tags: ["sine", "distortion", "psychedelic", "vignette"],
		perfTier: "quest-safe",
	},
	{
		id: "abstract-glassy-field",
		name: "Abstract Glassy Field",
		description: "Complex reflective abstract field with raymarching",
		category: "abstract" as ShaderCategory,
		fragmentShader: "", // Load via: import frag from "./abstract/abstract-glassy-field.frag?raw"
		uniforms: [],
		credits: "Shane — https://www.shadertoy.com/view/4ttGDH",
		tags: ["raymarching", "reflective", "abstract", "glassy"],
		perfTier: "quest-safe",
	},
	{
		id: "abstract-vortex",
		name: "Abstract Vortex",
		description:
			"Low-step volumetric raymarching through turbulent dot noise field with ACES tonemapping — only 10 raymarch steps",
		category: "abstract" as ShaderCategory,
		fragmentShader: "", // Load via: import frag from "./abstract/abstract-vortex.frag?raw"
		uniforms: [],
		credits: "Frostbyte_ — https://www.shadertoy.com/view/wcyBD3",
		tags: [
			"volumetric",
			"vortex",
			"tunnel",
			"noise",
			"tonemapping",
			"efficient",
		],
		perfTier: "quest-safe",
	},
	{
		id: "cloudy-spiral",
		name: "Cloudy Spiral",
		description: "Animated spiral cloud formation with volumetric layers",
		category: "abstract" as ShaderCategory,
		fragmentShader: "", // Load via: import frag from "./abstract/cloudy-spiral.frag?raw"
		uniforms: [],
		credits: "aiekick — https://www.shadertoy.com/view/MlSSzc",
		tags: ["spiral", "clouds", "volumetric", "animated"],
		perfTier: "quest-safe",
	},
	{
		id: "disco-tunnel",
		name: "Disco Tunnel",
		description:
			"Colorful ring-based tunnel fly-through with procedural camera path and glowing ring geometry",
		category: "abstract" as ShaderCategory,
		fragmentShader: "", // Load via: import frag from "./abstract/disco-tunnel.frag?raw"
		uniforms: [],
		credits: "WAHa_06x36 — https://www.shadertoy.com/view/XstfzB",
		tags: ["tunnel", "rings", "flythrough", "colorful", "glow"],
		perfTier: "quest-safe",
	},
	{
		id: "ether",
		name: "Ether",
		description:
			"Compact volumetric raymarcher with rotating SDF and layered lighting",
		category: "abstract" as ShaderCategory,
		fragmentShader: "", // Load via: import frag from "./abstract/ether.frag?raw"
		uniforms: [],
		credits: "nimitz — https://www.shadertoy.com/view/MsjSW3",
		tags: ["volumetric", "rotation", "compact", "elegant"],
		perfTier: "quest-safe",
	},
	{
		id: "eye-of-old-magic",
		name: "Eye of Old Magic Dragon",
		description:
			"Multi-layered composition blending 4D Mandelbox fractal, Star Nest volumetrics, FBM nebula, and star burst effects",
		category: "abstract" as ShaderCategory,
		fragmentShader: "", // Load via: import frag from "./abstract/eye-of-old-magic.frag?raw"
		uniforms: [],
		credits: "nayk — https://www.shadertoy.com/view/4c3fRj",
		tags: [
			"fractal",
			"mandelbox",
			"volumetric",
			"star-nest",
			"composition",
			"complex",
		],
		perfTier: "showcase",
	},
	{
		id: "fbm-lightning",
		name: "Fbm Lightning",
		description: "FBM-based lightning bolt effect with procedural glow",
		category: "abstract" as ShaderCategory,
		fragmentShader: "", // Load via: import frag from "./abstract/fbm-lightning.frag?raw"
		uniforms: [],
		credits: "nayk — https://www.shadertoy.com/view/MXyyWV",
		tags: ["fbm", "lightning", "glow", "procedural"],
		perfTier: "quest-safe",
	},
	{
		id: "galaxy-audio-visualizer",
		name: "Galaxy Audio Visualizer",
		description: "Colorful galaxy visualization with audio-reactive rings",
		category: "abstract" as ShaderCategory,
		fragmentShader: "", // Load via: import frag from "./abstract/galaxy-audio-visualizer.frag?raw"
		uniforms: [],
		credits: "ArthurTent — https://www.shadertoy.com/view/MXXcD4",
		tags: ["galaxy", "audio", "visualizer", "rings", "colorful"],
		perfTier: "quest-safe",
	},
	{
		id: "galaxy-sphere-warp",
		name: "Galaxy Sphere Warp",
		description:
			"Volumetric star field with perlin cloud layers and mouse rotation",
		category: "abstract" as ShaderCategory,
		fragmentShader: "", // Load via: import frag from "./abstract/galaxy-sphere-warp.frag?raw"
		uniforms: [],
		credits: "EthanZappa — https://www.shadertoy.com/view/4ffXDf",
		tags: ["volumetric", "galaxy", "perlin-noise", "clouds"],
		perfTier: "quest-safe",
	},
	{
		id: "music-grassy-space",
		name: "Music Grassy Space",
		description: "Abstract grassy space with musical frequency response",
		category: "abstract" as ShaderCategory,
		fragmentShader: "", // Load via: import frag from "./abstract/music-grassy-space.frag?raw"
		uniforms: [],
		credits: "0xAA55 — https://www.shadertoy.com/view/Ds2yDy",
		tags: ["music", "frequency", "abstract", "space"],
		perfTier: "quest-safe",
	},
	{
		id: "neon-globules",
		name: "Neon Globules",
		description:
			"Volumetric simplex noise planes with neon glow and mouse-controlled camera",
		category: "abstract" as ShaderCategory,
		fragmentShader: "", // Load via: import frag from "./abstract/neon-globules.frag?raw"
		uniforms: [],
		credits: "WAHa_06x36 — https://www.shadertoy.com/view/WlGXR1",
		tags: ["volumetric", "simplex-noise", "neon", "glow"],
		perfTier: "quest-safe",
	},
	{
		id: "psychedelic-sakura",
		name: "Psychedelic Sakura",
		description: "Polar flower pattern with cosine palette coloring",
		category: "abstract" as ShaderCategory,
		fragmentShader: "", // Load via: import frag from "./abstract/psychedelic-sakura.frag?raw"
		uniforms: [],
		credits: "Reva — https://www.shadertoy.com/view/wlGXRD",
		tags: ["polar", "flower", "cosine-palette", "psychedelic"],
		perfTier: "quest-safe",
	},
	{
		id: "ring-of-fire",
		name: "Ring Of Fire",
		description: "Ring of fire music visualizer with particle-like emission",
		category: "abstract" as ShaderCategory,
		fragmentShader: "", // Load via: import frag from "./abstract/ring-of-fire.frag?raw"
		uniforms: [],
		credits: "orblivius — https://www.shadertoy.com/view/M33XRN",
		tags: ["ring", "fire", "music", "particles", "emission"],
		perfTier: "quest-safe",
	},
	{
		id: "star-new",
		name: "Star New",
		description:
			"Volumetric star field with ellipse curves and super-formula shapes",
		category: "abstract" as ShaderCategory,
		fragmentShader: "", // Load via: import frag from "./abstract/star-new.frag?raw"
		uniforms: [],
		credits: "nayk — https://www.shadertoy.com/view/lcjyDR",
		tags: ["volumetric", "star-field", "ellipse", "generative"],
		perfTier: "quest-safe",
	},
	{
		id: "star-in-space",
		name: "Star in Space",
		description: "Volumetric star field with water highlights and spiral twist",
		category: "abstract" as ShaderCategory,
		fragmentShader: "", // Load via: import frag from "./abstract/star-in-space.frag?raw"
		uniforms: [],
		credits: "nayk — https://www.shadertoy.com/view/XXySWy",
		tags: ["volumetric", "star-field", "water", "spiral"],
		perfTier: "quest-safe",
	},
	{
		id: "topologica",
		name: "Topologica",
		description: "Topological VR-ready surface with animated mesh deformation",
		category: "abstract" as ShaderCategory,
		fragmentShader: "", // Load via: import frag from "./abstract/topologica.frag?raw"
		uniforms: [],
		credits: "ajb — https://www.shadertoy.com/view/3dyXRz",
		tags: ["topological", "mesh", "deformation", "animated", "vr"],
		perfTier: "showcase",
	},
	{
		id: "apollonian-fractal",
		name: "Apollonian Fractal",
		description:
			"Raymarched Apollonian gasket with orbit-trap coloring and ambient occlusion",
		category: "generative" as ShaderCategory,
		fragmentShader: "", // Load via: import frag from "./generative/apollonian-fractal.frag?raw"
		uniforms: [],
		credits: "aiekick — https://www.shadertoy.com/view/MtBcR3",
		tags: ["apollonian", "fractal", "raymarching", "orbit-trap"],
		perfTier: "desktop-only",
	},
	{
		id: "fractal-pyramid",
		name: "Fractal Pyramid",
		description: "Iterated folding fractal with volumetric color accumulation",
		category: "generative" as ShaderCategory,
		fragmentShader: "", // Load via: import frag from "./generative/fractal-pyramid.frag?raw"
		uniforms: [],
		credits: "bradjamesgrant — https://www.shadertoy.com/view/tsXBzS",
		tags: ["fractal", "folding", "raymarching", "volumetric"],
		perfTier: "desktop-only",
	},
	{
		id: "mandelbrot-smooth",
		name: "Mandelbrot - Smooth",
		description:
			"Smooth iteration count Mandelbrot with animated zoom and cosine coloring",
		category: "generative" as ShaderCategory,
		fragmentShader: "", // Load via: import frag from "./generative/mandelbrot-smooth.frag?raw"
		uniforms: [],
		credits: "iq — https://www.shadertoy.com/view/4df3Rn",
		tags: ["mandelbrot", "fractal", "zoom", "antialiasing"],
		perfTier: "quest-safe",
	},
	{
		id: "ribbon-assault",
		name: "Ribbon Assault",
		description: "Iterative Julia-like fractal with ribbon-shaped orbit traps",
		category: "generative" as ShaderCategory,
		fragmentShader: "", // Load via: import frag from "./generative/ribbon-assault.frag?raw"
		uniforms: [],
		credits: "Dave_Hoskins — https://www.shadertoy.com/view/MdBGDK",
		tags: ["julia-set", "fractal", "orbit-trap", "interactive"],
		perfTier: "quest-safe",
	},
	{
		id: "shader-art-intro",
		name: "Shader Art Intro",
		description:
			"Elegant fractal UV subdivision with cosine palette coloring — great teaching example for creative coding",
		category: "generative" as ShaderCategory,
		fragmentShader: "", // Load via: import frag from "./generative/shader-art-intro.frag?raw"
		uniforms: [],
		credits: "kishimisu — https://www.shadertoy.com/view/mtyGWy",
		tags: ["generative", "palette", "fractal", "beginner", "cosine-palette"],
		perfTier: "quest-safe",
	},
	{
		id: "sigmoids-n-sines",
		name: "Sigmoids n Sines",
		description:
			"Iterated sigmoid and sine wave feedback system producing organic, evolving color patterns with built-in antialiasing",
		category: "generative" as ShaderCategory,
		fragmentShader: "", // Load via: import frag from "./generative/sigmoids-n-sines.frag?raw"
		uniforms: [],
		credits: "victor_shepardson — https://www.shadertoy.com/view/ltfXzj",
		tags: [
			"generative",
			"math",
			"feedback",
			"sigmoid",
			"organic",
			"antialiased",
		],
		perfTier: "quest-safe",
	},
	{
		id: "dreaming-clouds",
		name: "Dreaming Clouds",
		description: "Layered procedural cloudscape with dreamy atmosphere",
		category: "landscape" as ShaderCategory,
		fragmentShader: "", // Load via: import frag from "./landscape/dreaming-clouds.frag?raw"
		uniforms: [],
		credits: "nadc2000 — https://www.shadertoy.com/view/MtXXz4",
		tags: ["clouds", "procedural", "atmosphere", "landscape"],
		perfTier: "quest-safe",
	},
	{
		id: "mystery-mountains",
		name: "Mystery Mountains",
		description: "Raymarched mountain landscape with procedural terrain noise",
		category: "landscape" as ShaderCategory,
		fragmentShader: "", // Load via: import frag from "./landscape/mystery-mountains.frag?raw"
		uniforms: [],
		credits: "Dave_Hoskins — https://www.shadertoy.com/view/llsGW7",
		tags: ["raymarching", "mountains", "terrain", "landscape", "procedural"],
		perfTier: "desktop-only",
	},
	{
		id: "noise-electric",
		name: "Noise Electric",
		description: "Electric noise animation with sharp lightning patterns",
		category: "noise" as ShaderCategory,
		fragmentShader: "", // Load via: import frag from "./noise/noise-electric.frag?raw"
		uniforms: [],
		credits: "nimitz — https://www.shadertoy.com/view/ldlXRS",
		tags: ["noise", "electric", "lightning", "sharp", "animated"],
		perfTier: "quest-safe",
	},
	{
		id: "warping-procedural-2",
		name: "Warping - Procedural 2",
		description: "Multi-layer domain warping with FBM and procedural lighting",
		category: "noise" as ShaderCategory,
		fragmentShader: "", // Load via: import frag from "./noise/warping-procedural-2.frag?raw"
		uniforms: [],
		credits: "iq — https://www.shadertoy.com/view/lsl3RH",
		tags: ["domain-warp", "fbm", "noise", "procedural"],
		perfTier: "quest-safe",
	},
	{
		id: "alien-core",
		name: "Alien Core",
		description: "Raymarched alien core with organic noise deformation",
		category: "sdf" as ShaderCategory,
		fragmentShader: "", // Load via: import frag from "./sdf/alien-core.frag?raw"
		uniforms: [],
		credits: "glkt — https://www.shadertoy.com/view/4tcXRr",
		tags: ["raymarching", "organic", "noise", "deformation", "alien"],
		perfTier: "desktop-only",
	},
	{
		id: "cineshader-lava",
		name: "CineShader Lava",
		description:
			"Smooth metaball union with raymarching and iridescent coloring",
		category: "sdf" as ShaderCategory,
		fragmentShader: "", // Load via: import frag from "./sdf/cineshader-lava.frag?raw"
		uniforms: [],
		credits: "edankwan — https://www.shadertoy.com/view/3sySRK",
		tags: ["raymarching", "metaballs", "smooth-union", "iridescent"],
		perfTier: "desktop-only",
	},
	{
		id: "flux-core",
		name: "Flux Core",
		description:
			"Complex raymarched fractal structure with spiral space warping, rust texturing, animated camera, and volumetric glows",
		category: "sdf" as ShaderCategory,
		fragmentShader: "", // Load via: import frag from "./sdf/flux-core.frag?raw"
		uniforms: [],
		credits: "otaviogood — https://www.shadertoy.com/view/ltlSWf",
		tags: ["raymarching", "sdf", "fractal", "spiral", "glow", "complex"],
		perfTier: "desktop-only",
	},
	{
		id: "fractal-flythrough",
		name: "Fractal Flythrough",
		description:
			"Camera flythrough of repeating fractal structure with reflections",
		category: "sdf" as ShaderCategory,
		fragmentShader: "", // Load via: import frag from "./sdf/fractal-flythrough.frag?raw"
		uniforms: [],
		credits: "Shane — https://www.shadertoy.com/view/4s3SRN",
		tags: ["raymarching", "fractal", "flythrough", "reflections"],
		perfTier: "desktop-only",
	},
	{
		id: "repelling",
		name: "Repelling",
		description: "Repelling metaballs with smooth distance field blending",
		category: "sdf" as ShaderCategory,
		fragmentShader: "", // Load via: import frag from "./sdf/repelling.frag?raw"
		uniforms: [],
		credits: "iq — https://www.shadertoy.com/view/XdjXWK",
		tags: ["metaballs", "smooth-union", "sdf", "blending"],
		perfTier: "desktop-only",
	},
	{
		id: "sponge-tunnel",
		name: "Sponge Tunnel",
		description: "Raymarched Menger sponge tunnel with polar modulation",
		category: "sdf" as ShaderCategory,
		fragmentShader: "", // Load via: import frag from "./sdf/sponge-tunnel.frag?raw"
		uniforms: [],
		credits: "hatuxes — https://www.shadertoy.com/view/ttK3Wt",
		tags: ["raymarching", "menger-sponge", "fractal", "tunnel"],
		perfTier: "desktop-only",
	},
	{
		id: "timeless-depths",
		name: "Timeless Depths",
		description:
			"Gyroid-based tunnel with dynamic bioluminescent colors and raymarching",
		category: "sdf" as ShaderCategory,
		fragmentShader: "", // Load via: import frag from "./sdf/timeless-depths.frag?raw"
		uniforms: [],
		credits: "kesson — https://www.shadertoy.com/view/ts3yD7",
		tags: ["raymarching", "gyroid", "tunnel", "bioluminescent"],
		perfTier: "desktop-only",
	},
	{
		id: "truchet-tentacles",
		name: "Truchet Tentacles",
		description:
			"Truchet tile-based tentacle patterns with procedural animation",
		category: "sdf" as ShaderCategory,
		fragmentShader: "", // Load via: import frag from "./sdf/truchet-tentacles.frag?raw"
		uniforms: [],
		credits: "WAHa_06x36 — https://www.shadertoy.com/view/ldfGWn",
		tags: ["truchet", "tiles", "tentacles", "procedural", "animated"],
		perfTier: "desktop-only",
	},
	{
		id: "volume-skin",
		name: "Volume Skin",
		description: "Volume skin rendering with anti-aliasing fixes",
		category: "sdf" as ShaderCategory,
		fragmentShader: "", // Load via: import frag from "./sdf/volume-skin.frag?raw"
		uniforms: [],
		credits: "FabriceNeyret2 — https://www.shadertoy.com/view/WtBfDm",
		tags: ["volume", "skin", "antialiasing", "rendering"],
		perfTier: "showcase",
	},
	{
		id: "fresnel-glow",
		name: "Fresnel Glow",
		description:
			"Fresnel-based edge glow with transparency — great for energy shields and holographic effects",
		category: "lighting" as ShaderCategory,
		fragmentShader: "", // Load via: import frag from "./lighting/fresnel-glow.frag?raw"
		uniforms: [
			{
				name: "uGlowColor",
				type: "vec3",
				default: [0.0, 0.8, 1.0],
				label: "Glow Color",
			},
			{
				name: "uGlowIntensity",
				type: "float",
				default: 2.0,
				min: 0.5,
				max: 5.0,
				label: "Intensity",
			},
			{
				name: "uGlowPower",
				type: "float",
				default: 3.0,
				min: 1.0,
				max: 8.0,
				label: "Edge Sharpness",
			},
			{
				name: "uOpacity",
				type: "float",
				default: 0.3,
				min: 0.0,
				max: 1.0,
				label: "Base Opacity",
			},
		],
		credits: "ICAROS Lab",
		tags: ["fresnel", "glow", "transparency", "quest-safe"],
		perfTier: "quest-safe",
	},
	{
		id: "rim-light",
		name: "Rim Light",
		description:
			"Configurable rim/backlight effect — classic edge lighting for any geometry",
		category: "lighting" as ShaderCategory,
		fragmentShader: "", // Load via: import frag from "./lighting/rim-light.frag?raw"
		uniforms: [
			{
				name: "uRimColor",
				type: "vec3",
				default: [1.0, 0.8, 0.4],
				label: "Rim Color",
			},
			{
				name: "uRimPower",
				type: "float",
				default: 3.0,
				min: 1.0,
				max: 8.0,
				label: "Rim Width",
			},
			{
				name: "uRimIntensity",
				type: "float",
				default: 1.5,
				min: 0.0,
				max: 5.0,
				label: "Intensity",
			},
			{
				name: "uBaseColor",
				type: "vec3",
				default: [0.2, 0.2, 0.3],
				label: "Base Color",
			},
			{
				name: "uAmbient",
				type: "float",
				default: 0.15,
				min: 0.0,
				max: 1.0,
				label: "Ambient",
			},
		],
		credits: "ICAROS Lab",
		tags: ["rim-light", "lighting", "quest-safe"],
		perfTier: "quest-safe",
	},
	{
		id: "bioluminescence",
		name: "Bioluminescence",
		description:
			"Deep-sea bioluminescent glow driven by noise and cosine palette coloring",
		category: "lighting" as ShaderCategory,
		fragmentShader: "", // Load via: import frag from "./lighting/bioluminescence.frag?raw"
		uniforms: [
			{
				name: "uPulseSpeed",
				type: "float",
				default: 1.0,
				min: 0.5,
				max: 3.0,
				label: "Pulse Speed",
			},
			{
				name: "uNoiseScale",
				type: "float",
				default: 3.0,
				min: 1.0,
				max: 10.0,
				label: "Pattern Scale",
			},
			{
				name: "uGlowIntensity",
				type: "float",
				default: 1.5,
				min: 0.5,
				max: 3.0,
				label: "Glow Intensity",
			},
		],
		credits: "ICAROS Lab",
		tags: ["bioluminescence", "noise", "glow", "quest-safe"],
		perfTier: "quest-safe",
	},
	{
		id: "psychedelic-terrain",
		name: "Psychedelic Terrain",
		description:
			"FBM terrain coloring with animated cosine palette and fog — extracted from Shader Landscape v3",
		category: "landscape" as ShaderCategory,
		fragmentShader: "", // Load via: import frag from "./landscape/psychedelic-terrain.frag?raw"
		uniforms: [],
		credits: "ICAROS Lab",
		tags: ["terrain", "fbm", "cosine-palette", "fog", "psychedelic"],
		perfTier: "quest-safe",
	},
	{
		id: "psychedelic-water",
		name: "Psychedelic Water",
		description:
			"Animated water surface with domain-warped noise and psychedelic palette coloring",
		category: "landscape" as ShaderCategory,
		fragmentShader: "", // Load via: import frag from "./landscape/psychedelic-water.frag?raw"
		uniforms: [],
		credits: "ICAROS Lab",
		tags: ["water", "domain-warp", "psychedelic", "animated"],
		perfTier: "quest-safe",
	},
	{
		id: "ocean-surface",
		name: "Ocean Surface",
		description:
			"Procedural water surface with caustics and fresnel reflection — pair with ocean.vert",
		category: "landscape" as ShaderCategory,
		fragmentShader: "", // Load via: import frag from "./landscape/ocean-surface.frag?raw"
		uniforms: [
			{
				name: "uWaterColor",
				type: "vec3",
				default: [0.0, 0.15, 0.3],
				label: "Water Color",
			},
			{
				name: "uFoamColor",
				type: "vec3",
				default: [0.8, 0.9, 1.0],
				label: "Foam Color",
			},
			{
				name: "uCausticScale",
				type: "float",
				default: 3.0,
				min: 1.0,
				max: 10.0,
				label: "Caustic Scale",
			},
		],
		credits: "ICAROS Lab",
		tags: ["water", "ocean", "caustics", "fresnel", "quest-safe"],
		perfTier: "quest-safe",
	},
	{
		id: "domain-warp",
		name: "Domain Warp",
		description:
			"IQ-style domain warping — feeds noise output back as coordinates for organic flowing patterns",
		category: "noise" as ShaderCategory,
		fragmentShader: "", // Load via: import frag from "./noise/domain-warp.frag?raw"
		uniforms: [
			{
				name: "uWarpStrength",
				type: "float",
				default: 1.5,
				min: 0.5,
				max: 3.0,
				label: "Warp Strength",
			},
			{
				name: "uNoiseScale",
				type: "float",
				default: 2.0,
				min: 1.0,
				max: 5.0,
				label: "Noise Scale",
			},
			{
				name: "uSpeed",
				type: "float",
				default: 0.3,
				min: 0.1,
				max: 1.0,
				label: "Speed",
			},
		],
		credits: "ICAROS Lab — technique by Inigo Quilez",
		tags: ["domain-warp", "noise", "organic", "quest-safe", "teaching"],
		perfTier: "quest-safe",
	},
	{
		id: "voronoi-cells",
		name: "Voronoi Cells",
		description:
			"Cellular voronoi pattern with glowing edges — organic cell aesthetics",
		category: "generative" as ShaderCategory,
		fragmentShader: "", // Load via: import frag from "./generative/voronoi-cells.frag?raw"
		uniforms: [
			{
				name: "uCellScale",
				type: "float",
				default: 6.0,
				min: 3.0,
				max: 15.0,
				label: "Cell Count",
			},
			{
				name: "uEdgeWidth",
				type: "float",
				default: 0.1,
				min: 0.01,
				max: 0.3,
				label: "Edge Width",
			},
			{
				name: "uCellColor",
				type: "vec3",
				default: [0.1, 0.2, 0.3],
				label: "Cell Color",
			},
			{
				name: "uEdgeColor",
				type: "vec3",
				default: [0.0, 0.8, 0.6],
				label: "Edge Color",
			},
		],
		credits: "ICAROS Lab",
		tags: ["voronoi", "cells", "generative", "quest-safe"],
		perfTier: "quest-safe",
	},
	{
		id: "lava-blobs",
		name: "Lava Blobs",
		description:
			"Raymarched metaballs with smooth union and warm lava-lamp coloring — Quest-optimized (8 blobs, 32 steps)",
		category: "sdf" as ShaderCategory,
		fragmentShader: "", // Load via: import frag from "./sdf/lava-blobs.frag?raw"
		uniforms: [
			{
				name: "uBlobCount",
				type: "float",
				default: 6,
				min: 4,
				max: 8,
				label: "Blob Count",
			},
			{
				name: "uBlobSpeed",
				type: "float",
				default: 1.0,
				min: 0.5,
				max: 3.0,
				label: "Animation Speed",
			},
			{
				name: "uSmoothness",
				type: "float",
				default: 0.4,
				min: 0.2,
				max: 1.0,
				label: "Blend Radius",
			},
			{
				name: "uWarmth",
				type: "float",
				default: 0.7,
				min: 0.0,
				max: 1.0,
				label: "Warmth",
			},
		],
		credits: "ICAROS Lab — inspired by edankwan cineshader-lava",
		tags: ["raymarching", "metaballs", "smooth-union", "lava", "quest-safe"],
		perfTier: "quest-safe",
	},
	{
		id: "subsurface-glow",
		name: "Subsurface Glow",
		description:
			"Subsurface scattering approximation — translucent warm glow for organic blob meshes",
		category: "lighting" as ShaderCategory,
		fragmentShader: "", // Load via: import frag from "./lighting/subsurface-glow.frag?raw"
		uniforms: [
			{
				name: "uGlowColor",
				type: "vec3",
				default: [1.0, 0.3, 0.1],
				label: "Glow Color",
			},
			{
				name: "uRimColor",
				type: "vec3",
				default: [1.0, 0.1, 0.6],
				label: "Rim Color",
			},
			{
				name: "uSubsurfaceIntensity",
				type: "float",
				default: 1.5,
				min: 0.5,
				max: 3.0,
				label: "Subsurface Intensity",
			},
			{
				name: "uOpacity",
				type: "float",
				default: 0.5,
				min: 0.2,
				max: 0.9,
				label: "Opacity",
			},
		],
		credits: "ICAROS Lab",
		tags: ["subsurface", "glow", "organic", "translucent", "quest-safe"],
		perfTier: "quest-safe",
	},
	{
		id: "gaussian-glow",
		name: "Gaussian Glow",
		description:
			"Soft gaussian billboard glow for particle systems — radial falloff with configurable color",
		category: "particle" as ShaderCategory,
		fragmentShader: "", // Load via: import frag from "./particle/gaussian-glow.frag?raw"
		uniforms: [],
		credits: "ICAROS Lab",
		tags: ["particle", "glow", "gaussian", "billboard", "quest-safe"],
		perfTier: "quest-safe",
	},

	// ── Post-FX Shaders ──

	{
		id: "film-grain",
		name: "Film Grain",
		description:
			"Analog film grain noise overlay — time-animated, configurable intensity and scale",
		category: "postfx" as ShaderCategory,
		fragmentShader: "", // Load via: import frag from "./postfx/film-grain.frag?raw"
		uniforms: [
			{
				name: "uIntensity",
				type: "float",
				default: 0.15,
				min: 0.0,
				max: 0.5,
				label: "Grain Intensity",
			},
			{
				name: "uGrainScale",
				type: "float",
				default: 1.0,
				min: 0.5,
				max: 3.0,
				label: "Grain Scale",
			},
		],
		credits: "ICAROS Lab",
		tags: ["film", "grain", "noise", "postfx", "overlay"],
		perfTier: "quest-safe",
	},

	// ── Additional Lighting Shaders ──

	{
		id: "gradient-material",
		name: "Gradient Material",
		description:
			"Multi-stop UV-based gradient on any geometry — configurable colors, midpoint, angle, and softness",
		category: "lighting" as ShaderCategory,
		fragmentShader: "", // Load via: import frag from "./lighting/gradient-material.frag?raw"
		vertexShader: "", // Uses standard.vert (needs vUv)
		uniforms: [
			{
				name: "uGradientStart",
				type: "vec3",
				default: [0.1, 0.0, 0.2],
				label: "Start Color",
			},
			{
				name: "uGradientMid",
				type: "vec3",
				default: [0.8, 0.2, 0.5],
				label: "Mid Color",
			},
			{
				name: "uGradientEnd",
				type: "vec3",
				default: [1.0, 0.8, 0.3],
				label: "End Color",
			},
			{
				name: "uMidPoint",
				type: "float",
				default: 0.5,
				min: 0.1,
				max: 0.9,
				label: "Mid Point",
			},
			{
				name: "uAngle",
				type: "float",
				default: 0.0,
				min: -3.14159,
				max: 3.14159,
				label: "Angle (rad)",
			},
			{
				name: "uSoftness",
				type: "float",
				default: 0.1,
				min: 0.0,
				max: 0.5,
				label: "Softness",
			},
		],
		credits: "ICAROS Lab",
		tags: ["gradient", "material", "uv", "configurable", "quest-safe"],
		perfTier: "quest-safe",
	},
	{
		id: "toon-stepped",
		name: "Toon Stepped",
		description:
			"Cel-shading with configurable step count, shadow color, and Fresnel-based outline",
		category: "lighting" as ShaderCategory,
		fragmentShader: "", // Load via: import frag from "./lighting/toon-stepped.frag?raw"
		uniforms: [
			{
				name: "uBaseColor",
				type: "vec3",
				default: [0.9, 0.7, 0.5],
				label: "Base Color",
			},
			{
				name: "uShadowColor",
				type: "vec3",
				default: [0.2, 0.1, 0.15],
				label: "Shadow Color",
			},
			{
				name: "uSteps",
				type: "float",
				default: 3.0,
				min: 2.0,
				max: 5.0,
				label: "Shading Steps",
			},
			{
				name: "uOutlineWidth",
				type: "float",
				default: 0.3,
				min: 0.0,
				max: 1.0,
				label: "Outline Width",
			},
			{
				name: "uLightDir",
				type: "vec3",
				default: [0.5, 1.0, 0.3],
				label: "Light Direction",
			},
		],
		credits: "ICAROS Lab",
		tags: ["toon", "cel-shading", "stepped", "outline", "quest-safe"],
		perfTier: "quest-safe",
	},
	{
		id: "wireframe-glow",
		name: "Wireframe Glow",
		description:
			"fwidth-based wireframe edges with configurable bloom glow and fill color",
		category: "lighting" as ShaderCategory,
		fragmentShader: "", // Load via: import frag from "./lighting/wireframe-glow.frag?raw"
		uniforms: [
			{
				name: "uWireColor",
				type: "vec3",
				default: [0.0, 1.0, 0.8],
				label: "Wire Color",
			},
			{
				name: "uWireWidth",
				type: "float",
				default: 1.5,
				min: 0.5,
				max: 5.0,
				label: "Wire Width",
			},
			{
				name: "uGlowIntensity",
				type: "float",
				default: 2.0,
				min: 0.5,
				max: 5.0,
				label: "Glow Intensity",
			},
			{
				name: "uGlowFalloff",
				type: "float",
				default: 3.0,
				min: 1.0,
				max: 8.0,
				label: "Glow Falloff",
			},
			{
				name: "uFillColor",
				type: "vec3",
				default: [0.02, 0.02, 0.05],
				label: "Fill Color",
			},
			{
				name: "uFillOpacity",
				type: "float",
				default: 0.1,
				min: 0.0,
				max: 1.0,
				label: "Fill Opacity",
			},
		],
		credits: "ICAROS Lab",
		tags: ["wireframe", "glow", "fwidth", "edges", "quest-safe"],
		perfTier: "quest-safe",
	},

	// ── Additional Generative Shaders ──

	{
		id: "neon-grid",
		name: "Neon Grid",
		description:
			"Emissive perspective grid lines for ground planes — anti-aliased with distance fade",
		category: "generative" as ShaderCategory,
		fragmentShader: "", // Load via: import frag from "./generative/neon-grid.frag?raw"
		uniforms: [
			{
				name: "uGridColor",
				type: "vec3",
				default: [0.0, 0.8, 1.0],
				label: "Grid Color",
			},
			{
				name: "uLineWidth",
				type: "float",
				default: 1.0,
				min: 0.5,
				max: 3.0,
				label: "Line Width",
			},
			{
				name: "uFadeDistance",
				type: "float",
				default: 50.0,
				min: 10.0,
				max: 200.0,
				label: "Fade Distance",
			},
			{
				name: "uGridScale",
				type: "float",
				default: 1.0,
				min: 0.1,
				max: 5.0,
				label: "Grid Scale",
			},
		],
		credits: "ICAROS Lab",
		tags: ["grid", "neon", "emissive", "synthwave", "quest-safe"],
		perfTier: "quest-safe",
	},

	// ── Additional Landscape Shaders ──

	{
		id: "atmosphere-fog",
		name: "Atmosphere Fog",
		description:
			"Multi-color gradient fog with exponential density — replaces single-tone Three.js Fog",
		category: "landscape" as ShaderCategory,
		fragmentShader: "", // Load via: import frag from "./landscape/atmosphere-fog.frag?raw"
		uniforms: [
			{
				name: "uFogNear",
				type: "vec3",
				default: [0.8, 0.9, 1.0],
				label: "Near Fog Color",
			},
			{
				name: "uFogMid",
				type: "vec3",
				default: [0.5, 0.3, 0.6],
				label: "Mid Fog Color",
			},
			{
				name: "uFogFar",
				type: "vec3",
				default: [0.1, 0.05, 0.15],
				label: "Far Fog Color",
			},
			{
				name: "uFogStart",
				type: "float",
				default: 5.0,
				min: 0.0,
				max: 50.0,
				label: "Fog Start",
			},
			{
				name: "uFogEnd",
				type: "float",
				default: 100.0,
				min: 20.0,
				max: 500.0,
				label: "Fog End",
			},
			{
				name: "uFogMidPoint",
				type: "float",
				default: 0.4,
				min: 0.1,
				max: 0.9,
				label: "Mid Point",
			},
			{
				name: "uFogDensity",
				type: "float",
				default: 2.0,
				min: 0.5,
				max: 5.0,
				label: "Density",
			},
		],
		credits: "ICAROS Lab",
		tags: ["fog", "atmosphere", "gradient", "landscape", "quest-safe"],
		perfTier: "quest-safe",
	},

	// ── Premium Lighting Shaders ──

	{
		id: "iridescent",
		name: "Iridescent",
		description:
			"Thin-film interference holographic effect — view-angle dependent color shift (soap bubbles, holographic foil)",
		category: "lighting" as ShaderCategory,
		fragmentShader: "", // Load via: import frag from "./lighting/iridescent.frag?raw"
		uniforms: [
			{
				name: "uBaseColor",
				type: "vec3",
				default: [0.1, 0.1, 0.15],
				label: "Base Color",
			},
			{
				name: "uFrequency",
				type: "float",
				default: 6.0,
				min: 2.0,
				max: 15.0,
				label: "Color Frequency",
			},
			{
				name: "uIntensity",
				type: "float",
				default: 1.0,
				min: 0.0,
				max: 2.0,
				label: "Intensity",
			},
			{
				name: "uSaturation",
				type: "float",
				default: 1.5,
				min: 0.5,
				max: 3.0,
				label: "Saturation",
			},
		],
		credits: "ICAROS Lab",
		tags: ["iridescent", "holographic", "thin-film", "fresnel", "quest-safe"],
		perfTier: "quest-safe",
	},

	// ── Premium Generative Shaders ──

	{
		id: "concentric-rings",
		name: "Concentric Rings",
		description:
			"Animated concentric ring patterns with cosine palette coloring — great for terrain or background",
		category: "generative" as ShaderCategory,
		fragmentShader: "", // Load via: import frag from "./generative/concentric-rings.frag?raw"
		uniforms: [
			{
				name: "uRingScale",
				type: "float",
				default: 3.0,
				min: 1.0,
				max: 10.0,
				label: "Ring Scale",
			},
			{
				name: "uRingSpeed",
				type: "float",
				default: 0.5,
				min: 0.0,
				max: 2.0,
				label: "Ring Speed",
			},
			{
				name: "uRingWidth",
				type: "float",
				default: 0.3,
				min: 0.05,
				max: 0.8,
				label: "Ring Width",
			},
			{
				name: "uPaletteA",
				type: "vec3",
				default: [0.5, 0.5, 0.5],
				label: "Palette A",
			},
			{
				name: "uPaletteB",
				type: "vec3",
				default: [0.5, 0.5, 0.5],
				label: "Palette B",
			},
			{
				name: "uPaletteC",
				type: "vec3",
				default: [1.0, 0.7, 0.4],
				label: "Palette C",
			},
			{
				name: "uPaletteD",
				type: "vec3",
				default: [0.0, 0.15, 0.2],
				label: "Palette D",
			},
		],
		credits: "ICAROS Lab",
		tags: ["rings", "concentric", "palette", "animated", "quest-safe"],
		perfTier: "quest-safe",
	},

	// ── Premium Landscape Shaders ──

	{
		id: "erosion-striation",
		name: "Erosion Striation",
		description:
			"Geological layering texture with noise-based erosion — canyon and rock wall aesthetics",
		category: "landscape" as ShaderCategory,
		fragmentShader: "", // Load via: import frag from "./landscape/erosion-striation.frag?raw"
		uniforms: [
			{
				name: "uLayerScale",
				type: "float",
				default: 0.5,
				min: 0.1,
				max: 2.0,
				label: "Layer Scale",
			},
			{
				name: "uLayerCount",
				type: "float",
				default: 8.0,
				min: 3.0,
				max: 20.0,
				label: "Layer Count",
			},
			{
				name: "uErosionStrength",
				type: "float",
				default: 2.0,
				min: 0.0,
				max: 5.0,
				label: "Erosion Strength",
			},
			{
				name: "uRockColor",
				type: "vec3",
				default: [0.4, 0.35, 0.3],
				label: "Rock Color",
			},
			{
				name: "uLayerColor",
				type: "vec3",
				default: [0.6, 0.45, 0.35],
				label: "Layer Color",
			},
			{
				name: "uAnimSpeed",
				type: "float",
				default: 0.0,
				min: 0.0,
				max: 0.5,
				label: "Animation Speed",
			},
		],
		credits: "ICAROS Lab",
		tags: ["erosion", "geology", "striation", "rock", "canyon"],
		perfTier: "quest-safe",
	},

	// ── Premium Post-FX Shaders ──

	{
		id: "chromatic-aberration",
		name: "Chromatic Aberration",
		description:
			"RGB channel offset lens effect — radial intensity from screen edge",
		category: "postfx" as ShaderCategory,
		fragmentShader: "", // Load via: import frag from "./postfx/chromatic-aberration.frag?raw"
		uniforms: [
			{
				name: "uSceneTexture",
				type: "sampler2D",
				default: 0,
				label: "Scene Texture",
			},
			{
				name: "uIntensity",
				type: "float",
				default: 0.01,
				min: 0.0,
				max: 0.05,
				label: "Intensity",
			},
			{
				name: "uFalloff",
				type: "float",
				default: 2.0,
				min: 1.0,
				max: 4.0,
				label: "Radial Falloff",
			},
		],
		credits: "ICAROS Lab",
		tags: ["chromatic", "aberration", "lens", "postfx", "rgb-split"],
		perfTier: "quest-safe",
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
