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
  uBaseVisibility: THREE.IUniform<number>;
  uRevealIntensity: THREE.IUniform<number>;
  uWireThickness: THREE.IUniform<number>;
  uMoonDirection: THREE.IUniform<THREE.Vector3>;
  uMoonColor: THREE.IUniform<THREE.Color>;
}

interface RevealMaterialOptions {
  tintColor?: THREE.ColorRepresentation;
  fillStrength: number;
  edgeStrength: number;
  silhouetteStrength: number;
  baseVisibilityBoost: number;
  trailBoost?: number;
  pulseBoost?: number;
  doubleSided?: boolean;
  instanced?: boolean;
}

const COMMON_FRAGMENT = /* glsl */ `
precision highp float;
#define MAX_ECHO_PULSES ${BAT_MAX_PULSES}

uniform float uTime;
uniform int uPulseCount;
uniform vec3 uPulseOrigins[MAX_ECHO_PULSES];
uniform vec4 uPulseParams[MAX_ECHO_PULSES];
uniform vec3 uFogColor;
uniform float uFogNear;
uniform float uFogFar;
uniform float uBaseVisibility;
uniform float uRevealIntensity;
uniform float uWireThickness;
uniform vec3 uMoonDirection;
uniform vec3 uMoonColor;
uniform vec3 uTintColor;
uniform float uFillStrength;
uniform float uEdgeStrength;
uniform float uSilhouetteStrength;
uniform float uBaseVisibilityBoost;
uniform float uTrailBoost;
uniform float uPulseBoost;

varying vec3 vWorldPos;
varying vec3 vWorldNormal;
varying vec3 vBarycentric;
varying vec3 vEchoColor;

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

void main() {
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
	vec3 echoColor = vEchoColor * uTintColor;
	vec3 moonSurfaceColor = mix(uMoonColor, echoColor, 0.1 + moonDiffuse * 0.1);

	vec3 color = moonSurfaceColor * baseReveal * (1.0 + moonScatter * 0.58);
	color += uMoonColor * moonSpec * uBaseVisibility * uBaseVisibilityBoost * 1.34;
	color += echoColor * bodyReveal * shimmer;
	color += echoColor * lineReveal * 1.18 * shimmer;

	float fog = fogAmount(vWorldPos);
	fog *= 1.0 - clamp(baseReveal * 9.4 + moonScatter * 0.24 + moonDiffuse * 0.24, 0.0, 0.58);
	color = mix(color, uFogColor, fog);
	gl_FragColor = vec4(color, 1.0);
}
`;

const TERRAIN_VERTEX = /* glsl */ `
precision highp float;

attribute vec3 barycentric;
attribute vec3 color;

varying vec3 vWorldPos;
varying vec3 vWorldNormal;
varying vec3 vBarycentric;
varying vec3 vEchoColor;

void main() {
	vec4 worldPosition = modelMatrix * vec4(position, 1.0);
	vWorldPos = worldPosition.xyz;
	vWorldNormal = normalize(mat3(modelMatrix) * normal);
	vBarycentric = barycentric;
	vEchoColor = color;
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

void main() {
	mat4 worldMatrix = modelMatrix * instanceMatrix;
	vec4 worldPosition = worldMatrix * vec4(position, 1.0);
	vWorldPos = worldPosition.xyz;
	vWorldNormal = normalize(mat3(worldMatrix) * normal);
	vBarycentric = barycentric;
	vEchoColor = instanceColor;
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
    uBaseVisibility: { value: 0.0195 },
    uRevealIntensity: { value: 1.15 },
    uWireThickness: { value: 1.45 },
    uMoonDirection: {
      value: new THREE.Vector3(-0.44, 0.74, -0.5).normalize(),
    },
    uMoonColor: { value: new THREE.Color(BAT_MOON.glowColor) },
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
      uFillStrength: { value: options.fillStrength },
      uEdgeStrength: { value: options.edgeStrength },
      uSilhouetteStrength: { value: options.silhouetteStrength },
      uBaseVisibilityBoost: { value: options.baseVisibilityBoost },
      uTrailBoost: { value: options.trailBoost ?? 1 },
      uPulseBoost: { value: options.pulseBoost ?? 1 },
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
    fillStrength: 0.18,
    edgeStrength: 1.85,
    silhouetteStrength: 0.72,
    baseVisibilityBoost: 1.18,
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
