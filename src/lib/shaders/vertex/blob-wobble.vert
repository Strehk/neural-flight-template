precision highp float;

// Blob Wobble — Organic surface deformation for InstancedMesh lava blobs
// Applies time-based wobble to vertex positions and recomputes normals.
// instanceMatrix is auto-injected by Three.js for InstancedMesh.
// @perf-tier: quest-safe
// @cost: low — 2 sin/cos per vertex

uniform float uTime;

varying vec3 vNormal;
varying vec3 vWorldPos;
varying float vRim;

void main() {
  // Organic surface wobble — blob-like deformation
  vec3 pos = position;
  float wobble = sin(uTime * 2.5 + position.y * 5.0 + position.x * 3.0) * 0.15;
  float wobble2 = cos(uTime * 1.8 + position.z * 4.0) * 0.1;
  pos *= 1.0 + wobble + wobble2;

  // Apply instance transform (position + scale set per-bubble in tick)
  vec4 worldPos = modelMatrix * instanceMatrix * vec4(pos, 1.0);
  vWorldPos = worldPos.xyz;

  // Recompute normal after wobble deformation for smooth shading
  vec3 deformedNormal = normalize(normal * (1.0 + wobble + wobble2));
  vNormal = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * deformedNormal);

  // Rim factor for fragment shader
  vec3 viewDir = normalize(cameraPosition - worldPos.xyz);
  vRim = 1.0 - abs(dot(vNormal, viewDir));

  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
