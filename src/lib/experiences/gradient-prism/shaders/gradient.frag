uniform float uTime;
uniform float uHueShift;
uniform float uFogNear;
uniform float uFogFar;
uniform vec3 uFogColor;
uniform float uPlayerY;

varying vec3 vColorA;
varying vec3 vColorB;
varying float vGradientAngle;
varying float vBrightness;
varying vec3 vLocalPos;
varying vec3 vWorldNormal;
varying vec3 vWorldPos;
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

vec3 rgb2hsv(vec3 c) {
  vec4 K = vec4(0.0, -1.0/3.0, 2.0/3.0, -1.0);
  vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
  vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
  float d = q.x - min(q.w, q.y);
  float e = 1.0e-10;
  return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}

vec3 hsv2rgb(vec3 c) {
  vec4 K = vec4(1.0, 2.0/3.0, 1.0/3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

void main() {
  float angle = vGradientAngle;
  vec2 dir = vec2(cos(angle), sin(angle));

  // Per-face gradient direction
  vec3 absN = abs(vWorldNormal);
  float t;
  if (absN.y > absN.x && absN.y > absN.z) {
    t = dot(vec2(vLocalPos.x, vLocalPos.z) + 0.5, dir);
  } else if (absN.x > absN.z) {
    t = dot(vec2(vLocalPos.y, vLocalPos.z) + 0.5, dir);
  } else {
    t = dot(vec2(vLocalPos.x, vLocalPos.y) + 0.5, dir);
  }
  t = smoothstep(0.0, 1.0, clamp(t, 0.0, 1.0));

  // Animated noise distortion on the gradient — living texture
  vec3 noiseP = vWorldPos * 0.15 + vec3(uTime * 0.04, uTime * 0.02, uTime * 0.03);
  float noiseDist = noise3D(noiseP) * 0.2;
  t = clamp(t + noiseDist - 0.1, 0.0, 1.0);

  vec3 baseColor = mix(vColorA, vColorB, t);

  // Hue cycling — faster, more visible
  float timeCycle = sin(uTime * 0.15 + vWorldPos.y * 0.03) * 0.08
                  + sin(uTime * 0.07 + vWorldPos.x * 0.02) * 0.04;
  float totalHue = uHueShift / 360.0 + timeCycle;
  if (abs(totalHue) > 0.001) {
    vec3 hsv = rgb2hsv(baseColor);
    hsv.x = fract(hsv.x + totalHue);
    baseColor = hsv2rgb(hsv);
  }

  // Multi-wave breathing pulse
  float pulse = 1.0
    + sin(uTime * 0.4 + vWorldPos.x * 0.08) * 0.12
    + sin(uTime * 0.7 + vWorldPos.z * 0.12) * 0.08
    + sin(uTime * 0.2 + vWorldPos.y * 0.05) * 0.1;

  // Chromatic prisma fresnel
  vec3 viewDir = normalize(cameraPosition - vWorldPos);
  float NdotV = abs(dot(vWorldNormal, viewDir));
  float fresnel = pow(1.0 - NdotV, 2.5);

  vec3 prismR = baseColor * vec3(1.5, 0.85, 0.7);
  vec3 prismB = baseColor * vec3(0.7, 0.85, 1.5);
  vec3 prismColor = mix(baseColor, mix(prismR, prismB, fresnel), fresnel * 0.8);

  // Specular
  vec3 lightDir = normalize(vec3(0.4, 0.7, 0.3));
  vec3 halfDir = normalize(lightDir + viewDir);
  float spec = pow(max(dot(vWorldNormal, halfDir), 0.0), 64.0);

  // Inner glow at edges
  float glow = smoothstep(0.3, 0.0, NdotV) * 0.5;

  // Surface iridescence — rainbow shimmer based on view angle + position
  float iridAngle = dot(vWorldNormal, viewDir) * 3.14159 + vWorldPos.y * 0.1 + uTime * 0.3;
  vec3 iridescence = vec3(
    sin(iridAngle) * 0.5 + 0.5,
    sin(iridAngle + 2.094) * 0.5 + 0.5,
    sin(iridAngle + 4.189) * 0.5 + 0.5
  ) * fresnel * 0.3;

  vec3 color = prismColor * vBrightness * pulse
    + vec3(1.0, 0.95, 0.9) * spec * 0.6
    + baseColor * glow
    + iridescence;

  // Atmospheric fog — distance + height + ambient haze
  float distFog = smoothstep(uFogNear, uFogFar, vFogDepth);
  float heightFog = exp(-max(vWorldPos.y - uPlayerY, 0.0) * 0.025) * 0.55;
  float ambientHaze = 0.08;
  float fogFactor = clamp(distFog + heightFog * (1.0 - distFog) + ambientHaze, 0.0, 1.0);

  vec3 warmFog = uFogColor + vec3(0.1, 0.04, 0.02);
  vec3 coolFog = uFogColor + vec3(-0.02, 0.01, 0.06);
  float verticalMix = smoothstep(-0.3, 0.3, normalize(vWorldPos - cameraPosition).y);
  vec3 finalFog = mix(warmFog, coolFog, verticalMix);

  color = mix(color, finalFog, fogFactor);

  // Alpha: glass-like transparency at edges
  float alpha = mix(0.95, 0.3, fresnel);

  gl_FragColor = vec4(color, alpha);
}
