// Instanced vertex shader — for THREE.InstancedMesh
// Reads per-instance transform from instanceMatrix attribute

attribute mat4 instanceMatrix;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;

void main() {
  vUv = uv;

  // Apply instance transform
  vec4 instancePosition = instanceMatrix * vec4(position, 1.0);
  vNormal = normalize(mat3(instanceMatrix) * normalMatrix * normal);
  vPosition = (modelMatrix * instancePosition).xyz;

  gl_Position = projectionMatrix * modelViewMatrix * instancePosition;
}
