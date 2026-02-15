import type { PresetDef } from "../types";

export const PRESET_NEURAL_NOISE: PresetDef = {
	id: "neural-noise",
	name: "Neural Noise",
	psychEffect: "Sense of Agency",
	description: "Multi-octave fractal noise with modulated parameters",
	scienceNote:
		"Fractals with dimension D≈1.3 correlate with reduced stress and increased aesthetic preference (Taylor et al., 2011).",
	fragmentShader: /* glsl */ `uniform float uTime;
uniform vec2 uResolution;
varying vec2 vUv;

uniform float uOctaves;     // @endpoint min:2.0 max:8.0 default:4.0
uniform float uNoiseSpeed;  // @endpoint min:0.1 max:5.0 default:1.0
uniform float uDistortion;  // @endpoint min:0.0 max:2.0 default:0.5
uniform vec3 uBaseColor;    // @endpoint color default:#1a4dcc

// Simplex-like hash noise
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289v(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x * 34.0) + 1.0) * x); }

float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                     -0.577350269189626, 0.024390243902439);
  vec2 i = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod289v(i);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
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
}

float fbm(vec2 p, float octaves) {
  float value = 0.0;
  float amp = 0.5;
  float freq = 1.0;
  for (int i = 0; i < 8; i++) {
    if (float(i) >= octaves) break;
    value += amp * snoise(p * freq);
    freq *= 2.0;
    amp *= 0.5;
  }
  return value;
}

void main() {
  vec2 uv = vUv * 3.0 - 1.5;
  float t = uTime * uNoiseSpeed;

  // Domain distortion
  float n1 = fbm(uv + vec2(t * 0.3, t * 0.1), uOctaves);
  vec2 distorted = uv + vec2(n1) * uDistortion;

  // Second pass
  float n2 = fbm(distorted + vec2(t * 0.1, -t * 0.2), uOctaves);
  float n3 = fbm(distorted + vec2(-t * 0.15, t * 0.25), uOctaves);

  // Color mapping
  float intensity = n2 * 0.5 + 0.5;
  vec3 color = uBaseColor * intensity;
  color += vec3(0.8, 0.4, 0.1) * max(0.0, n3) * 0.5;
  color += vec3(0.1, 0.6, 0.9) * max(0.0, -n2) * 0.3;

  gl_FragColor = vec4(color, 1.0);
}
`,
	vertexShader: null,
	uniforms: [
		{ name: "uOctaves", type: "float", value: 4.0, min: 2.0, max: 8.0, endpoint: true },
		{ name: "uNoiseSpeed", type: "float", value: 1.0, min: 0.1, max: 5.0, endpoint: true },
		{ name: "uDistortion", type: "float", value: 0.5, min: 0.0, max: 2.0, endpoint: true },
		{ name: "uBaseColor", type: "vec3", value: [0.1, 0.3, 0.8], endpoint: true, color: true },
	],
	geometry: "sphere",
	tutorial: {
		explore: [
			"Increase uOctaves to add more fine detail (but costs more GPU).",
			"uDistortion creates domain warping — higher values = more organic shapes.",
			"Try uNoiseSpeed at 0.1 for slow, meditative evolution.",
		],
		challenge:
			"Add a 3rd FBM pass to warp the UV coords even further. What happens to the visual complexity?",
		psychTip:
			"Fractal dimension D≈1.3 is the 'stress-reducing sweet spot'. 4-5 octaves at moderate distortion approaches this.",
	},
	tags: ["noise", "fbm", "fractal", "generative"],
	difficulty: 2,
};
