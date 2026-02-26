uniform float uTime;
uniform vec2 uResolution;
varying vec2 vUv;

uniform float uBreathRate;  // @endpoint min:0.1 max:2.0 default:0.3
uniform float uPulseDepth;  // @endpoint min:0.0 max:1.0 default:0.5
uniform vec3 uBaseColor;    // @endpoint color default:#3388ff

void main() {
  vec2 centered = vUv - 0.5;
  float dist = length(centered);

  // Breathing cycle
  float breath = sin(uTime * uBreathRate * 6.28318) * 0.5 + 0.5;
  float pulse = 1.0 - uPulseDepth + uPulseDepth * breath;

  // Radial glow
  float glow = smoothstep(0.5 * pulse, 0.0, dist);
  float rim = smoothstep(0.35, 0.45 * pulse, dist) * (1.0 - smoothstep(0.45 * pulse, 0.5 * pulse, dist));

  vec3 color = uBaseColor * glow * pulse;
  color += vec3(1.0, 0.8, 0.9) * rim * 0.5;

  // Soft background
  color += vec3(0.02, 0.02, 0.05) * (1.0 - glow);

  gl_FragColor = vec4(color, 1.0);
}
