import * as THREE from "three";
import { createGradientSky, updateGradientSky } from "$lib/three/gradient-sky";
import type { TriggerCommand } from "$lib/types/orientation";
import type { ExperienceState, SetupContext, TickContext } from "../types";
import { EchoAudioManager } from "./audio";
import {
  BAT_AUDIO_DEFAULTS,
  BAT_CAMERA,
  type BatAudioSettings,
  type BatEchoSettings,
  BAT_ECHO_DEFAULTS,
  BAT_MOTH_DEFAULTS,
  BAT_MOON,
  BAT_SCENE,
  BAT_TRIGGER_ID,
  type BatWorldSettings,
  BAT_WORLD_DEFAULTS,
} from "./config";
import { disposeBatMount, loadBatMount } from "./bat-mount";
import { loadFlyGeometry } from "./fly-model";
import { BatFlightController } from "./flight-controller";
import type { EchoPulseRenderState } from "./shaders";
import { BatWorld, type EchoProbeProfile } from "./world";

interface CollectionBurst {
  sprite: THREE.Sprite;
  startTime: number;
  duration: number;
  baseScale: number;
}

interface MothEchoBurst {
  core: THREE.Sprite;
  coreScale: number;
  anchor: THREE.Vector3;
  startTime: number;
  duration: number;
}

interface EchoPulse {
  origin: THREE.Vector3;
  startTime: number;
  speed: number;
  maxRadius: number;
  thickness: number;
  trailLength: number;
  intensity: number;
}

export interface BatEcholocationState extends ExperienceState {
  player: BatFlightController;
  camera: THREE.PerspectiveCamera;
  batMount: THREE.Group | null;
  world: BatWorld;
  audio: EchoAudioManager;
  sky: THREE.Mesh;
  moon: THREE.Group;
  pulses: EchoPulse[];
  audioSettings: BatAudioSettings;
  echoSettings: BatEchoSettings;
  worldSettings: BatWorldSettings;
  lastManualPulseAt: number;
  nextAutoPulseAt: number;
  pendingManualPulse: boolean;
  elapsedTime: number;
  collectedMoths: number;
  activeMoths: number;
  nearestMothDistance: number | null;
  collectionFx: THREE.Group;
  collectionBurstTexture: THREE.CanvasTexture;
  collectionBursts: CollectionBurst[];
  mothEchoFx: THREE.Group;
  mothEchoTexture: THREE.CanvasTexture;
  mothEchoBursts: MothEchoBurst[];
}

function createRenderPulseState(
  pulse: EchoPulse,
  elapsed: number,
): EchoPulseRenderState {
  return {
    origin: pulse.origin,
    radius: Math.max(0, (elapsed - pulse.startTime) * pulse.speed),
    thickness: pulse.thickness,
    trail: pulse.trailLength,
    intensity: pulse.intensity,
  };
}

function createMoonGlowTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("2D canvas context unavailable for moon glow");
  }

  const gradient = ctx.createRadialGradient(
    size * 0.5,
    size * 0.5,
    0,
    size * 0.5,
    size * 0.5,
    size * 0.5,
  );
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.18, "rgba(240,245,255,0.95)");
  gradient.addColorStop(0.42, "rgba(220,230,255,0.28)");
  gradient.addColorStop(1, "rgba(220,230,255,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

function createCollectionBurstTexture(): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("2D canvas context unavailable for collection burst");
  }

  const gradient = ctx.createRadialGradient(
    size * 0.5,
    size * 0.5,
    0,
    size * 0.5,
    size * 0.5,
    size * 0.5,
  );
  gradient.addColorStop(0, "rgba(255,251,214,1)");
  gradient.addColorStop(0.28, "rgba(227,255,242,0.92)");
  gradient.addColorStop(0.68, "rgba(178,255,239,0.22)");
  gradient.addColorStop(1, "rgba(178,255,239,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

function createMothEchoTexture(): THREE.CanvasTexture {
  const size = 96;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("2D canvas context unavailable for moth echo texture");
  }

  const gradient = ctx.createRadialGradient(
    size * 0.5,
    size * 0.5,
    0,
    size * 0.5,
    size * 0.5,
    size * 0.5,
  );
  gradient.addColorStop(0, "rgba(255,252,224,1)");
  gradient.addColorStop(0.22, "rgba(221,255,240,0.92)");
  gradient.addColorStop(0.54, "rgba(160,255,236,0.34)");
  gradient.addColorStop(1, "rgba(160,255,236,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

function createMoon(): THREE.Group {
  const group = new THREE.Group();
  const glowTexture = createMoonGlowTexture();
  const body = new THREE.Mesh(
    new THREE.SphereGeometry(BAT_MOON.radius, 32, 32),
    new THREE.MeshBasicMaterial({
      color: BAT_MOON.color,
      transparent: true,
      opacity: BAT_MOON.opacity,
      toneMapped: false,
      fog: false,
      depthWrite: false,
      depthTest: false,
    }),
  );
  const glow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glowTexture,
      color: BAT_MOON.glowColor,
      transparent: true,
      opacity: BAT_MOON.glowOpacity,
      depthWrite: false,
      depthTest: false,
      fog: false,
      toneMapped: false,
      blending: THREE.AdditiveBlending,
    }),
  );

  glow.scale.set(BAT_MOON.glowRadius, BAT_MOON.glowRadius, 1);
  body.renderOrder = 12;
  glow.renderOrder = 11;
  group.renderOrder = 11;
  group.add(glow, body);
  group.userData.glowTexture = glowTexture;
  return group;
}

function createPulse(
  state: BatEcholocationState,
  elapsed: number,
  strength: number,
  thickness: number,
  range: number,
): EchoPulse {
  const normalizedStrength = THREE.MathUtils.clamp(strength, 0.15, 1.4);
  const trailLength = Math.max(
    3,
    state.echoSettings.speed * state.echoSettings.revealDuration,
  );
  return {
    origin: state.player.rig.position.clone(),
    startTime: elapsed,
    speed: state.echoSettings.speed,
    maxRadius: range + trailLength,
    thickness,
    trailLength,
    intensity: normalizedStrength,
  };
}

function emitPulse(
  state: BatEcholocationState,
  elapsed: number,
  strength: number,
  thickness: number,
  range: number,
): void {
  const pulse = createPulse(state, elapsed, strength, thickness, range);
  const scanDuration = pulse.maxRadius / Math.max(pulse.speed, 1);
  const audioProfile = state.world.sampleEchoProfile(
    pulse.origin,
    state.player.camera.quaternion,
    range,
    state.echoSettings.speed,
  );

  state.pulses.unshift(pulse);
  state.pulses.length = Math.min(state.pulses.length, 4);
  scheduleMothEchoBursts(state, audioProfile, elapsed, pulse.intensity);
  state.audio.emitPulse(audioProfile, range, scanDuration, pulse.intensity);
}

function emitManualPulse(state: BatEcholocationState, elapsed: number): void {
  if (elapsed - state.lastManualPulseAt < state.echoSettings.cooldown) {
    return;
  }

  state.lastManualPulseAt = elapsed;
  emitPulse(
    state,
    elapsed,
    1.18,
    BAT_ECHO_DEFAULTS.manualThickness,
    state.echoSettings.range,
  );
}

function emitAutoPulse(state: BatEcholocationState, elapsed: number): void {
  if (state.echoSettings.autoPulseInterval <= 0) return;

  emitPulse(
    state,
    elapsed,
    state.echoSettings.autoPulseStrength,
    BAT_ECHO_DEFAULTS.manualThickness,
    state.echoSettings.range,
  );
}

function spawnCollectionBurst(
  state: BatEcholocationState,
  position: THREE.Vector3,
  elapsed: number,
): void {
  const material = new THREE.SpriteMaterial({
    map: state.collectionBurstTexture,
    color: "#f3ffd9",
    transparent: true,
    opacity: 0.72,
    depthWrite: false,
    depthTest: true,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
    fog: false,
  });
  const sprite = new THREE.Sprite(material);
  const baseScale = BAT_MOTH_DEFAULTS.collectBurstScale;
  sprite.position.copy(position);
  sprite.scale.set(baseScale, baseScale, 1);
  state.collectionFx.add(sprite);
  state.collectionBursts.push({
    sprite,
    startTime: elapsed,
    duration: BAT_MOTH_DEFAULTS.collectBurstDuration,
    baseScale,
  });
}

function updateCollectionBursts(
  state: BatEcholocationState,
  elapsed: number,
): void {
  state.collectionBursts = state.collectionBursts.filter((burst) => {
    const progress = (elapsed - burst.startTime) / burst.duration;
    if (progress >= 1) {
      state.collectionFx.remove(burst.sprite);
      burst.sprite.material.dispose();
      return false;
    }

    const eased = 1 - THREE.MathUtils.clamp(progress, 0, 1);
    burst.sprite.material.opacity = eased * eased * 0.76;
    burst.sprite.scale.setScalar(burst.baseScale * (1 + progress * 1.6));
    burst.sprite.position.y += 0.018;
    return true;
  });
}

function scheduleMothEchoBursts(
  _state: BatEcholocationState,
  _profile: EchoProbeProfile,
  _elapsed: number,
  _intensity: number,
): void {
  return;
}

function updateMothEchoBursts(
  state: BatEcholocationState,
  _elapsed: number,
): void {
  if (state.mothEchoBursts.length === 0) return;

  for (const burst of state.mothEchoBursts) {
    state.mothEchoFx.remove(burst.core);
    burst.core.material.dispose();
  }
  state.mothEchoBursts = [];
}

export async function setup(ctx: SetupContext): Promise<BatEcholocationState> {
  const player = new BatFlightController();
  let batMount: THREE.Group | null = null;
  let flyGeometry: THREE.BufferGeometry | null = null;
  const moonDirection = new THREE.Vector3(
    BAT_MOON.direction.x,
    BAT_MOON.direction.y,
    BAT_MOON.direction.z,
  ).normalize();
  const worldSettings: BatWorldSettings = {
    ...BAT_WORLD_DEFAULTS,
    revealIntensity: BAT_ECHO_DEFAULTS.revealIntensity,
    wireThickness: BAT_ECHO_DEFAULTS.wireThickness,
  };
  try {
    flyGeometry = await loadFlyGeometry();
  } catch (error) {
    console.error("Failed to load fly geometry", error);
  }

  const world = new BatWorld(worldSettings, { mothGeometry: flyGeometry });
  const audio = new EchoAudioManager({ ...BAT_AUDIO_DEFAULTS });
  world.sharedUniforms.uMoonDirection.value.copy(moonDirection);
  world.sharedUniforms.uMoonColor.value.set(BAT_MOON.glowColor);
  const sky = createGradientSky({
    colors: [0x05070a, 0x020305, 0x000000],
    radius: BAT_CAMERA.far * 1.3,
    animationSpeed: 0.0008,
  });
  const moon = createMoon();
  const collectionFx = new THREE.Group();
  const collectionBurstTexture = createCollectionBurstTexture();
  const mothEchoFx = new THREE.Group();
  const mothEchoTexture = createMothEchoTexture();

  try {
    batMount = await loadBatMount();
    player.camera.add(batMount);
  } catch (error) {
    console.error("Failed to load bat mount", error);
  }

  moon.position
    .copy(player.rig.position)
    .addScaledVector(moonDirection, BAT_MOON.distance);

  ctx.scene.add(world.group);
  ctx.scene.add(player.rig);
  ctx.scene.add(sky);
  ctx.scene.add(moon);
  ctx.scene.add(collectionFx);
  ctx.scene.add(mothEchoFx);

  const state: BatEcholocationState = {
    player,
    camera: player.camera,
    batMount,
    world,
    audio,
    sky,
    moon,
    pulses: [],
    audioSettings: { ...BAT_AUDIO_DEFAULTS },
    echoSettings: { ...BAT_ECHO_DEFAULTS },
    worldSettings,
    lastManualPulseAt: -Infinity,
    nextAutoPulseAt:
      BAT_ECHO_DEFAULTS.autoPulseInterval > 0
        ? BAT_ECHO_DEFAULTS.autoPulseInterval * 0.55
        : Infinity,
    pendingManualPulse: false,
    elapsedTime: 0,
    collectedMoths: 0,
    activeMoths: 0,
    nearestMothDistance: null,
    collectionFx,
    collectionBurstTexture,
    collectionBursts: [],
    mothEchoFx,
    mothEchoTexture,
    mothEchoBursts: [],
  };

  if (ctx.scene.fog instanceof THREE.Fog) {
    ctx.scene.fog.color.set(BAT_SCENE.fogColor);
    ctx.scene.fog.near = BAT_SCENE.fogNear;
    ctx.scene.fog.far = BAT_SCENE.fogFar;
  }

  return state;
}

export function tick(
  state: ExperienceState,
  ctx: TickContext,
): { state: ExperienceState; outputs?: Record<string, number> } {
  const s = state as BatEcholocationState;
  s.elapsedTime = ctx.elapsed;

  s.player.tick(ctx.delta, (x, z) => s.world.sampleHeight(x, z));
  s.sky.position.copy(s.player.rig.position);
  s.moon.position
    .copy(s.player.rig.position)
    .addScaledVector(
      s.world.sharedUniforms.uMoonDirection.value,
      BAT_MOON.distance,
    );

  const worldFrame = s.world.prepare(s.player.rig.position);
  s.activeMoths = worldFrame.activeMoths;
  s.nearestMothDistance = worldFrame.nearestMothDistance;
  if (worldFrame.collectedMoths.length > 0) {
    s.collectedMoths = s.world.getCollectedMothCount();
    for (const position of worldFrame.collectedMoths) {
      spawnCollectionBurst(s, position, ctx.elapsed);
    }
  }

  if (s.pendingManualPulse) {
    emitManualPulse(s, ctx.elapsed);
    s.pendingManualPulse = false;
  }

  if (
    s.echoSettings.autoPulseInterval > 0 &&
    ctx.elapsed >= s.nextAutoPulseAt
  ) {
    emitAutoPulse(s, ctx.elapsed);
    s.nextAutoPulseAt = ctx.elapsed + s.echoSettings.autoPulseInterval;
  }

  s.pulses = s.pulses.filter((pulse) => {
    const radius = (ctx.elapsed - pulse.startTime) * pulse.speed;
    return radius <= pulse.maxRadius;
  });

  const renderPulses = s.pulses.map((pulse) =>
    createRenderPulseState(pulse, ctx.elapsed),
  );

  s.world.renderEcho(renderPulses, ctx.elapsed);
  updateCollectionBursts(s, ctx.elapsed);
  updateMothEchoBursts(s, ctx.elapsed);
  s.audio.update();
  updateGradientSky(s.sky, ctx.elapsed * 0.4);
  return { state: s, outputs: { score: s.collectedMoths } };
}

export function handleTrigger(
  trigger: TriggerCommand,
  state: ExperienceState,
  _scene: THREE.Scene,
): void {
  const s = state as BatEcholocationState;
  if (trigger.id !== BAT_TRIGGER_ID || !trigger.active) return;
  s.pendingManualPulse = true;
}

export function dispose(state: ExperienceState, scene: THREE.Scene): void {
  const s = state as BatEcholocationState;

  s.audio.dispose();
  disposeBatMount(s.batMount);
  s.world.dispose();
  scene.remove(s.world.group);
  scene.remove(s.player.rig);
  scene.remove(s.sky);
  scene.remove(s.moon);
  scene.remove(s.collectionFx);
  scene.remove(s.mothEchoFx);
  s.sky.geometry.dispose();
  (s.sky.material as THREE.Material).dispose();
  s.collectionBurstTexture.dispose();
  s.mothEchoTexture.dispose();
  for (const burst of s.collectionBursts) {
    burst.sprite.material.dispose();
  }
  for (const burst of s.mothEchoBursts) {
    burst.core.material.dispose();
  }
  s.moon.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.geometry.dispose();
      if (child.material instanceof THREE.Material) {
        child.material.dispose();
      }
    }
    if (child instanceof THREE.Sprite) {
      if (child.material instanceof THREE.SpriteMaterial) {
        child.material.map?.dispose();
        child.material.dispose();
      }
    }
  });
}
