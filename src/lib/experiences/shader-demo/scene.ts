// ============================================================================
// scene.ts — Infinite Psychedelic Shader Landscape with ICAROS Flight
//
// 5 shader layers creating an alien lava-lamp landscape:
//
//   Layer 0: FlightPlayer  — ICAROS-driven flight physics (shared lib)
//   Layer 1: Terrain        — PlaneGeometry + world-space FBM + cosine palette
//   Layer 2: Water          — PlaneGeometry + world-space Gerstner + caustics
//   Layer 3: Bubbles        — InstancedMesh lava-lamp blobs rising from terrain
//   Layer 4: Particles      — Points with pulsing glow (follow player)
//   Layer 5: Sky            — IcosahedronGeometry dome with vertex colors
//
// HOW INFINITE TERRAIN WORKS:
//   Terrain + water meshes follow the player each frame. Both vertex shaders
//   sample noise from WORLD-SPACE coordinates (via modelMatrix), so the noise
//   pattern stays spatially stable even as the mesh moves.
//
// Quest 3 budget:
//   Terrain:  128×128 = ~32k tris | Water: 64×64 = ~8k tris
//   Bubbles:  25 × ~80 = ~2k tris | Particles: 600 points
//   Sky:      ~320 tris | Total: ~43k — within 72fps stereo budget
// ============================================================================

import * as THREE from "three";
import {
	createShaderMaterial,
	registerSnippet,
	updateTime,
} from "$lib/shaders";
import colorGlsl from "$lib/shaders/common/color.glsl?raw";
import mathGlsl from "$lib/shaders/common/math.glsl?raw";
import noiseGlsl from "$lib/shaders/common/noise.glsl?raw";
import { FlightPlayer } from "$lib/three/player";
import { createSky } from "$lib/three/sky";
import type { ExperienceState, SetupContext, TickContext } from "../types";

// ── State ──────────────────────────────────────────────────────────────────

export interface ShaderDemoState extends ExperienceState {
	player: FlightPlayer;
	terrain: { mesh: THREE.Mesh; material: THREE.ShaderMaterial };
	water: { mesh: THREE.Mesh; material: THREE.ShaderMaterial };
	bubbles: {
		mesh: THREE.InstancedMesh;
		material: THREE.ShaderMaterial;
		positions: Float32Array; // x, y, z per bubble (flat array)
		phases: Float32Array;
		speeds: Float32Array;
		scales: Float32Array;
	};
	sky: THREE.Mesh;
	particles: { points: THREE.Points; material: THREE.ShaderMaterial };
	camera: THREE.PerspectiveCamera;
}

// ── Constants ────────────────────────────────────────────────────────────

const BUBBLE_COUNT = 25;
const BUBBLE_SPAWN_RADIUS = 80; // XZ distance from player
const BUBBLE_MIN_Y = 5; // spawn near terrain surface
const BUBBLE_MAX_Y = 70; // dissolve at this height
const BUBBLE_MIN_SCALE = 1.5;
const BUBBLE_MAX_SCALE = 4.0;

// ── GLSL Snippet Registration ────────────────────────────────────────────

function registerSnippets(): void {
	registerSnippet("math", mathGlsl);
	registerSnippet("noise", noiseGlsl);
	registerSnippet("color", colorGlsl);
}

// ── Terrain Vertex Shader (World-Space) ──────────────────────────────────

const TERRAIN_VERT = /* glsl */ `
precision highp float;

uniform float uTerrainScale;
uniform float uTerrainHeight;
uniform float uTime;

#pragma include <math>
#pragma include <noise>

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;

float terrainFbm(vec3 p) {
  float value = 0.0;
  float amplitude = 0.5;
  float frequency = 1.0;
  for (int i = 0; i < 3; i++) {
    value += amplitude * snoise(p * frequency);
    frequency *= 2.0;
    amplitude *= 0.5;
  }
  return value;
}

void main() {
  vUv = uv;

  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vec3 noisePos = vec3(worldPos.x * uTerrainScale, uTime * 0.08, worldPos.z * uTerrainScale);
  float height = terrainFbm(noisePos) * uTerrainHeight;

  vec3 displaced = vec3(position.x, position.y + height, position.z);

  float eps = 0.5;
  float hL = terrainFbm(noisePos + vec3(-eps * uTerrainScale, 0.0, 0.0)) * uTerrainHeight;
  float hR = terrainFbm(noisePos + vec3(eps * uTerrainScale, 0.0, 0.0)) * uTerrainHeight;
  float hD = terrainFbm(noisePos + vec3(0.0, 0.0, -eps * uTerrainScale)) * uTerrainHeight;
  float hU = terrainFbm(noisePos + vec3(0.0, 0.0, eps * uTerrainScale)) * uTerrainHeight;
  vNormal = normalize(vec3(hL - hR, 2.0 * eps, hD - hU));

  vPosition = (modelMatrix * vec4(displaced, 1.0)).xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
}
`;

// ── Terrain Fragment Shader ──────────────────────────────────────────────

const TERRAIN_FRAG = /* glsl */ `
precision highp float;

uniform float uTime;
uniform float uTerrainHeight;
uniform float uColorSpeed;
uniform float uBrightness;
uniform vec3 uFogColor;
uniform float uFogNear;
uniform float uFogFar;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;

#pragma include <math>
#pragma include <noise>
#pragma include <color>

void main() {
  float h = clamp(vPosition.y / uTerrainHeight + 0.5, 0.0, 1.0);

  // Double domain warp — terrain breathes and flows
  float warp1 = snoise(vPosition * 0.015 + uTime * 0.06) * 0.4;
  float warp2 = snoise(vPosition * 0.04 + vec3(warp1) + uTime * 0.03) * 0.25;
  h += warp1 + warp2;

  // Intense neon cosine palette
  float t = h * 3.0 + uTime * uColorSpeed;
  vec3 col = cosinePalette(t,
    vec3(0.5, 0.5, 0.5),
    vec3(0.6, 0.6, 0.6),
    vec3(1.0, 0.7, 0.4),
    vec3(0.0, 0.15, 0.20)
  );

  // Rim glow on ridges
  float rim = 1.0 - abs(dot(normalize(vNormal), vec3(0.0, 1.0, 0.0)));
  rim = pow(rim, 1.5);
  col += rim * 0.7 * vec3(1.0, 0.2, 0.8);

  // Emissive contour lines
  float edge = abs(fract(h * 8.0 + uTime * 0.1) - 0.5) * 2.0;
  edge = smoothstep(0.85, 1.0, edge);
  col += edge * vec3(0.3, 0.8, 1.0) * 0.5;

  col *= uBrightness;

  float dist = distance(vPosition, cameraPosition);
  float fog = smoothstep(uFogNear, uFogFar, dist);
  col = mix(col, uFogColor, fog);

  gl_FragColor = vec4(col, 1.0);
}
`;

// ── Water Vertex Shader (World-Space) ────────────────────────────────────

const WATER_VERT = /* glsl */ `
precision highp float;

uniform float uWaveAmplitude;
uniform float uWaveFreq;
uniform float uWaveSpeed;
uniform float uTime;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;

vec3 gerstnerWave(vec2 dir, float steepness, float amplitude, float freq, float speed, vec3 pos) {
  float phase = dot(dir, pos.xz) * freq + uTime * speed;
  float s = sin(phase);
  float c = cos(phase);
  return vec3(steepness * amplitude * dir.x * c, amplitude * s, steepness * amplitude * dir.y * c);
}

void main() {
  vUv = uv;

  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vec3 wPos = worldPos.xyz;

  vec3 wave = vec3(0.0);
  wave += gerstnerWave(vec2(1.0, 0.0), 0.5, uWaveAmplitude, uWaveFreq, uWaveSpeed, wPos);
  wave += gerstnerWave(vec2(0.7, 0.7), 0.3, uWaveAmplitude * 0.6, uWaveFreq * 1.3, uWaveSpeed * 1.1, wPos);
  wave += gerstnerWave(vec2(-0.3, 0.9), 0.2, uWaveAmplitude * 0.3, uWaveFreq * 2.1, uWaveSpeed * 0.9, wPos);

  vec3 displaced = position + wave;

  vec3 tangent = normalize(vec3(1.0, wave.y * 0.5, 0.0));
  vec3 bitangent = normalize(vec3(0.0, wave.y * 0.5, 1.0));
  vNormal = normalize(cross(bitangent, tangent));

  vPosition = (modelMatrix * vec4(displaced, 1.0)).xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
}
`;

// ── Water Fragment Shader ────────────────────────────────────────────────

const WATER_FRAG = /* glsl */ `
precision highp float;

uniform float uTime;
uniform float uBrightness;
uniform vec3 uFogColor;
uniform float uFogNear;
uniform float uFogFar;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;

#pragma include <math>
#pragma include <noise>
#pragma include <color>

void main() {
  float fresnel = pow(1.0 - abs(dot(normalize(vNormal), vec3(0.0, 1.0, 0.0))), 2.5);

  float c1 = snoise(vec3(vPosition.xz * 0.08 + uTime * 0.25, 0.0));
  float c2 = snoise(vec3(vPosition.xz * 0.12 - uTime * 0.18, 1.0));
  float caustic = abs(c1 + c2) * 0.6;

  float colorShift = sin(uTime * 0.15) * 0.5 + 0.5;
  vec3 shallow = mix(vec3(0.0, 1.0, 0.8), vec3(0.8, 0.2, 1.0), colorShift);
  vec3 deep = vec3(0.05, 0.0, 0.3);
  vec3 col = mix(deep, shallow, caustic);

  col += fresnel * mix(vec3(0.6, 0.1, 1.0), vec3(0.0, 0.8, 1.0), colorShift);

  float sparkle = smoothstep(0.7, 0.9, caustic);
  col += sparkle * vec3(1.0, 0.9, 0.8) * 0.6;

  col *= uBrightness;

  float dist = distance(vPosition, cameraPosition);
  float fog = smoothstep(uFogNear, uFogFar, dist);
  col = mix(col, uFogColor, fog);

  float alpha = 0.5 + fresnel * 0.4 + sparkle * 0.1;
  gl_FragColor = vec4(col, alpha);
}
`;

// ── Bubble Vertex Shader ─────────────────────────────────────────────────
// Lava-lamp blobs: InstancedMesh with organic wobble deformation.
// instanceMatrix is auto-injected by Three.js for InstancedMesh.

const BUBBLE_VERT = /* glsl */ `
precision highp float;

uniform float uTime;

varying vec3 vNormal;
varying vec3 vWorldPos;
varying float vRim;

void main() {
  // Organic surface wobble — blob-like deformation
  vec3 pos = position;
  float wobble = sin(uTime * 2.5 + position.y * 5.0 + position.x * 3.0) * 0.15;
  float wobble2 = cos(uTime * 1.8 + position.z * 4.0) * 0.1;
  pos *= 1.0 + wobble + wobble2;

  // Apply instance transform (position + scale set per-bubble in tick)
  vec4 worldPos = modelMatrix * instanceMatrix * vec4(pos, 1.0);
  vWorldPos = worldPos.xyz;

  // Normal in world space (ignoring wobble for simplicity — close enough)
  vNormal = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * normal);

  // Rim factor for fragment shader
  vec3 viewDir = normalize(cameraPosition - worldPos.xyz);
  vRim = 1.0 - abs(dot(vNormal, viewDir));

  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
`;

// ── Bubble Fragment Shader ───────────────────────────────────────────────
// Subsurface scattering glow — warm lava-lamp colors, translucent.

const BUBBLE_FRAG = /* glsl */ `
precision highp float;

uniform float uTime;

varying vec3 vNormal;
varying vec3 vWorldPos;
varying float vRim;

void main() {
  float subsurface = pow(vRim, 2.0);

  // Lava lamp colors — warm orange/magenta shifting with height + time
  float t = vWorldPos.y * 0.04 + uTime * 0.4;
  vec3 warmCol = mix(vec3(1.0, 0.3, 0.05), vec3(1.0, 0.05, 0.6), sin(t) * 0.5 + 0.5);
  vec3 hotCenter = vec3(1.0, 0.95, 0.4);

  vec3 col = mix(hotCenter, warmCol, subsurface);
  col += subsurface * vec3(1.0, 0.4, 0.2) * 0.8;

  // Translucent with bright rim
  float alpha = 0.3 + subsurface * 0.5;

  gl_FragColor = vec4(col, alpha);
}
`;

// ── Particle Vertex Shader ───────────────────────────────────────────────

const PARTICLE_VERT = /* glsl */ `
precision highp float;

uniform float uTime;
attribute float aPhase;
varying float vPulse;
varying float vPhase;

void main() {
  float pulse = 0.5 + 0.5 * sin(uTime * 2.5 + aPhase);
  vPulse = pulse;
  vPhase = aPhase;

  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = min(pulse * 600.0 / -mvPosition.z, 80.0);
  gl_Position = projectionMatrix * mvPosition;
}
`;

// ── Particle Fragment Shader ─────────────────────────────────────────────

const PARTICLE_FRAG = /* glsl */ `
precision highp float;

uniform float uTime;
varying float vPulse;
varying float vPhase;

#pragma include <color>

void main() {
  float d = length(gl_PointCoord - 0.5) * 2.0;
  float glow = exp(-d * d * 3.0);
  if (glow < 0.01) discard;

  float hue = fract(vPhase / 6.28 + uTime * 0.1);
  vec3 baseCol = hsv2rgb(vec3(hue, 0.6, 1.0));
  vec3 col = mix(baseCol, vec3(1.0), glow * glow * 0.7) * glow * (0.5 + vPulse * 0.5);

  gl_FragColor = vec4(col, glow * 0.9);
}
`;

// ── Uniform Defaults ─────────────────────────────────────────────────────

const FOG_COLOR = new THREE.Color(0x330066);

const TERRAIN_UNIFORMS = {
	uTerrainScale: { value: 0.005 },
	uTerrainHeight: { value: 50.0 },
	uColorSpeed: { value: 0.12 },
	uBrightness: { value: 1.2 },
	uFogColor: { value: FOG_COLOR.clone() },
	uFogNear: { value: 40.0 },
	uFogFar: { value: 200.0 },
};

const WATER_UNIFORMS = {
	uWaveAmplitude: { value: 1.5 },
	uWaveFreq: { value: 0.8 },
	uWaveSpeed: { value: 0.6 },
	uBrightness: { value: 1.2 },
	uFogColor: { value: FOG_COLOR.clone() },
	uFogNear: { value: 40.0 },
	uFogFar: { value: 200.0 },
};

// ── Reusable matrix/vector for tick ──────────────────────────────────────

const _matrix = new THREE.Matrix4();
const _pos = new THREE.Vector3();
const _scale = new THREE.Vector3();
const _quat = new THREE.Quaternion();

// ── Helper: Initialize bubble data ───────────────────────────────────────

function initBubbleData(): {
	positions: Float32Array;
	phases: Float32Array;
	speeds: Float32Array;
	scales: Float32Array;
} {
	const positions = new Float32Array(BUBBLE_COUNT * 3);
	const phases = new Float32Array(BUBBLE_COUNT);
	const speeds = new Float32Array(BUBBLE_COUNT);
	const scales = new Float32Array(BUBBLE_COUNT);

	for (let i = 0; i < BUBBLE_COUNT; i++) {
		// Spread bubbles randomly — they'll be repositioned relative to player in tick
		positions[i * 3] = (Math.random() - 0.5) * BUBBLE_SPAWN_RADIUS * 2;
		positions[i * 3 + 1] =
			BUBBLE_MIN_Y + Math.random() * (BUBBLE_MAX_Y - BUBBLE_MIN_Y);
		positions[i * 3 + 2] = (Math.random() - 0.5) * BUBBLE_SPAWN_RADIUS * 2;
		phases[i] = Math.random() * Math.PI * 2;
		speeds[i] = 1.0 + Math.random() * 2.0; // 1-3 m/s rise speed
		scales[i] =
			BUBBLE_MIN_SCALE + Math.random() * (BUBBLE_MAX_SCALE - BUBBLE_MIN_SCALE);
	}

	return { positions, phases, speeds, scales };
}

// ── Helper: Respawn a single bubble near the player ──────────────────────

function respawnBubble(
	i: number,
	positions: Float32Array,
	speeds: Float32Array,
	scales: Float32Array,
	playerX: number,
	playerZ: number,
): void {
	const angle = Math.random() * Math.PI * 2;
	const radius = 10 + Math.random() * BUBBLE_SPAWN_RADIUS;
	positions[i * 3] = playerX + Math.cos(angle) * radius;
	positions[i * 3 + 1] = BUBBLE_MIN_Y + Math.random() * 10;
	positions[i * 3 + 2] = playerZ + Math.sin(angle) * radius;
	speeds[i] = 1.0 + Math.random() * 2.0;
	scales[i] =
		BUBBLE_MIN_SCALE + Math.random() * (BUBBLE_MAX_SCALE - BUBBLE_MIN_SCALE);
}

// ── Helper: Create particle field ────────────────────────────────────────

function createParticles(count: number): {
	points: THREE.Points;
	material: THREE.ShaderMaterial;
} {
	const positions = new Float32Array(count * 3);
	const phases = new Float32Array(count);

	for (let i = 0; i < count; i++) {
		positions[i * 3] = (Math.random() - 0.5) * 200;
		positions[i * 3 + 1] = Math.random() * 50 + 15;
		positions[i * 3 + 2] = (Math.random() - 0.5) * 200;
		phases[i] = Math.random() * Math.PI * 2;
	}

	const geometry = new THREE.BufferGeometry();
	geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
	geometry.setAttribute("aPhase", new THREE.BufferAttribute(phases, 1));

	const material = createShaderMaterial({
		vertexShader: PARTICLE_VERT,
		fragmentShader: PARTICLE_FRAG,
		transparent: true,
		depthWrite: false,
	});

	return { points: new THREE.Points(geometry, material), material };
}

// ── Setup ────────────────────────────────────────────────────────────────

export async function setup(ctx: SetupContext): Promise<ShaderDemoState> {
	registerSnippets();

	const player = new FlightPlayer({
		fov: 75,
		near: 0.1,
		far: 1000,
		spawnPosition: { x: 0, y: 50, z: 0 },
		baseSpeed: 15,
	});
	ctx.scene.add(player.rig);

	// ── Terrain (infinite) ──
	const terrainGeo = new THREE.PlaneGeometry(512, 512, 128, 128);
	terrainGeo.rotateX(-Math.PI / 2);

	const terrainMat = createShaderMaterial({
		vertexShader: TERRAIN_VERT,
		fragmentShader: TERRAIN_FRAG,
		uniforms: TERRAIN_UNIFORMS,
	});

	const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
	ctx.scene.add(terrainMesh);

	// ── Water (infinite) ──
	const waterGeo = new THREE.PlaneGeometry(512, 512, 64, 64);
	waterGeo.rotateX(-Math.PI / 2);

	const waterMat = createShaderMaterial({
		vertexShader: WATER_VERT,
		fragmentShader: WATER_FRAG,
		uniforms: WATER_UNIFORMS,
		transparent: true,
		side: THREE.DoubleSide,
	});

	const waterMesh = new THREE.Mesh(waterGeo, waterMat);
	waterMesh.position.y = 8;
	ctx.scene.add(waterMesh);

	// ── Lava Lamp Bubbles ──
	// InstancedMesh: 25 icosahedron blobs with subsurface glow shader.
	// Each bubble rises from the terrain, wobbles, and respawns when too high.
	const bubbleGeo = new THREE.IcosahedronGeometry(1, 2);
	const bubbleMat = createShaderMaterial({
		vertexShader: BUBBLE_VERT,
		fragmentShader: BUBBLE_FRAG,
		transparent: true,
		depthWrite: false,
		side: THREE.DoubleSide,
	});

	const bubbleMesh = new THREE.InstancedMesh(bubbleGeo, bubbleMat, BUBBLE_COUNT);
	bubbleMesh.frustumCulled = false; // instances move dynamically
	ctx.scene.add(bubbleMesh);

	const bubbleData = initBubbleData();

	// Set initial matrices
	for (let i = 0; i < BUBBLE_COUNT; i++) {
		_pos.set(
			bubbleData.positions[i * 3],
			bubbleData.positions[i * 3 + 1],
			bubbleData.positions[i * 3 + 2],
		);
		_scale.setScalar(bubbleData.scales[i]);
		_matrix.compose(_pos, _quat, _scale);
		bubbleMesh.setMatrixAt(i, _matrix);
	}
	bubbleMesh.instanceMatrix.needsUpdate = true;

	// ── Sky ──
	const sky = createSky({
		radius: 800,
		detail: 3,
		colorTop: 0x3311aa,
		colorHorizon: 0xbb44ee,
		colorBottom: 0x221155,
	});
	ctx.scene.add(sky);

	// ── Particles ──
	const particles = createParticles(600);
	ctx.scene.add(particles.points);

	return {
		player,
		terrain: { mesh: terrainMesh, material: terrainMat },
		water: { mesh: waterMesh, material: waterMat },
		bubbles: { mesh: bubbleMesh, material: bubbleMat, ...bubbleData },
		sky,
		particles,
		camera: player.camera,
	};
}

// ── Tick ──────────────────────────────────────────────────────────────────

export function tick(
	state: ExperienceState,
	ctx: TickContext,
): { state: ExperienceState; outputs?: Record<string, number> } {
	const s = state as ShaderDemoState;

	s.player.tick(ctx.delta);

	const px = s.player.rig.position.x;
	const pz = s.player.rig.position.z;

	// ── Infinite terrain/water: follow player ──
	s.terrain.mesh.position.x = px;
	s.terrain.mesh.position.z = pz;
	s.water.mesh.position.x = px;
	s.water.mesh.position.z = pz;

	// Particles + sky follow player
	s.particles.points.position.x = px;
	s.particles.points.position.z = pz;
	s.sky.position.x = px;
	s.sky.position.z = pz;

	// ── Animate bubbles: rise, wobble, respawn ──
	const { positions, phases, speeds, scales } = s.bubbles;
	for (let i = 0; i < BUBBLE_COUNT; i++) {
		// Rise
		positions[i * 3 + 1] += speeds[i] * ctx.delta;

		// Wobble sideways (unique phase per bubble)
		const wobbleX = Math.sin(ctx.elapsed * 1.5 + phases[i]) * 0.3;
		const wobbleZ = Math.cos(ctx.elapsed * 1.2 + phases[i] * 1.3) * 0.3;
		positions[i * 3] += wobbleX * ctx.delta;
		positions[i * 3 + 2] += wobbleZ * ctx.delta;

		// Respawn when too high or too far from player
		const dx = positions[i * 3] - px;
		const dz = positions[i * 3 + 2] - pz;
		const distSq = dx * dx + dz * dz;
		if (
			positions[i * 3 + 1] > BUBBLE_MAX_Y ||
			distSq > BUBBLE_SPAWN_RADIUS * BUBBLE_SPAWN_RADIUS * 4
		) {
			respawnBubble(i, positions, speeds, scales, px, pz);
		}

		// Update instance matrix
		_pos.set(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]);
		_scale.setScalar(scales[i]);
		_matrix.compose(_pos, _quat, _scale);
		s.bubbles.mesh.setMatrixAt(i, _matrix);
	}
	s.bubbles.mesh.instanceMatrix.needsUpdate = true;

	// Animate all shaders
	updateTime(s.terrain.material, ctx.elapsed);
	updateTime(s.water.material, ctx.elapsed);
	updateTime(s.bubbles.material, ctx.elapsed);
	updateTime(s.particles.material, ctx.elapsed);

	return { state: s };
}

// ── Dispose ──────────────────────────────────────────────────────────────

export function dispose(state: ExperienceState, scene: THREE.Scene): void {
	const s = state as ShaderDemoState;

	scene.remove(s.terrain.mesh);
	scene.remove(s.water.mesh);
	scene.remove(s.bubbles.mesh);
	scene.remove(s.sky);
	scene.remove(s.particles.points);
	scene.remove(s.player.rig);

	s.terrain.mesh.geometry.dispose();
	s.terrain.material.dispose();
	s.water.mesh.geometry.dispose();
	s.water.material.dispose();
	s.bubbles.mesh.geometry.dispose();
	s.bubbles.material.dispose();
	s.sky.geometry.dispose();
	(s.sky.material as THREE.Material).dispose();
	s.particles.points.geometry.dispose();
	s.particles.material.dispose();
}
