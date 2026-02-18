uniform float uTime;
uniform vec2 uResolution;
varying vec2 vUv;

uniform float uSwarmSpeed;   // @endpoint min:0.0 max:5.0 default:1.0
uniform float uCoherence;    // @endpoint min:0.0 max:1.0 default:0.5
uniform float uParticleSize; // @endpoint min:0.001 max:0.1 default:0.02
uniform vec3 uFieldColor;    // @endpoint color default:#8800ff

// Simple noise
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

// Curl noise for divergence-free velocity field
vec2 curlNoise(vec2 p) {
  float eps = 0.01;
  float n1 = noise(vec2(p.x, p.y + eps));
  float n2 = noise(vec2(p.x, p.y - eps));
  float a = (n1 - n2) / (2.0 * eps);
  n1 = noise(vec2(p.x + eps, p.y));
  n2 = noise(vec2(p.x - eps, p.y));
  float b = (n1 - n2) / (2.0 * eps);
  return vec2(a, -b);
}

void main() {
  vec2 uv = vUv;
  float t = uTime * uSwarmSpeed;

  vec3 color = vec3(0.01, 0.005, 0.02);

  // Velocity field visualization
  vec2 fieldUV = uv * 5.0;
  vec2 vel = curlNoise(fieldUV + t * 0.3);

  // Add coherence (tendency to align)
  vec2 globalFlow = vec2(cos(t * 0.2), sin(t * 0.15));
  vel = mix(vel, globalFlow * 0.5, uCoherence);

  // Flow lines (streak pattern aligned to velocity)
  float flowAngle = atan(vel.y, vel.x);
  float flowSpeed = length(vel);

  // Particle dots along the flow
  for (int i = 0; i < 15; i++) {
    float fi = float(i);
    vec2 seed = vec2(fi * 1.73, fi * 2.31);

    // Particle position influenced by flow
    vec2 pos = vec2(
      fract(hash(seed) + t * vel.x * 0.1),
      fract(hash(seed + 50.0) + t * vel.y * 0.1)
    );

    float d = length(uv - pos);
    float brightness = uParticleSize / (d * d + uParticleSize * 0.1);

    // Color based on velocity direction
    float hue = flowAngle / 6.28 + 0.5;
    vec3 particleColor = uFieldColor * (0.5 + 0.5 * sin(hue * 6.28 + vec3(0.0, 2.0, 4.0)));

    color += particleColor * brightness * flowSpeed;
  }

  // Flow direction overlay (subtle lines)
  float linePattern = sin(dot(uv * 30.0, normalize(vel)) + t * 5.0);
  linePattern = smoothstep(0.95, 1.0, linePattern);
  color += uFieldColor * linePattern * 0.1;

  gl_FragColor = vec4(color, 1.0);
}
