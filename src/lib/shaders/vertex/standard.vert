precision highp float;
// Standard vertex shader — default Three.js compatible
//
// Varyings passed to fragment shader:
//   vUv       — texture coordinates [0, 1]
//   vNormal   — view-space normal (normalMatrix * normal), normalized
//   vPosition — world-space position (modelMatrix applied)

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;

void main() {
  vUv = uv;
  vNormal = normalize(normalMatrix * normal);
  vPosition = (modelMatrix * vec4(position, 1.0)).xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
