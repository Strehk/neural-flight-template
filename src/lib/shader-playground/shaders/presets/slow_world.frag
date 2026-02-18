uniform float uTime;
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
