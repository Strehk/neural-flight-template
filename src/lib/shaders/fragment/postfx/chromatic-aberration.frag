// Chromatic Aberration — RGB channel offset lens effect
// @perf-tier: quest-safe
// @cost: 3 texture lookups (one per channel), no loops
//
// Usage: Render scene to texture, then apply as fullscreen quad.
// The scene texture must be passed as uSceneTexture.

uniform sampler2D uSceneTexture;
uniform float uIntensity;
uniform float uFalloff;

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 uv = fragCoord.xy / uResolution.xy;

  // Distance from center for radial intensity
  vec2 center = uv - 0.5;
  float dist = length(center);
  float strength = uIntensity * pow(dist, uFalloff);

  // Direction from center (radial)
  vec2 dir = normalize(center + 0.0001) * strength;

  // Offset each channel differently
  float r = texture2D(uSceneTexture, uv + dir).r;
  float g = texture2D(uSceneTexture, uv).g;
  float b = texture2D(uSceneTexture, uv - dir).b;

  fragColor = vec4(r, g, b, 1.0);
}
