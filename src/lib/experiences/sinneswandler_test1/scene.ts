import * as THREE from "three";
import { createGradientSky, updateGradientSky } from "$lib/three/gradient-sky";
import { registerTweak, unregisterTweak } from "$lib/dev-console/registry.svelte";
import type { TriggerCommand } from "$lib/types/orientation";
import type { ExperienceState, SetupContext, TickContext, RenderContext } from "../types";
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
import { SenseSwitchManager } from "./sense-switch";
import { KeyboardInput } from "./keyboard-input";
import { ControllerInput } from "./controller-input";
import { IntroSequence } from "./intro-sequence";
import { ChemosenseLayer } from "./chemosense-layer";
import { createDepthPostprocess, type DepthPostprocess } from "./depth-postprocess";
import { NetworkLayer } from "./network-layer";
import { BeeSwarm } from "./bee-swarm";
import { MODE_SEQUENCE, type VisionModeId } from "./vision-modes";
import { loadWorldModels } from "./world-models";
import { currentBiomeStore } from "./biome-store";

function applyWorldPresetToSettings(
  settings: BatWorldSettings,
  ctx: SetupContext,
): BatWorldSettings {
  const preset = ctx.worldPreset;
  if (!preset) return settings;

  return {
    ...settings,
    biomeScale: THREE.MathUtils.clamp(
      0.00072 + preset.terrain.continentScale * 0.00105,
      0.0007,
      0.0024,
    ),
    mountainHeight: THREE.MathUtils.clamp(
      preset.terrain.heightScale * (0.72 + preset.terrain.ridgeStrength * 0.72),
      24,
      120,
    ),
    treeDensity: THREE.MathUtils.clamp(
      preset.vegetation.density * preset.vegetation.treeRatio * 54,
      0,
      44,
    ),
    grassDensity: THREE.MathUtils.clamp(
      preset.vegetation.density * (0.45 + preset.biomes.wetlandWeight * 0.55) * 76,
      0,
      80,
    ),
    fogIntensity: THREE.MathUtils.clamp(
      0.28 + preset.climate.moistureBias * 0.52,
      0.2,
      1,
    ),
    baseVisibility: THREE.MathUtils.clamp(
      settings.baseVisibility,
      0,
      0.035,
    ),
  };
}

const WHITEOUT_PARTICLE_COUNT = 280;
const WHITEOUT_PARTICLE_RADIUS = 165;
const WHITEOUT_PARTICLE_MIN_DISTANCE = 16;
const WHITEOUT_PARTICLE_SPEED = 24;
const SENSE_SWITCH_DELAY_SECONDS = 0;

function shouldShowBees(mode: VisionModeId): boolean {
  return MODE_SEQUENCE.indexOf(mode) >= MODE_SEQUENCE.indexOf("echoLocation");
}

function getBeeFactor(state: BatEcholocationState): number {
  if (!shouldShowBees(state.senseSwitch.currentMode)) return 0;
  return Math.max(
    state.senseSwitch.getEchoLocationFactor(),
    state.senseSwitch.getInfrarotFactor(),
    state.senseSwitch.getDuftFactor(),
    state.senseSwitch.getNetzwerkFactor(),
    state.senseSwitch.getDepthFactor(),
    state.senseSwitch.currentMode === "normal" ? 1 : 0,
  );
}

function getBeeDensity(state: BatEcholocationState): number {
  if (state.senseSwitch.currentMode === "echoLocation") return 0.12;
  return MODE_SEQUENCE.indexOf(state.senseSwitch.currentMode) >=
    MODE_SEQUENCE.indexOf("infrarot")
    ? 1
    : 0;
}

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
  whiteoutParticles: THREE.Points;
  whiteoutOverlayScene: THREE.Scene;
  whiteoutOverlayParticles: THREE.Points;
  senseSwitch: SenseSwitchManager;
  keyboardInput: KeyboardInput;
  controllerInput: ControllerInput;
  chemosenseLayer: ChemosenseLayer;
  networkLayer: NetworkLayer;
  beeSwarm: BeeSwarm | null;
  depthPostprocess: DepthPostprocess;
  invertOutput: boolean;
  chemosenseScore: number;
  intro: IntroSequence;
  delayedSenseMode: VisionModeId | null;
  delayedSenseSwitchAt: number;
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

function randomParticleOffset(target: THREE.Vector3): THREE.Vector3 {
  const distance =
    WHITEOUT_PARTICLE_MIN_DISTANCE +
    Math.random() * (WHITEOUT_PARTICLE_RADIUS - WHITEOUT_PARTICLE_MIN_DISTANCE);
  const yaw = Math.random() * Math.PI * 2;
  const pitch = (Math.random() - 0.5) * 0.72;
  const flat = Math.cos(pitch) * distance;
  target.set(Math.sin(yaw) * flat, Math.sin(pitch) * distance, Math.cos(yaw) * flat);
  return target;
}

function createWhiteoutParticles(
  center: THREE.Vector3,
): THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial> {
  const positions = new Float32Array(WHITEOUT_PARTICLE_COUNT * 3);
  const offset = new THREE.Vector3();
  for (let i = 0; i < WHITEOUT_PARTICLE_COUNT; i++) {
    randomParticleOffset(offset);
    positions[i * 3] = center.x + offset.x;
    positions[i * 3 + 1] = center.y + offset.y;
    positions[i * 3 + 2] = center.z + offset.z;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setDrawRange(0, WHITEOUT_PARTICLE_COUNT);
  const material = new THREE.PointsMaterial({
    color: 0x050505,
    size: 0.42,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    depthTest: false,
    fog: false,
    toneMapped: false,
  });
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  points.renderOrder = 30;
  return points;
}

function createWhiteoutOverlayParticles(source: THREE.Points): THREE.Points {
  const material = (source.material as THREE.PointsMaterial).clone();
  const points = new THREE.Points(source.geometry, material);
  points.frustumCulled = false;
  points.renderOrder = 30;
  return points;
}

function updateWhiteoutParticles(
  state: BatEcholocationState,
  factor: number,
  delta: number,
): void {
  const material = state.whiteoutParticles.material as THREE.PointsMaterial;
  const overlayMaterial = state.whiteoutOverlayParticles.material as THREE.PointsMaterial;
  material.opacity = factor * 0.64;
  overlayMaterial.opacity = material.opacity;
  state.whiteoutParticles.visible = factor > 0.01;
  state.whiteoutOverlayParticles.visible = state.whiteoutParticles.visible;
  if (factor <= 0.01) return;

  const positionAttribute = state.whiteoutParticles.geometry.getAttribute("position");
  if (!(positionAttribute instanceof THREE.BufferAttribute)) return;
  const positions = positionAttribute.array;
  if (!(positions instanceof Float32Array)) return;

  const center = state.player.rig.position;
  const maxDistanceSq = WHITEOUT_PARTICLE_RADIUS * WHITEOUT_PARTICLE_RADIUS;
  const minDistanceSq = WHITEOUT_PARTICLE_MIN_DISTANCE * WHITEOUT_PARTICLE_MIN_DISTANCE;
  const step = WHITEOUT_PARTICLE_SPEED * delta;
  const offset = new THREE.Vector3();
  for (let i = 0; i < WHITEOUT_PARTICLE_COUNT; i++) {
    const x = positions[i * 3];
    const y = positions[i * 3 + 1];
    const z = positions[i * 3 + 2];
    const dx = x - center.x;
    const dy = y - center.y;
    const dz = z - center.z;
    const distanceSq = dx * dx + dy * dy + dz * dz;
    if (distanceSq > minDistanceSq && distanceSq <= maxDistanceSq) {
      const distance = Math.sqrt(distanceSq);
      positions[i * 3] = x - (dx / distance) * step;
      positions[i * 3 + 1] = y - (dy / distance) * step;
      positions[i * 3 + 2] = z - (dz / distance) * step;
      continue;
    }
    randomParticleOffset(offset);
    positions[i * 3] = center.x + offset.x;
    positions[i * 3 + 1] = center.y + offset.y;
    positions[i * 3 + 2] = center.z + offset.z;
  }
  positionAttribute.needsUpdate = true;
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
  const worldSettings: BatWorldSettings = applyWorldPresetToSettings({
    ...BAT_WORLD_DEFAULTS,
    revealIntensity: BAT_ECHO_DEFAULTS.revealIntensity,
    wireThickness: BAT_ECHO_DEFAULTS.wireThickness,
  }, ctx);
  const [worldModels, beeSwarmResult] = await Promise.allSettled([
    loadWorldModels(),
    BeeSwarm.load(),
    loadFlyGeometry().then((geo) => { flyGeometry = geo; }).catch((err) => {
      console.error("Failed to load fly geometry", err);
    }),
  ]);
  const models = worldModels.status === "fulfilled" ? worldModels.value : null;
  const beeSwarm = beeSwarmResult.status === "fulfilled" ? beeSwarmResult.value : null;
  if (beeSwarmResult.status === "rejected") {
    console.warn("[bee-swarm] Failed to load bee model.", beeSwarmResult.reason);
  }

  const world = new BatWorld(worldSettings, {
    worldPreset: ctx.worldPreset ?? null,
    worldRuntime: ctx.worldRuntime ?? null,
    mothGeometry: flyGeometry,
    pineTree: models?.pineTree ?? null,
    commonTree: models?.commonTree ?? null,
    birchTree: models?.birchTree ?? null,
    willowTree: models?.willowTree ?? null,
    deadTree: models?.deadTree ?? null,
    snowTree: models?.snowTree ?? null,
    palmTree: models?.palmTree ?? null,
    cactus: models?.cactus ?? null,
    rock: models?.rock ?? null,
    mossRock: models?.mossRock ?? null,
    snowRock: models?.snowRock ?? null,
    grass: models?.grass ?? null,
    bush: models?.bush ?? null,
    flower: models?.flower ?? null,
    forestProp: models?.forestProp ?? null,
    snowPlant: models?.snowPlant ?? null,
  });
  const audio = new EchoAudioManager({ ...BAT_AUDIO_DEFAULTS });
  audio.startBackgroundMusic();
  world.sharedUniforms.uMoonDirection.value.copy(moonDirection);
  world.sharedUniforms.uMoonColor.value.set(BAT_MOON.glowColor);

  // Live-Regler in der Dev-Konsole (Taste "C"): Anzahl der Tiefen-Bänder in der
  // Echolocation-Ansicht durchprobieren. Wirkt nur, wenn die Depth-Sicht aktiv ist.
  registerTweak({
    id: "echo-depth-levels",
    label: "Echo: Tiefen-Bänder",
    min: 2,
    max: 48,
    step: 1,
    get: () => world.sharedUniforms.uDepthLevels.value,
    set: (v) => {
      world.sharedUniforms.uDepthLevels.value = v;
    },
  });

  const sky = createGradientSky({
    colors: [0xffffff, 0xffffff, 0xffffff],
    radius: BAT_CAMERA.far * 1.3,
    animationSpeed: 0.0008,
  });
  const moon = createMoon();
  const collectionFx = new THREE.Group();
  const collectionBurstTexture = createCollectionBurstTexture();
  const mothEchoFx = new THREE.Group();
  const mothEchoTexture = createMothEchoTexture();
  const whiteoutParticles = createWhiteoutParticles(player.rig.position);
  const whiteoutOverlayScene = new THREE.Scene();
  const whiteoutOverlayParticles = createWhiteoutOverlayParticles(whiteoutParticles);
  whiteoutOverlayScene.add(whiteoutOverlayParticles);

  try {
    batMount = await loadBatMount();
    player.camera.add(batMount);
  } catch (error) {
    console.error("Failed to load bat mount", error);
  }

  moon.position
    .copy(player.rig.position)
    .addScaledVector(moonDirection, BAT_MOON.distance);

  const keyboardInput = new KeyboardInput();
  const controllerInput = new ControllerInput();
  controllerInput.setRenderer(ctx.renderer);
  const senseSwitch = new SenseSwitchManager(
    world.sharedUniforms,
    ctx.scene,
    sky,
    "luft",
  );
  const chemosenseLayer = new ChemosenseLayer(world);
  const networkLayer = new NetworkLayer(world);
  const depthPostprocess = createDepthPostprocess(ctx.renderer);

  ctx.scene.add(world.group);
  ctx.scene.add(player.rig);
  ctx.scene.add(sky);
  ctx.scene.add(moon);
  ctx.scene.add(collectionFx);
  ctx.scene.add(mothEchoFx);
  ctx.scene.add(whiteoutParticles);
  ctx.scene.add(senseSwitch.group);
  ctx.scene.add(chemosenseLayer.group);
  ctx.scene.add(networkLayer.group);
  if (beeSwarm) {
    ctx.scene.add(beeSwarm.group);
  }

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
    whiteoutParticles,
    whiteoutOverlayScene,
    whiteoutOverlayParticles,
    senseSwitch,
    keyboardInput,
    controllerInput,
    chemosenseLayer,
    networkLayer,
    beeSwarm,
    depthPostprocess,
    invertOutput: false,
    chemosenseScore: 0,
    intro: new IntroSequence(),
    delayedSenseMode: null,
    delayedSenseSwitchAt: 0,
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

  s.controllerInput.currentMode = s.senseSwitch.currentMode;
  s.keyboardInput.applyTo(s.player);
  s.controllerInput.applyTo(s.player);

  if (s.keyboardInput.consumeInvertToggle() || s.controllerInput.consumeInvertToggle()) {
    s.invertOutput = !s.invertOutput;
  }
  const pendingMode =
	    s.keyboardInput.consumePendingMode() ?? s.controllerInput.consumePendingMode();
  if (pendingMode) {
    s.intro.playForMode(pendingMode);
    if (pendingMode !== s.senseSwitch.currentMode) {
      s.delayedSenseMode = pendingMode;
      s.delayedSenseSwitchAt = ctx.elapsed + SENSE_SWITCH_DELAY_SECONDS;
    } else {
      s.delayedSenseMode = null;
    }
  }

  if (
    s.delayedSenseMode &&
    ctx.elapsed >= s.delayedSenseSwitchAt &&
    s.delayedSenseMode !== s.senseSwitch.currentMode
  ) {
    s.audio.playTransition();
    s.senseSwitch.switchTo(s.delayedSenseMode);
    s.delayedSenseMode = null;
  } else if (s.delayedSenseMode && ctx.elapsed >= s.delayedSenseSwitchAt) {
    s.delayedSenseMode = null;
  }

  s.keyboardInput.consumePendingBiomeDelta();

  s.senseSwitch.tick(s.player.rig.position, ctx.delta, ctx.elapsed);
  s.player.tick(ctx.delta, (x, z) => s.world.sampleHeight(x, z));
  s.sky.position.copy(s.player.rig.position);
  s.moon.position
    .copy(s.player.rig.position)
    .addScaledVector(
      s.world.sharedUniforms.uMoonDirection.value,
      BAT_MOON.distance,
    );

  const worldFrame = s.world.prepare(s.player.rig.position);

  const biomeWeights = s.world.sampleBiomeWeights(
    s.player.rig.position.x,
    s.player.rig.position.z,
  );
  currentBiomeStore.set(s.world.sampleBiome(s.player.rig.position.x, s.player.rig.position.z));
  s.senseSwitch.updateAtmosphere(biomeWeights, ctx.delta);

  // Chemosense layer: show/hide particle clouds with mode blend.
  const chemoFactor = s.senseSwitch.getDuftFactor();
  s.chemosenseLayer.setFactor(chemoFactor);
  if (chemoFactor > 0.01) {
    s.chemosenseLayer.tick(s.player.rig.position, ctx.elapsed);
    s.chemosenseScore += s.chemosenseLayer.drainScore();
  }
  const networkFactor = s.senseSwitch.getNetzwerkFactor();
  s.networkLayer.setFactor(networkFactor);
  if (networkFactor > 0.01) {
    s.networkLayer.tick(s.player.rig.position, ctx.delta, ctx.elapsed);
  }

  if (s.beeSwarm) {
    s.beeSwarm.setFactor(getBeeFactor(s), getBeeDensity(s));
    s.beeSwarm.tick(s.player.rig.position, ctx.camera, ctx.delta, ctx.elapsed);
  }

  // Moths are 2x larger in echolocation mode.
  const echoFactor = s.senseSwitch.getEcholocationFactor();
  s.world.setMothScale(1 + echoFactor);

  const whiteoutFactor = s.senseSwitch.getLuftFactor();
  const edgeFactor = s.senseSwitch.getEchoLocationFactor();
  const shadowFactor = s.senseSwitch.getInfrarotFactor();
  const driftParticleFactor = Math.max(
    whiteoutFactor,
    edgeFactor,
    shadowFactor * 0.28,
    chemoFactor * 0.18,
    networkFactor * 0.12,
  );
  updateWhiteoutParticles(s, driftParticleFactor, ctx.delta);
  if (s.batMount) {
    s.batMount.visible = whiteoutFactor + edgeFactor + shadowFactor < 0.01;
  }

  s.activeMoths = worldFrame.activeMoths;
  s.nearestMothDistance = worldFrame.nearestMothDistance;
  if (worldFrame.collectedMoths.length > 0) {
    s.collectedMoths = s.world.getCollectedMothCount();
    for (const position of worldFrame.collectedMoths) {
      spawnCollectionBurst(s, position, ctx.elapsed);
    }
  }

  if (s.pendingManualPulse) {
    if (s.senseSwitch.echoEnabled) emitManualPulse(s, ctx.elapsed);
    s.pendingManualPulse = false;
  }

  if (
    s.senseSwitch.echoEnabled &&
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
  return { state: s, outputs: { score: s.collectedMoths + s.chemosenseScore } };
}

export function render(state: ExperienceState, ctx: RenderContext): void {
  const s = state as BatEcholocationState;
  const depthFactor = s.senseSwitch.getDepthFactor();
  const depthInvert = s.senseSwitch.getDepthInvertFactor();
  const depthFloor = s.senseSwitch.getDepthFloorFactor();
  const depthRadius = s.senseSwitch.getDepthRadius();

  // Bake the depth visualization into the world shader on both desktop and VR, and
  // render straight to the canvas so terrain silhouettes get its MSAA. The offscreen
  // depth post-process had no MSAA and produced aliased "feathered" silhouette edges.
  s.world.sharedUniforms.uDepthVisFactor.value = depthFactor;
  s.world.sharedUniforms.uDepthInvertFactor.value = depthInvert;
  s.world.sharedUniforms.uDepthFloor.value = depthFloor;
  s.world.sharedUniforms.uDepthRadius.value = depthRadius;

  const renderLayers = (): void => {
    ctx.renderer.render(ctx.scene, ctx.camera);
    const previousAutoClear = ctx.renderer.autoClear;
    ctx.renderer.autoClear = false;
    ctx.renderer.render(s.whiteoutOverlayScene, ctx.camera);
    ctx.renderer.autoClear = previousAutoClear;
  };
  if (s.invertOutput) {
    s.depthPostprocess.renderInverted(renderLayers);
    return;
  }
  renderLayers();
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

  unregisterTweak("echo-depth-levels");
  s.intro.dispose();
  s.audio.dispose();
  s.senseSwitch.dispose();
  s.keyboardInput.dispose();
  s.controllerInput.dispose();
  s.chemosenseLayer.dispose();
  s.networkLayer.dispose();
  s.beeSwarm?.dispose();
  s.depthPostprocess.dispose();
  disposeBatMount(s.batMount);
  s.world.dispose();
  scene.remove(s.world.group);
  scene.remove(s.player.rig);
  scene.remove(s.sky);
  scene.remove(s.moon);
  scene.remove(s.collectionFx);
  scene.remove(s.mothEchoFx);
  scene.remove(s.whiteoutParticles);
  scene.remove(s.senseSwitch.group);
  scene.remove(s.chemosenseLayer.group);
  scene.remove(s.networkLayer.group);
  if (s.beeSwarm) {
    scene.remove(s.beeSwarm.group);
  }
  s.sky.geometry.dispose();
  (s.sky.material as THREE.Material).dispose();
  s.whiteoutParticles.geometry.dispose();
  (s.whiteoutParticles.material as THREE.Material).dispose();
  (s.whiteoutOverlayParticles.material as THREE.Material).dispose();
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
