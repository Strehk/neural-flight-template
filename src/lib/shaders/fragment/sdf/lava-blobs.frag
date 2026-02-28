// Lava Blobs — Raymarched metaballs with smooth union
// Quest-optimized: 8 metaballs, 32 march steps, early exit
// Based on cineshader-lava pattern but tuned for mobile VR
// @perf-tier: quest-safe
// @category: sdf

#pragma include <sdf>

uniform float uBlobCount;   // 4-8, default 6
uniform float uBlobSpeed;   // 0.5-3.0, default 1.0
uniform float uSmoothness;  // 0.2-1.0, default 0.4 (k in opSmooth)
uniform float uWarmth;      // 0.0-1.0, default 0.7 (orange↔magenta)

// Metaball positions animated with sin/cos offsets
vec3 blobPos(int i, float t) {
  float fi = float(i);
  float speed = t * uBlobSpeed;
  return vec3(
    sin(speed * 0.7 + fi * 1.3) * 1.5,
    cos(speed * 0.5 + fi * 0.9) * 1.2 + sin(speed * 0.3 + fi * 2.1) * 0.5,
    sin(speed * 0.4 + fi * 1.7) * 1.5
  );
}

// Scene SDF — smooth union of metaballs
float sceneSdf(vec3 p, float t) {
  float d = 1e10;
  int count = int(uBlobCount);
  for (int i = 0; i < 8; i++) {
    if (i >= count) break;
    float sphere = sdSphere(p - blobPos(i, t), 0.4 + 0.15 * sin(t + float(i)));
    d = opSmooth(d, sphere, uSmoothness);
  }
  return d;
}

// Estimate normal via central differences
vec3 calcNormal(vec3 p, float t) {
  vec2 e = vec2(0.002, 0.0);
  return normalize(vec3(
    sceneSdf(p + e.xyy, t) - sceneSdf(p - e.xyy, t),
    sceneSdf(p + e.yxy, t) - sceneSdf(p - e.yxy, t),
    sceneSdf(p + e.yyx, t) - sceneSdf(p - e.yyx, t)
  ));
}

void main() {
  vec2 uv = (gl_FragCoord.xy - uResolution * 0.5) / uResolution.y;

  // Camera setup
  vec3 ro = vec3(0.0, 0.0, -3.5);
  vec3 rd = normalize(vec3(uv, 1.0));

  // Raymarching — 32 steps with early exit
  float totalDist = 0.0;
  float minDist = 1e10;
  vec3 p = ro;
  bool hit = false;

  for (int i = 0; i < 32; i++) {
    p = ro + rd * totalDist;
    float d = sceneSdf(p, uTime);
    minDist = min(minDist, d);

    if (d < 0.001) {
      hit = true;
      break;
    }
    if (totalDist > 8.0) break;
    totalDist += d;
  }

  // Coloring
  vec3 col = vec3(0.02, 0.0, 0.04); // dark background

  if (hit) {
    vec3 n = calcNormal(p, uTime);

    // Warm lava palette — blend orange↔magenta via uWarmth
    vec3 orange = vec3(1.0, 0.4, 0.05);
    vec3 magenta = vec3(0.9, 0.1, 0.5);
    vec3 baseCol = mix(orange, magenta, uWarmth);

    // Lambertian + rim
    vec3 lightDir = normalize(vec3(0.5, 1.0, -0.3));
    float diff = max(dot(n, lightDir), 0.0) * 0.6 + 0.4;
    float rim = pow(1.0 - abs(dot(n, -rd)), 2.5);

    col = baseCol * diff;
    col += rim * mix(vec3(1.0, 0.8, 0.2), vec3(1.0, 0.3, 0.8), uWarmth) * 0.6;

    // Hot center glow
    col += vec3(1.0, 0.9, 0.5) * pow(max(dot(n, -rd), 0.0), 4.0) * 0.3;
  } else {
    // Soft glow for near-misses
    float glow = exp(-minDist * 3.0) * 0.4;
    col += mix(vec3(1.0, 0.3, 0.0), vec3(0.8, 0.1, 0.5), uWarmth) * glow;
  }

  gl_FragColor = vec4(col, 1.0);
}
