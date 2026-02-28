precision highp float;
// Instanced vertex shader — for THREE.InstancedMesh
// Reads per-instance transform from instanceMatrix attribute
//
// Varyings passed to fragment shader:
//   vUv       — texture coordinates [0, 1]
//   vNormal   — instance-space normal (mat3(instanceMatrix) * normal), normalized
//   vPosition — world-space position (modelMatrix * instanceMatrix applied)

attribute mat4 instanceMatrix;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;

void main() {
  vUv = uv;

  // Apply instance transform
  vec4 instancePosition = instanceMatrix * vec4(position, 1.0);
  vNormal = normalize(mat3(instanceMatrix) * normal);
  vPosition = (modelMatrix * instancePosition).xyz;

  gl_Position = projectionMatrix * modelViewMatrix * instancePosition;
}
