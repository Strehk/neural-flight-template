/**
 * Gradient Prism — Animated prismatic surface shaders for InstancedMesh
 *
 * Both shaders manually apply `instanceMatrix` because Three.js
 * only auto-injects instance transforms for built-in materials, not ShaderMaterial.
 *
 * Two materials:
 * 1. Gradient cubes — vivid, self-illuminated with slow color cycling + brightness pulse
 * 2. Dark cubes — rough stone-like surfaces with animated noise crawl
 *
 * Both include manual fog integration (Three.js fog doesn't work on ShaderMaterial).
 */
import * as THREE from "three";

// ── Gradient Cube Material ──────────────────────────────────────────────

const GRADIENT_VERT = /* glsl */ `
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
`;

const GRADIENT_FRAG = /* glsl */ `
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
  float ambientHaze = 0.08; // always some haze for depth
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
`;

export function createGradientCubeMaterial(
	fogNear: number,
	fogFar: number,
	fogColor: THREE.Color,
): THREE.ShaderMaterial {
	return new THREE.ShaderMaterial({
		vertexShader: GRADIENT_VERT,
		fragmentShader: GRADIENT_FRAG,
		transparent: true,
		depthWrite: true,
		uniforms: {
			uTime: { value: 0 },
			uHueShift: { value: 0 },
			uPlayerY: { value: 0 },
			uFogNear: { value: fogNear },
			uFogFar: { value: fogFar },
			uFogColor: { value: fogColor },
		},
	});
}

// ── Dark/Stone Cube Material ────────────────────────────────────────────

const DARK_VERT = /* glsl */ `
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
`;

const DARK_FRAG = /* glsl */ `
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
`;

export function createDarkCubeMaterial(
	fogNear: number,
	fogFar: number,
	fogColor: THREE.Color,
): THREE.ShaderMaterial {
	return new THREE.ShaderMaterial({
		vertexShader: DARK_VERT,
		fragmentShader: DARK_FRAG,
		uniforms: {
			uBaseColor: { value: new THREE.Color(0.28, 0.26, 0.32) },
			uPlayerY: { value: 0 },
			uTime: { value: 0 },
			uFogNear: { value: fogNear },
			uFogFar: { value: fogFar },
			uFogColor: { value: fogColor },
		},
	});
}
