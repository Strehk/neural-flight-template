precision highp float;

// Ocean Vertex Shader — Gerstner wave displacement
// Simulates realistic ocean surface using sum of 3 directional waves
// Each wave has: direction, steepness (Q), amplitude, frequency, speed
// @perf-tier: quest-safe
// @cost: low — 3 sin/cos pairs per vertex

uniform float uWaveAmplitude;
uniform float uWaveFreq;
uniform float uWaveSpeed;
uniform float uTime;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;

// Single Gerstner wave contribution
vec3 gerstnerWave(vec2 dir, float steepness, float amplitude, float freq, float speed, vec3 pos) {
  float phase = dot(dir, pos.xz) * freq + uTime * speed;
  float s = sin(phase);
  float c = cos(phase);

  return vec3(
    steepness * amplitude * dir.x * c,  // X displacement
    amplitude * s,                        // Y displacement (height)
    steepness * amplitude * dir.y * c     // Z displacement
  );
}

void main() {
  vUv = uv;

  // World-space wave sampling for infinite terrain (mesh follows player)
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vec3 wPos = worldPos.xyz;

  // Sum of 3 waves with different directions and parameters
  vec3 wave = vec3(0.0);
  wave += gerstnerWave(vec2(1.0, 0.0), 0.5, uWaveAmplitude, uWaveFreq, uWaveSpeed, wPos);
  wave += gerstnerWave(vec2(0.7, 0.7), 0.3, uWaveAmplitude * 0.6, uWaveFreq * 1.3, uWaveSpeed * 1.1, wPos);
  wave += gerstnerWave(vec2(-0.3, 0.9), 0.2, uWaveAmplitude * 0.3, uWaveFreq * 2.1, uWaveSpeed * 0.9, wPos);

  vec3 displaced = position + wave;

  // Approximate normal from wave derivatives
  vec3 tangent = normalize(vec3(1.0, wave.y * 0.5, 0.0));
  vec3 bitangent = normalize(vec3(0.0, wave.y * 0.5, 1.0));
  vNormal = normalize(cross(bitangent, tangent));

  vPosition = (modelMatrix * vec4(displaced, 1.0)).xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
}
