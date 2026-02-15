import type { PresetDef } from "../types";

export const PRESET_EGO_DISSOLUTION: PresetDef = {
	id: "ego-dissolution",
	name: "Ego Dissolve",
	psychEffect: "Ego Dissolution",
	description: "Noise-based dissolve with glowing edges — form melts into void",
	scienceNote:
		"Dissolving body boundaries in VR correlates with oceanic boundlessness on the 5D-ASC scale.",
	fragmentShader: /* glsl */ `uniform float uTime;
uniform vec2 uResolution;
varying vec2 vUv;

uniform float uDissolve;    // @endpoint min:0.0 max:1.0 default:0.0
uniform float uMorphSpeed;  // @endpoint min:0.0 max:3.0 default:1.0
uniform float uEdgeGlow;    // @endpoint min:0.0 max:2.0 default:0.5
uniform vec3 uEdgeColor;    // @endpoint color default:#ff6600

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float valueNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * valueNoise(p);
    p *= 2.0;
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 uv = vUv;
  float t = uTime * uMorphSpeed;

  // Noise-based dissolve pattern
  float noise = fbm(uv * 5.0 + vec2(t * 0.3, t * 0.2));
  noise += fbm(uv * 10.0 - vec2(t * 0.1, t * 0.4)) * 0.3;

  // Dissolve threshold
  float threshold = uDissolve;
  float edge = smoothstep(threshold - 0.05, threshold, noise)
             - smoothstep(threshold, threshold + 0.05, noise);

  // Body color (what remains)
  vec3 bodyColor = vec3(0.15, 0.12, 0.2);
  bodyColor += vec3(0.1, 0.05, 0.15) * noise;

  // Edge glow
  vec3 glowColor = uEdgeColor * uEdgeGlow * edge * 3.0;

  // Dissolved area (void)
  vec3 voidColor = vec3(0.02, 0.01, 0.03);

  // Composite
  float visible = step(noise, threshold);
  vec3 color = mix(bodyColor, voidColor, 1.0 - visible) + glowColor;

  gl_FragColor = vec4(color, 1.0);
}
`,
	vertexShader: null,
	uniforms: [
		{ name: "uDissolve", type: "float", value: 0.0, min: 0.0, max: 1.0, endpoint: true },
		{ name: "uMorphSpeed", type: "float", value: 1.0, min: 0.0, max: 3.0, endpoint: true },
		{ name: "uEdgeGlow", type: "float", value: 0.5, min: 0.0, max: 2.0, endpoint: true },
		{ name: "uEdgeColor", type: "vec3", value: [1.0, 0.4, 0.0], endpoint: true, color: true },
	],
	geometry: "sphere",
	tutorial: {
		explore: [
			"Slowly increase uDissolve from 0 to 1 and watch the form melt away.",
			"uEdgeGlow controls the intensity of the glowing dissolve edge.",
			"Try connecting an LFO to uDissolve for a breathing dissolve cycle.",
		],
		challenge:
			"Modify the shader to dissolve from the edges inward instead of using noise (hint: use distance from center).",
		psychTip:
			"The dissolve effect is most impactful when slow (2-5 seconds). Rapid dissolve can cause discomfort.",
	},
	tags: ["dissolve", "ego", "psychedelic", "noise"],
	difficulty: 2,
};
