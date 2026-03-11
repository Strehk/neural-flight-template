varying vec3 vWorldPos;
varying vec3 vWorldNormal;
varying vec3 vLocalPos;
varying float vFogDepth;

void main() {
  vLocalPos = position;

  vec4 instancePos = instanceMatrix * vec4(position, 1.0);
  vec3 instanceNormal = mat3(instanceMatrix) * normal;

  vWorldPos = (modelMatrix * instancePos).xyz;
  vWorldNormal = normalize((modelMatrix * vec4(instanceNormal, 0.0)).xyz);

  vec4 mvPos = modelViewMatrix * instancePos;
  vFogDepth = -mvPos.z;

  gl_Position = projectionMatrix * mvPos;
}
