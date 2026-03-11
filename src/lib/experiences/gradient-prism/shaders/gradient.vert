attribute vec3 aColorA;
attribute vec3 aColorB;
attribute float aGradientAngle;
attribute float aBrightness;

varying vec3 vColorA;
varying vec3 vColorB;
varying float vGradientAngle;
varying float vBrightness;
varying vec3 vLocalPos;
varying vec3 vWorldNormal;
varying vec3 vWorldPos;
varying float vFogDepth;

void main() {
  vColorA = aColorA;
  vColorB = aColorB;
  vGradientAngle = aGradientAngle;
  vBrightness = aBrightness;
  vLocalPos = position;

  vec4 instancePos = instanceMatrix * vec4(position, 1.0);
  vec3 instanceNormal = mat3(instanceMatrix) * normal;

  vWorldNormal = normalize((modelMatrix * vec4(instanceNormal, 0.0)).xyz);
  vWorldPos = (modelMatrix * instancePos).xyz;

  vec4 mvPos = modelViewMatrix * instancePos;
  vFogDepth = -mvPos.z;

  gl_Position = projectionMatrix * mvPos;
}
