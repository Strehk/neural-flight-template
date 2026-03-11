uniform vec3 uBaseColor;
uniform float uTime;
uniform float uFogNear;
uniform float uFogFar;
uniform vec3 uFogColor;
uniform float uPlayerY;

varying vec3 vWorldPos;
varying vec3 vWorldNormal;
varying vec3 vLocalPos;
varying float vFogDepth;

float hash(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

float noise3D(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x),
        mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
    mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
        mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y),
    f.z);
}

void main() {
  // Animated multi-octave noise — crawling stone texture
  vec3 drift = vec3(uTime * 0.03, uTime * 0.01, uTime * 0.025);
  vec3 p1 = vWorldPos * 0.4 + drift;
  vec3 p2 = vWorldPos * 1.2 + drift * 1.5;
  vec3 p3 = vWorldPos * 3.5 + drift * 2.0;
  vec3 p4 = vWorldPos * 10.0 + drift * 0.5;
  float n = noise3D(p1) * 0.4
          + noise3D(p2) * 0.3
          + noise3D(p3) * 0.18
          + noise3D(p4) * 0.1;

  // Warped noise — domain distortion for organic feel
  float warp = noise3D(vWorldPos * 0.2 + vec3(0.0, uTime * 0.05, 0.0));
  n += noise3D(p1 + warp * 2.0) * 0.15;

  // Directional lighting
  vec3 lightDir = normalize(vec3(0.4, 0.7, 0.3));
  float diffuse = max(dot(vWorldNormal, lightDir), 0.0) * 0.65 + 0.35;

  // Specular — sharp glint
  vec3 viewDir = normalize(cameraPosition - vWorldPos);
  vec3 halfDir = normalize(lightDir + viewDir);
  float spec = pow(max(dot(vWorldNormal, halfDir), 0.0), 48.0);

  // Second specular from below — faking light bounce
  vec3 lightDir2 = normalize(vec3(-0.3, -0.5, 0.6));
  vec3 halfDir2 = normalize(lightDir2 + viewDir);
  float spec2 = pow(max(dot(vWorldNormal, halfDir2), 0.0), 32.0);

  // Deep corner AO
  float ao = smoothstep(0.0, 0.2, min(
    min(vLocalPos.x + 0.5, 0.5 - vLocalPos.x),
    min(vLocalPos.y + 0.5, 0.5 - vLocalPos.y)
  )) * 0.45 + 0.55;

  // Animated colored ambient — breathing environment color
  vec3 ambientTint = vec3(0.12, 0.06, 0.22) + vec3(
    sin(vWorldPos.x * 0.04 + uTime * 0.12) * 0.05,
    cos(vWorldPos.z * 0.05 + uTime * 0.08) * 0.03,
    sin(vWorldPos.y * 0.06 + uTime * 0.18) * 0.07
  );

  vec3 color = uBaseColor * (0.45 + n * 0.55) * diffuse * ao + ambientTint * ao;

  // Speculars
  color += vec3(0.5, 0.45, 0.6) * spec * 0.4;
  color += vec3(0.3, 0.15, 0.5) * spec2 * 0.2;

  // Strong rim light
  float rim = pow(1.0 - max(dot(vWorldNormal, viewDir), 0.0), 3.0);
  color += vec3(0.18, 0.08, 0.3) * rim;

  // Atmospheric fog with ambient haze
  float distFog = smoothstep(uFogNear, uFogFar, vFogDepth);
  float heightFog = exp(-max(vWorldPos.y - uPlayerY, 0.0) * 0.025) * 0.55;
  float ambientHaze = 0.06;
  float fogFactor = clamp(distFog + heightFog * (1.0 - distFog) + ambientHaze, 0.0, 1.0);

  vec3 warmFog = uFogColor + vec3(0.1, 0.04, 0.02);
  vec3 coolFog = uFogColor + vec3(-0.02, 0.01, 0.06);
  float verticalMix = smoothstep(-0.3, 0.3, normalize(vWorldPos - cameraPosition).y);
  vec3 finalFog = mix(warmFog, coolFog, verticalMix);

  color = mix(color, finalFog, fogFactor);

  gl_FragColor = vec4(color, 1.0);
}
