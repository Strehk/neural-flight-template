import type { PresetDef } from "../types";

export const PRESET_CELLULAR_DRIFT: PresetDef = {
	id: "cellular-drift",
	name: "Cellular World",
	psychEffect: "Awe + Small Self",
	description: "Voronoi cells with bioluminescent glow at variable scales",
	scienceNote:
		"The 'overview effect' — seeing oneself as tiny within vastness — reduces self-focus and increases prosocial behavior.",
	fragmentShader: /* glsl */ `uniform float uTime;
uniform vec2 uResolution;
varying vec2 vUv;

uniform float uScale;         // @endpoint min:0.1 max:100.0 default:10.0
uniform float uGlowIntensity; // @endpoint min:0.0 max:3.0 default:1.5
uniform float uDriftSpeed;    // @endpoint min:0.0 max:2.0 default:0.5
uniform vec3 uBioColor;       // @endpoint color default:#00ff88

vec2 voronoiHash(vec2 p) {
  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
  return fract(sin(p) * 43758.5453);
}

vec3 voronoi(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float minDist = 1.0;
  float secondDist = 1.0;
  vec2 closestPoint = vec2(0.0);

  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 neighbor = vec2(float(x), float(y));
      vec2 point = voronoiHash(i + neighbor);
      point = 0.5 + 0.5 * sin(uTime * uDriftSpeed + 6.28318 * point);
      vec2 diff = neighbor + point - f;
      float dist = length(diff);
      if (dist < minDist) {
        secondDist = minDist;
        minDist = dist;
        closestPoint = point;
      } else if (dist < secondDist) {
        secondDist = dist;
      }
    }
  }

  return vec3(minDist, secondDist, closestPoint.x);
}

void main() {
  vec2 uv = vUv * uScale;

  vec3 v = voronoi(uv);
  float cellDist = v.x;
  float edgeDist = v.y - v.x;

  // Bioluminescent cell coloring
  float cellGlow = exp(-cellDist * 5.0) * uGlowIntensity;
  float edgeGlow = exp(-edgeDist * 15.0) * uGlowIntensity * 0.5;

  // Cell membrane (edge)
  vec3 membrane = uBioColor * edgeGlow;

  // Cell interior
  float hue = v.z + uTime * 0.05;
  vec3 interior = uBioColor * cellGlow * 0.3;
  interior *= 0.5 + 0.5 * sin(hue * 6.28 + vec3(0.0, 2.0, 4.0));

  // Background (deep void)
  vec3 bgColor = vec3(0.005, 0.01, 0.02);

  vec3 color = bgColor + membrane + interior;

  gl_FragColor = vec4(color, 1.0);
}
`,
	vertexShader: null,
	uniforms: [
		{ name: "uScale", type: "float", value: 10.0, min: 0.1, max: 100.0, endpoint: true },
		{ name: "uGlowIntensity", type: "float", value: 1.5, min: 0.0, max: 3.0, endpoint: true },
		{ name: "uDriftSpeed", type: "float", value: 0.5, min: 0.0, max: 2.0, endpoint: true },
		{ name: "uBioColor", type: "vec3", value: [0.0, 1.0, 0.53], endpoint: true, color: true },
	],
	geometry: "sphere",
	tutorial: {
		explore: [
			"Zoom between micro (uScale<1) and macro (uScale>50) to feel the scale shift.",
			"uDriftSpeed controls cell movement — slow drift feels organic, fast feels chaotic.",
			"Try warm uBioColor (#ff6600) for a lava-like effect, cool (#0088ff) for deep sea.",
		],
		challenge:
			"Layer two voronoi calls at different scales (uScale and uScale*10) and blend them.",
		psychTip:
			"Scale-shift from micro to macro triggers the 'overview effect' — a sense of awe and smallness.",
	},
	tags: ["voronoi", "cellular", "bioluminescence", "awe"],
	difficulty: 3,
};
