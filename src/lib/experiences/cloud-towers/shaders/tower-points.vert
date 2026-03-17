attribute float aBirthTime;
attribute float aFinalY;

uniform float uTime;
uniform float uGrowthSpeed;
uniform float uPointSize;
uniform float uFogNear;
uniform float uFogFar;

varying float vFogFactor;
varying float vBrightness;

void main() {
  // Growth animation: smooth ease-in via squared factor
  float age = (uTime - aBirthTime) * uGrowthSpeed;
  float growFactor = clamp(age, 0.0, 1.0);
  growFactor *= growFactor; // ease-in quadratic

  // Animate Y position from ground to final height
  vec3 pos = position;
  pos.y = mix(0.0, aFinalY, growFactor);

  vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
  float dist = -mvPos.z;

  // Size attenuation — closer points are larger
  gl_PointSize = uPointSize * (300.0 / dist);

  // Fade out points that haven't grown yet
  vBrightness = growFactor;

  // Linear fog factor
  vFogFactor = smoothstep(uFogNear, uFogFar, dist);

  gl_Position = projectionMatrix * mvPos;
}
