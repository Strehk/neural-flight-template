import * as THREE from "three";
import { BAT_MAX_PULSES, BAT_MOON, BAT_SCENE } from "./config";

export interface EchoPulseRenderState {
  origin: THREE.Vector3;
  radius: number;
  thickness: number;
  trail: number;
  intensity: number;
}

export interface SharedEchoUniforms {
  uTime: THREE.IUniform<number>;
  uPulseCount: THREE.IUniform<number>;
  uPulseOrigins: THREE.IUniform<THREE.Vector3[]>;
  uPulseParams: THREE.IUniform<THREE.Vector4[]>;
  uFogColor: THREE.IUniform<THREE.Color>;
  uFogNear: THREE.IUniform<number>;
  uFogFar: THREE.IUniform<number>;
  // Radius of the spherical view cutoff, decoupled from fog so a mode can hide all
  // world geometry (radius 0 = invisible room) while keeping its fog/background.
  uViewRadius: THREE.IUniform<number>;
  uBaseVisibility: THREE.IUniform<number>;
  uRevealIntensity: THREE.IUniform<number>;
  uWireThickness: THREE.IUniform<number>;
  uMoonDirection: THREE.IUniform<THREE.Vector3>;
  uMoonColor: THREE.IUniform<THREE.Color>;
  uDaylightFactor: THREE.IUniform<number>;
  uWhiteoutFactor: THREE.IUniform<number>;
  uEdgeFactor: THREE.IUniform<number>;
  uNoirFactor: THREE.IUniform<number>;
  uInfraredTone: THREE.IUniform<number>;
  uDepthVisFactor: THREE.IUniform<number>;
  uDepthInvertFactor: THREE.IUniform<number>;
  uDepthFloor: THREE.IUniform<number>;
  uDepthRadius: THREE.IUniform<number>;
  // Number of flat depth bands in the echolocation view (palette size). Tunable live.
  uDepthLevels: THREE.IUniform<number>;
}

interface RevealMaterialOptions {
  tintColor?: THREE.ColorRepresentation;
  /** Tint color used when uDaylightFactor = 1. Defaults to tintColor if omitted. */
  daylightTintColor?: THREE.ColorRepresentation;
  fillStrength: number;
  edgeStrength: number;
  silhouetteStrength: number;
  baseVisibilityBoost: number;
  trailBoost?: number;
  pulseBoost?: number;
  noirGroundWeight?: number;
  infraredTone?: number;
  doubleSided?: boolean;
  instanced?: boolean;
}

const COMMON_FRAGMENT = /* glsl */ `
precision highp float;
#define MAX_ECHO_PULSES ${BAT_MAX_PULSES}
// >1 holds the dark core and ramps sharply to the bright edge (more pronounced gradient).
#define DEPTH_CONTRAST 2.2
// Palette size for the depth view lives in uDepthLevels (uniform) so it can be tuned
// live — quantize the grey ramp to that many flat bands (low = chunky papercut layers
// with crisp contour edges, high = smooth gradient).
// Distance (as a fraction of the sphere radius) where terrain starts dissolving into
// the background, so the bubble edge and the chunks streaming in past it stay hidden.
#define DEPTH_EDGE_FADE 0.8

uniform float uTime;
uniform int uPulseCount;
uniform vec3 uPulseOrigins[MAX_ECHO_PULSES];
uniform vec4 uPulseParams[MAX_ECHO_PULSES];
uniform vec3 uFogColor;
uniform float uFogNear;
uniform float uFogFar;
uniform float uViewRadius;
uniform float uBaseVisibility;
uniform float uRevealIntensity;
uniform float uWireThickness;
uniform vec3 uMoonDirection;
uniform vec3 uMoonColor;
uniform float uDaylightFactor;
uniform float uWhiteoutFactor;
uniform float uEdgeFactor;
uniform float uNoirFactor;
uniform float uInfraredTone;
uniform float uDepthVisFactor;
uniform float uDepthInvertFactor;
uniform float uDepthFloor;
uniform float uDepthRadius;
uniform float uDepthLevels;
uniform vec3 uTintColor;
uniform vec3 uDaylightTintColor;
uniform float uFillStrength;
uniform float uEdgeStrength;
uniform float uSilhouetteStrength;
uniform float uBaseVisibilityBoost;
uniform float uTrailBoost;
uniform float uPulseBoost;
uniform float uNoirGroundWeight;

varying vec3 vWorldPos;
varying vec3 vWorldNormal;
varying vec3 vBarycentric;
varying vec3 vEchoColor;
varying vec3 vDayColor;

float edgeMask(vec3 barycentric, float width) {
	float nearestEdge = min(min(barycentric.x, barycentric.y), barycentric.z);
	return 1.0 - smoothstep(0.0, 0.075 * width, nearestEdge);
}

float pulseReveal(vec3 worldPos) {
	float reveal = 0.0;
	for (int i = 0; i < MAX_ECHO_PULSES; i++) {
		if (i >= uPulseCount) {
			continue;
		}

		float distToPulse = distance(worldPos, uPulseOrigins[i]);
		float radius = uPulseParams[i].x;
		float thickness = uPulseParams[i].y;
		float trail = uPulseParams[i].z * uTrailBoost;
		float intensity = uPulseParams[i].w;
		float lag = radius - distToPulse;
		float frontBand = (1.0 - smoothstep(0.0, thickness, abs(lag))) * uPulseBoost;
		float afterglow = 0.0;
		if (lag > 0.0 && lag < trail) {
			float fade = 1.0 - smoothstep(0.0, trail, lag);
			afterglow = fade * fade * (0.65 + (uTrailBoost - 1.0) * 0.14);
		}
		reveal = max(reveal, max(frontBand, afterglow) * intensity);
	}
	return reveal;
}

float fogAmount(vec3 worldPos) {
	float distToCamera = distance(cameraPosition, worldPos);
	return smoothstep(uFogNear, uFogFar, distToCamera);
}

// Quantize to uDepthLevels flat bands, but smooth each contour boundary across
// ~1px using screen-space derivatives so the band edges don't stair-step. Bands
// stay flat where depth changes slowly; at steep depth jumps the edge softens.
float bandedDepth(float v) {
	float levels = max(uDepthLevels, 2.0);
	float s = v * (levels - 1.0) + 0.5;
	float w = max(fwidth(s), 1e-4);
	return (floor(s) + smoothstep(1.0 - w, 1.0, fract(s))) / (levels - 1.0);
}

void main() {
	// Spherical view cutoff: discard everything past the bubble radius (uViewRadius) — this
	// shader is shared by terrain, decorations and moths, so one test culls them all.
	// The depth fade just inside this edge dissolves fragments to the background first,
	// so the hard cut lands on already-invisible pixels (no pop) and the real sky shows
	// through (no ghost). Radius 0 (luft) culls everything → an empty room; growing it
	// during a transition inflates the world into view. No-op in wide modes where
	// uViewRadius sits beyond all geometry.
	if (distance(cameraPosition, vWorldPos) > uViewRadius) discard;
	float reveal = pulseReveal(vWorldPos);
	float edge = edgeMask(vBarycentric, uWireThickness * (0.92 + reveal * 0.22));
	vec3 viewDir = normalize(cameraPosition - vWorldPos);
	vec3 moonDir = normalize(uMoonDirection);
	vec3 normalDir = normalize(vWorldNormal);
	float silhouette = pow(1.0 - clamp(abs(dot(normalDir, viewDir)), 0.0, 1.0), 2.15);
	float moonDiffuse = max(dot(normalDir, moonDir), 0.0);
	float moonWrap = clamp(dot(normalDir, moonDir) * 0.56 + 0.58, 0.0, 1.0);
	float moonScatter = pow(moonWrap, 0.58);
	float upLight = clamp(normalDir.y * 0.5 + 0.5, 0.0, 1.0);
	float moonSpec = pow(max(dot(reflect(-moonDir, normalDir), viewDir), 0.0), 8.0);
	float baseReveal = uBaseVisibility * uBaseVisibilityBoost * (0.76 + upLight * 0.38 + silhouette * 0.24 + moonScatter * 2.85 + moonDiffuse * 1.08);
	float bodyReveal = reveal * uRevealIntensity * uFillStrength * (0.12 + silhouette * 0.24);
	float lineReveal = reveal * max(edge * uEdgeStrength, silhouette * uSilhouetteStrength * 0.85);
	float shimmer = 0.96 + 0.04 * sin(uTime * 1.45 + dot(vWorldPos.xz, vec2(0.045, 0.039)));
	// Blend vertex color and tint toward their daylight counterparts.
	vec3 blendedVertex = mix(vEchoColor, vDayColor, uDaylightFactor);
	vec3 blendedTint   = mix(uTintColor, uDaylightTintColor, uDaylightFactor);
	vec3 echoColor = blendedVertex * blendedTint;
	vec3 moonSurfaceColor = mix(uMoonColor, echoColor, 0.1 + moonDiffuse * 0.1);

	// ── Echo / night mode ──
	vec3 echoModeColor = moonSurfaceColor * baseReveal * (1.0 + moonScatter * 0.58);
	echoModeColor += uMoonColor * moonSpec * uBaseVisibility * uBaseVisibilityBoost * 1.34;
	echoModeColor += echoColor * bodyReveal * shimmer;
	echoModeColor += echoColor * lineReveal * 1.18 * shimmer;

	// ── Daylight mode: biome vertex colors with Lambert + ambient ──
	// uMoonDirection reused as sun direction; uMoonColor as sun tint.
	float sunDiffuse = max(dot(normalDir, moonDir), 0.0);
	float sunAmbient = 0.38;
	vec3 daylightColor = echoColor * (sunAmbient + sunDiffuse * 0.72);
	daylightColor += uMoonColor * moonSpec * 0.10; // subtle specular

	// Blend echo → daylight
	vec3 color = mix(echoModeColor, daylightColor, uDaylightFactor);

	// ── Echoortung: weisse Skulpturformen aus weissem Nebel ──
	float grazingLight = max(dot(normalDir, moonDir), 0.0);
	float paperLight = clamp(grazingLight * 1.02 + upLight * 0.34, 0.0, 1.0);
	float softShadow = 1.0 - smoothstep(0.2, 0.82, paperLight);
	float formVolume = smoothstep(0.66, 0.94, silhouette);
	float thinFormEdge = smoothstep(0.9, 0.99, silhouette);
	vec3 paperWhite = vec3(0.985, 0.985, 0.965);
	vec3 structureShadow = mix(vec3(0.86, 0.86, 0.82), vec3(0.62, 0.62, 0.58), uNoirGroundWeight);
	vec3 structureColor = mix(paperWhite, structureShadow, softShadow * 0.62 + formVolume * 0.2);
	color = mix(color, structureColor, uEdgeFactor);

	// ── Infrarot: gestapelte Material- und Aktivitätskontraste ──
	float luma = dot(vDayColor, vec3(0.299, 0.587, 0.114));
	float organic = 1.0 - smoothstep(0.32, 0.62, uInfraredTone);
	float stone = smoothstep(0.64, 0.9, uInfraredTone);
	float activityPulse = 0.5 + 0.5 * sin(uTime * 1.65 + dot(vWorldPos.xz, vec2(0.09, 0.07)));
	float materialTone = clamp(uInfraredTone - organic * activityPulse * 0.1 + luma * 0.04, 0.04, 0.96);
	float infraredInk = clamp(softShadow * 0.46 + thinFormEdge * 0.14, 0.0, 0.52);
	vec3 infraredColor = mix(vec3(materialTone), vec3(max(materialTone - 0.18, 0.02)), infraredInk);
	infraredColor = mix(infraredColor, vec3(0.94), uNoirGroundWeight * 0.18);
	color = mix(color, infraredColor, uNoirFactor);

	// ── Weissraum: Welt verschwindet vollständig in Weiß ──
	vec3 whiteoutColor = vec3(1.0);
	color = mix(color, whiteoutColor, uWhiteoutFactor);

	// Fog: in echo mode echo reveals suppress fog; in daylight fog is natural.
	float fog = fogAmount(vWorldPos);
	float echoSuppression = clamp(baseReveal * 9.4 + moonScatter * 0.24 + moonDiffuse * 0.24, 0.0, 0.58);
	fog *= mix(1.0 - echoSuppression, 1.0, uDaylightFactor);
	color = mix(color, uFogColor, fog);

	// In-shader depth visualization — VR fallback (post-process can't composite to XR framebuffer)
	if (uDepthVisFactor > 0.001) {
		float depthDist = distance(cameraPosition, vWorldPos);
		// Normalize bands over uDepthRadius (the layer scale), kept separate from uFogFar
		// (fog/cutoff) so the papercut layers stay dense even when the view radius is wide.
		float depthNorm = clamp(depthDist / max(uDepthRadius, 1.0), 0.0, 1.0);
		depthNorm = pow(depthNorm, DEPTH_CONTRAST);
		float depthVal = mix(1.0 - depthNorm, depthNorm, uDepthInvertFactor);
		// Lift the dark (near) end off pure black when inverted, so close geometry
		// reads as dark grey rather than a void. No-op when uDepthFloor is 0.
		depthVal = mix(depthVal, mix(uDepthFloor, 1.0, depthVal), uDepthInvertFactor);
		// Quantize into flat papercut bands with edge-antialiased contour boundaries.
		depthVal = bandedDepth(depthVal);
		// Dissolve the papercut into the background as it nears the sphere edge, so
		// terrain beyond the bubble (and chunks streaming in past it) blends into the
		// sky and disappears instead of standing out as a flat distant plate.
		vec3 depthRGB = mix(vec3(depthVal), uFogColor, smoothstep(uViewRadius * DEPTH_EDGE_FADE, uViewRadius, depthDist));
		color = mix(color, depthRGB, uDepthVisFactor);
	}

	gl_FragColor = vec4(color, 1.0);
}
`;

const TERRAIN_VERTEX = /* glsl */ `
precision highp float;

attribute vec3 barycentric;
attribute vec3 color;
attribute vec3 dayColor;

varying vec3 vWorldPos;
varying vec3 vWorldNormal;
varying vec3 vBarycentric;
varying vec3 vEchoColor;
varying vec3 vDayColor;

void main() {
	vec4 worldPosition = modelMatrix * vec4(position, 1.0);
	vWorldPos = worldPosition.xyz;
	vWorldNormal = normalize(mat3(modelMatrix) * normal);
	vBarycentric = barycentric;
	vEchoColor = color;
	vDayColor = dayColor;
	gl_Position = projectionMatrix * viewMatrix * worldPosition;
}
`;

const INSTANCED_VERTEX = /* glsl */ `
precision highp float;

attribute vec3 barycentric;

varying vec3 vWorldPos;
varying vec3 vWorldNormal;
varying vec3 vBarycentric;
varying vec3 vEchoColor;
varying vec3 vDayColor;

void main() {
	mat4 worldMatrix = modelMatrix * instanceMatrix;
	vec4 worldPosition = worldMatrix * vec4(position, 1.0);
	vWorldPos = worldPosition.xyz;
	vWorldNormal = normalize(mat3(worldMatrix) * normal);
	vBarycentric = barycentric;
	vEchoColor = instanceColor;
	vDayColor = instanceColor; // daylight appearance driven by uDaylightTintColor
	gl_Position = projectionMatrix * viewMatrix * worldPosition;
}
`;

export function createSharedEchoUniforms(): SharedEchoUniforms {
  return {
    uTime: { value: 0 },
    uPulseCount: { value: 0 },
    uPulseOrigins: {
      value: Array.from({ length: BAT_MAX_PULSES }, () => new THREE.Vector3()),
    },
    uPulseParams: {
      value: Array.from({ length: BAT_MAX_PULSES }, () => new THREE.Vector4()),
    },
    uFogColor: { value: new THREE.Color(BAT_SCENE.fogColor) },
    uFogNear: { value: 24 },
    uFogFar: { value: 240 },
    uViewRadius: { value: 240 },
    uBaseVisibility: { value: 0.0195 },
    uRevealIntensity: { value: 1.15 },
    uWireThickness: { value: 1.45 },
    uMoonDirection: {
      value: new THREE.Vector3(-0.44, 0.74, -0.5).normalize(),
    },
    uMoonColor: { value: new THREE.Color(BAT_MOON.glowColor) },
    uDaylightFactor: { value: 0 },
    uWhiteoutFactor: { value: 0 },
    uEdgeFactor: { value: 0 },
    uNoirFactor: { value: 0 },
    uInfraredTone: { value: 0.76 },
    uDepthVisFactor: { value: 0 },
    uDepthInvertFactor: { value: 0 },
    uDepthFloor: { value: 0 },
    uDepthRadius: { value: 120 },
    uDepthLevels: { value: 12 },
  };
}

export function syncEchoUniforms(
  uniforms: SharedEchoUniforms,
  pulses: EchoPulseRenderState[],
  time: number,
): void {
  uniforms.uTime.value = time;
  uniforms.uPulseCount.value = Math.min(pulses.length, BAT_MAX_PULSES);

  for (let i = 0; i < BAT_MAX_PULSES; i++) {
    const pulse = pulses[i];
    if (!pulse) {
      uniforms.uPulseOrigins.value[i].set(0, -10000, 0);
      uniforms.uPulseParams.value[i].set(0, 1, 1, 0);
      continue;
    }

    uniforms.uPulseOrigins.value[i].copy(pulse.origin);
    uniforms.uPulseParams.value[i].set(
      pulse.radius,
      pulse.thickness,
      pulse.trail,
      pulse.intensity,
    );
  }
}

function createRevealMaterial(
  sharedUniforms: SharedEchoUniforms,
  options: RevealMaterialOptions,
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: options.instanced ? INSTANCED_VERTEX : TERRAIN_VERTEX,
    fragmentShader: COMMON_FRAGMENT,
    uniforms: {
      ...sharedUniforms,
      uTintColor: { value: new THREE.Color(options.tintColor ?? 0xffffff) },
      uDaylightTintColor: { value: new THREE.Color(options.daylightTintColor ?? options.tintColor ?? 0xffffff) },
      uFillStrength: { value: options.fillStrength },
      uEdgeStrength: { value: options.edgeStrength },
      uSilhouetteStrength: { value: options.silhouetteStrength },
      uBaseVisibilityBoost: { value: options.baseVisibilityBoost },
      uTrailBoost: { value: options.trailBoost ?? 1 },
      uPulseBoost: { value: options.pulseBoost ?? 1 },
      uNoirGroundWeight: { value: options.noirGroundWeight ?? 0 },
      uInfraredTone: { value: options.infraredTone ?? 0.76 },
    },
    side: options.doubleSided ? THREE.DoubleSide : THREE.FrontSide,
    depthWrite: true,
    transparent: false,
    fog: false,
    toneMapped: false,
  });
}

export function createTerrainRevealMaterial(
  sharedUniforms: SharedEchoUniforms,
): THREE.ShaderMaterial {
  return createRevealMaterial(sharedUniforms, {
    tintColor: "#b5d4ff",
    daylightTintColor: "#ffffff", // daylight color comes entirely from dayColor vertex attribute
    fillStrength: 0.18,
    edgeStrength: 1.85,
    silhouetteStrength: 0.72,
    baseVisibilityBoost: 1.18,
    noirGroundWeight: 1,
    infraredTone: 0.92,
  });
}

export function createInstancedRevealMaterial(
  sharedUniforms: SharedEchoUniforms,
  options: Omit<RevealMaterialOptions, "instanced">,
): THREE.ShaderMaterial {
  return createRevealMaterial(sharedUniforms, {
    ...options,
    instanced: true,
  });
}
