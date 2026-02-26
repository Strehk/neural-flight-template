uniform float uTime;
uniform vec2 uResolution;
varying vec2 vUv;

uniform float uBass;        // @endpoint min:0.0 max:1.0 default:0.5
uniform float uMid;         // @endpoint min:0.0 max:1.0 default:0.3
uniform float uTreble;      // @endpoint min:0.0 max:1.0 default:0.7
uniform float uReactivity;  // @endpoint min:0.0 max:2.0 default:1.0

void main() {
  vec2 uv = vUv;
  vec2 centered = uv - 0.5;
  float dist = length(centered);
  float angle = atan(centered.y, centered.x);

  // Bass: radial pulse
  float bassPulse = uBass * uReactivity;
  float ring = smoothstep(0.3 - bassPulse * 0.15, 0.3, dist)
             * (1.0 - smoothstep(0.3, 0.3 + 0.02 + bassPulse * 0.1, dist));

  // Mid: angular waves
  float midWave = sin(angle * 8.0 + uTime * 3.0) * uMid * uReactivity * 0.3;
  float midPattern = smoothstep(0.2, 0.25, dist + midWave)
                   * (1.0 - smoothstep(0.35, 0.4, dist + midWave));

  // Treble: high-frequency shimmer
  float trebleShimmer = sin(uv.x * 50.0 + uTime * 10.0) * sin(uv.y * 50.0 + uTime * 8.0);
  trebleShimmer = trebleShimmer * uTreble * uReactivity * 0.3;

  // Color mapping
  vec3 bassColor = vec3(0.9, 0.1, 0.2) * ring * 2.0;
  vec3 midColor = vec3(0.1, 0.8, 0.3) * midPattern * 1.5;
  vec3 trebleColor = vec3(0.2, 0.3, 1.0) * max(0.0, trebleShimmer);

  vec3 color = bassColor + midColor + trebleColor;

  // Background gradient
  color += vec3(0.02, 0.01, 0.03) * (1.0 - dist);

  gl_FragColor = vec4(color, 1.0);
}
