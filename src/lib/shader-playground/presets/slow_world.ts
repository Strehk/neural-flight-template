import type { PresetDef } from "../types";

export const PRESET_SLOW_WORLD: PresetDef = {
	id: "slow-world",
	name: "Slow Motion",
	psychEffect: "Time Dilation",
	description: "Particle-like field with time scaling and trail effects",
	scienceNote:
		"Altered time perception in VR correlates with increased mindfulness and present-moment awareness.",
	fragmentShader: /* glsl */ `uniform float uTime;
uniform vec2 uResolution;
varying vec2 vUv;

uniform float uTimeScale;   // @endpoint min:0.01 max:2.0 default:1.0
uniform float uTrailLength; // @endpoint min:0.0 max:1.0 default:0.5
uniform float uDensity;     // @endpoint min:1.0 max:20.0 default:8.0

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

void main() {
  vec2 uv = vUv;
  float t = uTime * uTimeScale;

  vec3 color = vec3(0.01, 0.01, 0.02);

  // Particle field
  for (int i = 0; i < 20; i++) {
    if (float(i) >= uDensity) break;

    float fi = float(i);
    vec2 seed = vec2(fi * 0.73, fi * 1.37);

    // Particle position (slow orbit)
    float px = hash(seed) + sin(t * 0.3 * hash(seed + 1.0)) * 0.3;
    float py = hash(seed + 10.0) + cos(t * 0.25 * hash(seed + 2.0)) * 0.3;
    vec2 pos = vec2(px, py);

    // Trail (offset positions in the past)
    for (int j = 0; j < 5; j++) {
      float trailT = t - float(j) * 0.1 * uTrailLength;
      vec2 trailPos = vec2(
        hash(seed) + sin(trailT * 0.3 * hash(seed + 1.0)) * 0.3,
        hash(seed + 10.0) + cos(trailT * 0.25 * hash(seed + 2.0)) * 0.3
      );

      float d = length(uv - trailPos);
      float brightness = 0.003 / (d * d + 0.001);
      float fade = 1.0 - float(j) / 5.0;

      // Color per particle
      vec3 particleColor;
      particleColor.r = hash(seed + 20.0) * 0.5 + 0.3;
      particleColor.g = hash(seed + 30.0) * 0.3 + 0.2;
      particleColor.b = hash(seed + 40.0) * 0.5 + 0.5;

      color += particleColor * brightness * fade;
    }
  }

  // Soft vignette
  float vig = 1.0 - length(vUv - 0.5) * 0.8;
  color *= vig;

  gl_FragColor = vec4(color, 1.0);
}
`,
	vertexShader: null,
	uniforms: [
		{ name: "uTimeScale", type: "float", value: 1.0, min: 0.01, max: 2.0, endpoint: true },
		{ name: "uTrailLength", type: "float", value: 0.5, min: 0.0, max: 1.0, endpoint: true },
		{ name: "uDensity", type: "float", value: 8.0, min: 1.0, max: 20.0, endpoint: true },
	],
	geometry: "plane",
	tutorial: {
		explore: [
			"Reduce uTimeScale below 0.1 for extreme slow-motion. Notice how detail perception increases.",
			"uTrailLength creates motion trails — longer trails emphasize the time-stretching effect.",
			"Try uDensity at 2-3 for a minimal, zen-like experience.",
		],
		challenge:
			"Connect an LFO to uTimeScale to create alternating fast/slow time perception.",
		psychTip:
			"Extremely slow motion (<0.1x) creates a meditative state. The brain shifts to detail-oriented processing.",
	},
	tags: ["time", "particles", "slow-motion", "meditation"],
	difficulty: 2,
};
