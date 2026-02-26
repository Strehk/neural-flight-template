/**
 * GLSL Snippet Library — Reusable shader code fragments organized by category.
 */

import type { ShaderSnippet } from "./types";

export const SNIPPETS: ShaderSnippet[] = [
	// ═══ NOISE ═══

	{
		id: "simplex2d",
		name: "Simplex 2D",
		category: "noise",
		description: "2D simplex noise returning -1 to 1",
		difficulty: 1,
		hint: "Simplex noise is faster than Perlin and has fewer directional artifacts. Great for organic textures.",
		code: `vec3 _mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 _mod289v2(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 _permute(vec3 x) { return _mod289(((x * 34.0) + 1.0) * x); }

float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                     -0.577350269189626, 0.024390243902439);
  vec2 i = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = _mod289v2(i);
  vec3 p = _permute(_permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
  m = m * m; m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}`,
	},
	{
		id: "fbm",
		name: "Fractal Brownian Motion",
		category: "noise",
		description: "Layer multiple noise octaves for natural-looking detail",
		difficulty: 2,
		hint: "FBM stacks noise octaves. More octaves = more detail but more expensive. 4-6 is the sweet spot.",
		code: `float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  float frequency = 1.0;
  for (int i = 0; i < 6; i++) {
    value += amplitude * snoise(p * frequency);
    frequency *= 2.0;
    amplitude *= 0.5;
  }
  return value;
}`,
		requiredUniforms: [],
	},
	{
		id: "turbulence",
		name: "Turbulence",
		category: "noise",
		description: "Absolute-value FBM for cloud/fire-like patterns",
		difficulty: 2,
		hint: "Turbulence uses abs(noise) which creates sharp creases — perfect for flames, clouds, and marble.",
		code: `float turbulence(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  float frequency = 1.0;
  for (int i = 0; i < 6; i++) {
    value += amplitude * abs(snoise(p * frequency));
    frequency *= 2.0;
    amplitude *= 0.5;
  }
  return value;
}`,
	},
	{
		id: "voronoi",
		name: "Voronoi / Worley",
		category: "noise",
		description: "Cell-based noise pattern with distance-to-nearest-point",
		difficulty: 3,
		hint: "Voronoi creates organic cell patterns. Use F1 for cells, F2-F1 for cracks/veins.",
		code: `vec2 _voronoiHash(vec2 p) {
  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
  return fract(sin(p) * 43758.5453);
}

float voronoi(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float minDist = 1.0;
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 neighbor = vec2(float(x), float(y));
      vec2 point = _voronoiHash(i + neighbor);
      vec2 diff = neighbor + point - f;
      float dist = length(diff);
      minDist = min(minDist, dist);
    }
  }
  return minDist;
}`,
	},
	{
		id: "perlin2d",
		name: "Value Noise 2D",
		category: "noise",
		description: "Simple 2D value noise using hash-based interpolation",
		difficulty: 2,
		hint: "Value noise is the simplest noise type — hash random values and interpolate. Blocky but fast.",
		code: `float _vnHash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float valueNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = _vnHash(i);
  float b = _vnHash(i + vec2(1.0, 0.0));
  float c = _vnHash(i + vec2(0.0, 1.0));
  float d = _vnHash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}`,
	},
	{
		id: "curl_noise",
		name: "Curl Noise 2D",
		category: "noise",
		description: "Divergence-free noise field for fluid-like motion",
		difficulty: 3,
		hint: "Curl noise is divergence-free — particles following it never converge or diverge. Perfect for fluid sims.",
		code: `vec2 curlNoise(vec2 p) {
  float eps = 0.01;
  float n1 = snoise(vec2(p.x, p.y + eps));
  float n2 = snoise(vec2(p.x, p.y - eps));
  float a = (n1 - n2) / (2.0 * eps);
  n1 = snoise(vec2(p.x + eps, p.y));
  n2 = snoise(vec2(p.x - eps, p.y));
  float b = (n1 - n2) / (2.0 * eps);
  return vec2(a, -b);
}`,
	},

	// ═══ SDF ═══

	{
		id: "sdf_circle",
		name: "SDF Circle",
		category: "sdf",
		description: "Signed distance to a circle",
		difficulty: 1,
		hint: "The simplest SDF. Negative inside, positive outside. The foundation of SDF rendering.",
		code: `float sdCircle(vec2 p, float r) {
  return length(p) - r;
}`,
	},
	{
		id: "sdf_box",
		name: "SDF Box",
		category: "sdf",
		description: "Signed distance to a 2D box",
		difficulty: 1,
		hint: "Box SDF uses the max of abs components. The trick with 'q' handles the interior distance correctly.",
		code: `float sdBox(vec2 p, vec2 b) {
  vec2 q = abs(p) - b;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0);
}`,
	},
	{
		id: "sdf_torus",
		name: "SDF Torus 3D",
		category: "sdf",
		description: "Signed distance to a torus in 3D",
		difficulty: 2,
		hint: "A torus is a circle swept around another circle. t.x = major radius, t.y = minor radius.",
		code: `float sdTorus(vec3 p, vec2 t) {
  vec2 q = vec2(length(p.xz) - t.x, p.y);
  return length(q) - t.y;
}`,
	},
	{
		id: "sdf_smooth_union",
		name: "Smooth Union",
		category: "sdf",
		description: "Blend two SDFs with smooth transition",
		difficulty: 2,
		hint: "Smooth min creates organic blending between shapes. k controls smoothness (0.1-1.0 typical).",
		code: `float opSmoothUnion(float d1, float d2, float k) {
  float h = clamp(0.5 + 0.5 * (d2 - d1) / k, 0.0, 1.0);
  return mix(d2, d1, h) - k * h * (1.0 - h);
}`,
	},
	{
		id: "sdf_repeat",
		name: "Infinite Repetition",
		category: "sdf",
		description: "Repeat space infinitely for SDF patterns",
		difficulty: 3,
		hint: "Domain repetition creates infinite copies of a shape. c is the cell spacing in each axis.",
		code: `vec3 opRep(vec3 p, vec3 c) {
  return mod(p + 0.5 * c, c) - 0.5 * c;
}`,
	},

	// ═══ MATH ═══

	{
		id: "remap",
		name: "Remap",
		category: "math",
		description: "Map a value from one range to another",
		difficulty: 1,
		hint: "Essential utility. Converts between any two ranges. Use for mapping noise (-1,1) to color (0,1) etc.",
		code: `float remap(float value, float inMin, float inMax, float outMin, float outMax) {
  return outMin + (value - inMin) * (outMax - outMin) / (inMax - inMin);
}`,
	},
	{
		id: "rotate2d",
		name: "Rotate 2D",
		category: "math",
		description: "2D rotation matrix",
		difficulty: 1,
		hint: "Apply to UV coords for rotation: uv = rotate2d(angle) * uv. Angle in radians.",
		code: `mat2 rotate2d(float angle) {
  float s = sin(angle);
  float c = cos(angle);
  return mat2(c, -s, s, c);
}`,
	},
	{
		id: "polar",
		name: "Polar Coordinates",
		category: "math",
		description: "Convert cartesian to polar (angle, radius)",
		difficulty: 1,
		hint: "Polar coords are angle + radius from center. Great for radial effects, spirals, and circular patterns.",
		code: `vec2 toPolar(vec2 p) {
  return vec2(atan(p.y, p.x), length(p));
}`,
	},
	{
		id: "hash",
		name: "Hash Functions",
		category: "math",
		description: "Pseudo-random hash for deterministic randomness",
		difficulty: 2,
		hint: "Hash functions give repeatable random values from coordinates. Essential for procedural generation.",
		code: `float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

vec2 hash2(vec2 p) {
  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
  return fract(sin(p) * 43758.5453);
}`,
	},
	{
		id: "smootherstep",
		name: "Smootherstep",
		category: "math",
		description: "Ken Perlin's improved smoothstep with zero 2nd derivatives",
		difficulty: 1,
		hint: "Smootherstep has zero 1st AND 2nd derivatives at edges — smoother than smoothstep for noise.",
		code: `float smootherstep(float edge0, float edge1, float x) {
  x = clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
  return x * x * x * (x * (x * 6.0 - 15.0) + 10.0);
}`,
	},

	// ═══ COLOR ═══

	{
		id: "hsv2rgb",
		name: "HSV to RGB",
		category: "color",
		description: "Convert hue-saturation-value to RGB",
		difficulty: 1,
		hint: "HSV is intuitive for color cycling. Hue 0-1 cycles the rainbow, S=1 full color, V=1 full brightness.",
		code: `vec3 hsv2rgb(vec3 c) {
  vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}`,
	},
	{
		id: "palette",
		name: "IQ Cosine Palette",
		category: "color",
		description: "Generate smooth color gradients with 4 parameter vectors",
		difficulty: 2,
		hint: "IQ's palette technique creates beautiful gradients with just 4 vec3 params. See iquilezles.org/articles/palettes.",
		code: `vec3 palette(float t, vec3 a, vec3 b, vec3 c, vec3 d) {
  return a + b * cos(6.28318 * (c * t + d));
}

// Example usage:
// vec3 col = palette(t, vec3(0.5), vec3(0.5), vec3(1.0), vec3(0.0, 0.33, 0.67));`,
	},
	{
		id: "desaturate",
		name: "Desaturate",
		category: "color",
		description: "Convert to grayscale with adjustable amount",
		difficulty: 1,
		hint: "Uses luminance weights (0.299, 0.587, 0.114) matching human eye sensitivity.",
		code: `vec3 desaturate(vec3 color, float amount) {
  float gray = dot(color, vec3(0.299, 0.587, 0.114));
  return mix(color, vec3(gray), amount);
}`,
	},
	{
		id: "gamma",
		name: "Gamma Correction",
		category: "color",
		description: "Apply gamma correction for correct brightness",
		difficulty: 1,
		hint: "Apply pow(color, 1/2.2) before output to convert linear light to sRGB display space.",
		code: `vec3 gammaCorrect(vec3 color, float gamma) {
  return pow(color, vec3(1.0 / gamma));
}`,
	},
	{
		id: "rgb2hsv",
		name: "RGB to HSV",
		category: "color",
		description: "Convert RGB color to hue-saturation-value",
		difficulty: 2,
		hint: "Useful for manipulating existing colors — shift hue, adjust saturation, then convert back.",
		code: `vec3 rgb2hsv(vec3 c) {
  vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
  vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
  vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
  float d = q.x - min(q.w, q.y);
  float e = 1.0e-10;
  return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}`,
	},

	// ═══ UV TRANSFORM ═══

	{
		id: "tile",
		name: "UV Tiling",
		category: "uv",
		description: "Repeat UV coordinates n times",
		difficulty: 1,
		hint: "fract() wraps UVs from 0-1 creating repetition. Multiply first to control tile count.",
		code: `vec2 tile(vec2 uv, float n) {
  return fract(uv * n);
}`,
	},
	{
		id: "mirror",
		name: "UV Mirror",
		category: "uv",
		description: "Ping-pong UV coordinates for seamless mirroring",
		difficulty: 1,
		hint: "Mirror creates seamless tiling by reflecting at each boundary. No visible seams.",
		code: `vec2 mirrorUV(vec2 uv) {
  vec2 m = mod(uv, 2.0);
  return mix(m, 2.0 - m, step(1.0, m));
}`,
	},
	{
		id: "polar_uv",
		name: "Polar UV",
		category: "uv",
		description: "Convert UV to polar coordinates centered on (0.5, 0.5)",
		difficulty: 2,
		hint: "Polar UVs are great for circular patterns, tunnel effects, and radial designs.",
		code: `vec2 polarUV(vec2 uv) {
  vec2 centered = uv - 0.5;
  float angle = atan(centered.y, centered.x) / 6.28318 + 0.5;
  float radius = length(centered) * 2.0;
  return vec2(angle, radius);
}`,
	},
	{
		id: "kaleidoscope",
		name: "Kaleidoscope",
		category: "uv",
		description: "Mirror UV coordinates around n-fold symmetry",
		difficulty: 2,
		hint: "Creates n-fold symmetry by reflecting the angle. 6 segments creates a snowflake pattern.",
		code: `vec2 kaleidoscope(vec2 uv, float segments) {
  vec2 centered = uv - 0.5;
  float angle = atan(centered.y, centered.x);
  float radius = length(centered);
  float segAngle = 6.28318 / segments;
  angle = mod(angle, segAngle);
  angle = abs(angle - segAngle * 0.5);
  return vec2(cos(angle), sin(angle)) * radius + 0.5;
}`,
	},

	// ═══ ANIMATION ═══

	{
		id: "sine_wave",
		name: "Sine Wave",
		category: "animation",
		description: "Parametric sine wave with frequency and amplitude",
		difficulty: 1,
		hint: "The building block of all animation. Combine multiple sines for complex motion.",
		code: `float sineWave(float t, float freq, float amp) {
  return amp * sin(t * freq * 6.28318);
}`,
		requiredUniforms: [{ name: "uTime", type: "float", value: 0 }],
	},
	{
		id: "sawtooth",
		name: "Sawtooth Wave",
		category: "animation",
		description: "Linear ramp that resets periodically",
		difficulty: 1,
		hint: "Sawtooth creates a linear ramp — great for scrolling effects and linear progress.",
		code: `float sawtooth(float t, float period) {
  return fract(t / period);
}`,
	},
	{
		id: "bounce",
		name: "Bounce Easing",
		category: "animation",
		description: "Elastic bounce easing function",
		difficulty: 2,
		hint: "Creates a satisfying bounce effect. Useful for playful UI animations and impacts.",
		code: `float bounce(float t) {
  t = clamp(t, 0.0, 1.0);
  if (t < 1.0 / 2.75) return 7.5625 * t * t;
  if (t < 2.0 / 2.75) { t -= 1.5 / 2.75; return 7.5625 * t * t + 0.75; }
  if (t < 2.5 / 2.75) { t -= 2.25 / 2.75; return 7.5625 * t * t + 0.9375; }
  t -= 2.625 / 2.75;
  return 7.5625 * t * t + 0.984375;
}`,
	},
	{
		id: "ping_pong",
		name: "Ping Pong",
		category: "animation",
		description: "Triangle wave — linearly oscillates 0→1→0",
		difficulty: 1,
		hint: "Ping-pong (triangle wave) creates smooth back-and-forth motion without the sine curve.",
		code: `float pingPong(float t, float length) {
  float m = mod(t, length * 2.0);
  return length - abs(m - length);
}`,
	},

	// ═══ LIGHTING ═══

	{
		id: "lambert",
		name: "Lambert Diffuse",
		category: "lighting",
		description:
			"Basic diffuse lighting from surface normal and light direction",
		difficulty: 2,
		hint: "Lambert = dot(normal, lightDir). The simplest physically-plausible diffuse shading model.",
		code: `float lambert(vec3 normal, vec3 lightDir) {
  return max(dot(normalize(normal), normalize(lightDir)), 0.0);
}`,
	},
	{
		id: "fresnel",
		name: "Fresnel Effect",
		category: "lighting",
		description: "Rim glow effect based on view angle",
		difficulty: 2,
		hint: "Fresnel makes edges glow brighter — like the glow around soap bubbles or water surfaces.",
		code: `float fresnel(vec3 viewDir, vec3 normal, float power) {
  return pow(1.0 - max(dot(normalize(viewDir), normalize(normal)), 0.0), power);
}`,
	},
	{
		id: "normal_from_height",
		name: "Normal from Heightmap",
		category: "lighting",
		description: "Calculate surface normals from a heightmap for bump mapping",
		difficulty: 3,
		hint: "Samples 4 neighboring pixels to approximate the surface gradient. strength controls bumpiness.",
		code: `// Requires a height function: float getHeight(vec2 uv)
vec3 normalFromHeight(vec2 uv, float texelSize, float strength) {
  float hL = snoise(uv - vec2(texelSize, 0.0));
  float hR = snoise(uv + vec2(texelSize, 0.0));
  float hD = snoise(uv - vec2(0.0, texelSize));
  float hU = snoise(uv + vec2(0.0, texelSize));
  vec3 n = vec3(hL - hR, hD - hU, 2.0 / strength);
  return normalize(n);
}`,
	},

	// ═══ EFFECTS ═══

	{
		id: "vignette",
		name: "Vignette",
		category: "effects",
		description: "Darken screen edges for a cinematic look",
		difficulty: 1,
		hint: "Vignette draws focus to the center of the screen. Common in photography and film.",
		code: `float vignette(vec2 uv, float radius, float softness) {
  vec2 centered = uv - 0.5;
  float dist = length(centered);
  return 1.0 - smoothstep(radius, radius + softness, dist);
}`,
	},
	{
		id: "chromatic_ab",
		name: "Chromatic Aberration",
		category: "effects",
		description: "Split RGB channels for a lens distortion effect",
		difficulty: 2,
		hint: "Simulates cheap lens optics where different wavelengths focus differently. Subtle amounts (0.002-0.01) look best.",
		code: `// Apply to a texture: chromatic(tex, uv, amount)
// For use without texture, apply offset to your color calculation
vec3 chromaticAberration(vec2 uv, float amount) {
  vec2 offset = (uv - 0.5) * amount;
  // Use these UVs to sample R, G, B separately:
  vec2 uvR = uv + offset;
  vec2 uvG = uv;
  vec2 uvB = uv - offset;
  // Return offset UVs (apply to your own sampling)
  return vec3(uvR.x, uvG.x, uvB.x); // placeholder
}`,
	},
	{
		id: "scanlines",
		name: "CRT Scanlines",
		category: "effects",
		description: "Retro CRT monitor scanline effect",
		difficulty: 1,
		hint: "Multiply your output by this to get retro CRT scanlines. Higher count = finer lines.",
		code: `float scanlines(vec2 uv, float count, float intensity) {
  float scan = sin(uv.y * count * 3.14159) * 0.5 + 0.5;
  return 1.0 - intensity * (1.0 - scan);
}`,
	},
	{
		id: "glitch",
		name: "Digital Glitch",
		category: "effects",
		description: "Random UV displacement for glitch-art effects",
		difficulty: 2,
		hint: "Combine with time-based triggers for intermittent glitch bursts. Lower amount = subtler.",
		code: `vec2 glitchUV(vec2 uv, float time, float amount) {
  float lineJitter = step(0.95, fract(sin(floor(uv.y * 50.0) + time * 10.0) * 43758.5453));
  float blockShift = step(0.98, fract(sin(floor(time * 5.0)) * 12345.6789));
  float offset = lineJitter * amount * blockShift;
  return vec2(uv.x + offset, uv.y);
}`,
		requiredUniforms: [{ name: "uTime", type: "float", value: 0 }],
	},
	// ═══ MODULATION ═══

	{
		id: "endpoint_float",
		name: "@endpoint Float",
		category: "modulation",
		description: "Float uniform exposed to the Node Editor via @endpoint",
		difficulty: 1,
		hint: "Add @endpoint to any uniform to make it controllable from the Node Editor. min/max define the range.",
		code: `uniform float myParam; // @endpoint min:0 max:1 label:"My Parameter"`,
	},
	{
		id: "endpoint_color",
		name: "@endpoint Color",
		category: "modulation",
		description: "Color uniform exposed to the Node Editor via @endpoint",
		difficulty: 1,
		hint: "Use the color flag to render a color picker. default sets the initial hex color.",
		code: `uniform vec3 myColor; // @endpoint default:#FF00FF color`,
	},
];

/** Get snippets filtered by category */
export function getSnippetsByCategory(category: string): ShaderSnippet[] {
	return SNIPPETS.filter((s) => s.category === category);
}

/** All unique categories in order */
export const SNIPPET_CATEGORIES: string[] = [
	"noise",
	"sdf",
	"math",
	"color",
	"uv",
	"animation",
	"lighting",
	"effects",
	"modulation",
];

/** CodeMirror completion items from snippets — triggered by `/` at line start */
export function getSnippetCompletions(): {
	label: string;
	detail: string;
	info: string;
	apply: string;
	type: string;
}[] {
	return SNIPPETS.map((s) => ({
		label: `/${s.id}`,
		detail: `[${s.category}]`,
		info: s.description,
		apply: s.code,
		type: "function",
	}));
}
