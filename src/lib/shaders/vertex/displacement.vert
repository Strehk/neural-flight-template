precision highp float;
// Displacement vertex shader — deforms geometry along normals
// Uses sine wave combination for organic displacement effect
//
// Varyings passed to fragment shader:
//   vUv       — texture coordinates [0, 1]
//   vNormal   — view-space normal (normalMatrix * normal), normalized
//   vPosition — world-space position of the displaced vertex

uniform float uDisplacement;
uniform float uDisplacementFreq;
uniform float uTime;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;

void main() {
  vUv = uv;
  vNormal = normalize(normalMatrix * normal);

  // Displace along normal using sine wave
  float displacement = sin(position.x * uDisplacementFreq + uTime) *
                       sin(position.y * uDisplacementFreq + uTime) *
                       sin(position.z * uDisplacementFreq + uTime) *
                       uDisplacement;
  vec3 displaced = position + normal * displacement;

  vPosition = (modelMatrix * vec4(displaced, 1.0)).xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
}
