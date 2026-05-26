import * as THREE from "three";
import type { BatBiomeId } from "./config";
import type { SharedEchoUniforms } from "./shaders";
import { VISION_MODES, BIOME_VISION_MODES, MODE_SEQUENCE, nextMode, type VisionModeId, type VisionMode } from "./vision-modes";

// Subtle atmospheric fog tint per biome, per vision mode.
// These are blended at low strength so they hint at the upcoming biome
// without overriding the mode's base fog color.
const BIOME_FOG_TINTS: Record<BatBiomeId, { echo: number; day: number }> = {
  mountains: { echo: 0x06101e, day: 0xa8ccf0 },
  snow:      { echo: 0x07101c, day: 0xeaf6ff },
  grassland: { echo: 0x060e06, day: 0xb8e8a0 },
  forest:    { echo: 0x04080a, day: 0x70aa78 },
  desert:   { echo: 0x120b02, day: 0xf0cf86 },
  barrens:   { echo: 0x100c04, day: 0xddd0a0 },
};
const ATMO_TINT_MAX = 0.18;  // how strongly the biome tints the fog (0–1)
const ATMO_LERP_SPEED = 0.7; // per-second lerp rate toward target tint

const TRANSITION_DURATION = 2.5;

const ZONE_RADIUS_MIN = 20;
const ZONE_RADIUS_MAX = 30;
const ZONE_SPAWN_DIST_MIN = 50;
const ZONE_SPAWN_DIST_MAX = 110;
const ZONE_COUNT_TARGET = 3;
const ZONE_COOLDOWN = 6;

const RING_INNER_RADIUS = 12;
const RING_TUBE_RADIUS = 0.7;
const RING_SPAWN_DIST_MIN = 90;
const RING_SPAWN_DIST_MAX = 170;
const RING_COUNT_TARGET = 2;

interface TriggerZone {
  group: THREE.Group;
  center: THREE.Vector3;
  radius: number;
  targetMode: VisionModeId;
  cooldownUntil: number;
}

interface SenseRing {
  mesh: THREE.Mesh;
  center: THREE.Vector3;
  normal: THREE.Vector3;
  innerRadius: number;
  targetMode: VisionModeId;
  lastDot: number;
  used: boolean;
}

interface ActiveTransition {
  fromMode: VisionModeId;
  toMode: VisionModeId;
  progress: number;
}

// Module-level temp objects — never passed outside this module.
const _c1 = new THREE.Color();
const _c2 = new THREE.Color();
const _tmp = new THREE.Vector3();
const _defaultHoleAxis = new THREE.Vector3(0, 1, 0);

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function smoothstep(t: number): number {
  const c = Math.max(0, Math.min(1, t));
  return c * c * (3 - 2 * c);
}

function disposeMesh(mesh: THREE.Mesh): void {
  mesh.geometry.dispose();
  if (Array.isArray(mesh.material)) {
    mesh.material.forEach((m) => m.dispose());
  } else {
    (mesh.material as THREE.Material).dispose();
  }
}

function disposeGroup(group: THREE.Group): void {
  group.traverse((child) => {
    if (child instanceof THREE.Mesh) disposeMesh(child);
  });
}

export class SenseSwitchManager {
  readonly group = new THREE.Group();
  currentMode: VisionModeId;

  private zones: TriggerZone[] = [];
  private rings: SenseRing[] = [];
  private transition: ActiveTransition | null = null;
  private sharedUniforms: SharedEchoUniforms;
  private scene: THREE.Scene;
  private sky: THREE.Mesh;
  private lastZoneSpawn = -Infinity;
  private lastRingSpawn = -Infinity;
  private lastBiomeSwitchAt = -Infinity;
  private lastKnownBiome: BatBiomeId | null = null;
  // Base fog color for the current mode (without biome atmosphere tint)
  private readonly baseFogColor = new THREE.Color();

  constructor(
    sharedUniforms: SharedEchoUniforms,
    scene: THREE.Scene,
    sky: THREE.Mesh,
    initialMode: VisionModeId = "echolocation",
  ) {
    this.sharedUniforms = sharedUniforms;
    this.scene = scene;
    this.sky = sky;
    this.currentMode = initialMode;
    this.applyModeImmediate(VISION_MODES[initialMode]);
  }

  get isTransitioning(): boolean {
    return this.transition !== null;
  }

  /** Whether echo pulses should fire in the current mode (or during transition). */
  get echoEnabled(): boolean {
    if (this.transition) {
      return (
        VISION_MODES[this.transition.fromMode].echoEnabled ||
        VISION_MODES[this.transition.toMode].echoEnabled
      );
    }
    return VISION_MODES[this.currentMode].echoEnabled;
  }

  /** 0–1 blend weight for chemosense mode (accounting for in-progress transitions). */
  getChemosenseFactor(): number {
    if (!this.transition) {
      return this.currentMode === "chemosense" ? 1 : 0;
    }
    const fromVal = this.transition.fromMode === "chemosense" ? 1 : 0;
    const toVal   = this.transition.toMode   === "chemosense" ? 1 : 0;
    const t = smoothstep(this.transition.progress);
    return fromVal + (toVal - fromVal) * t;
  }

  /** 0–1 blend weight for echolocation mode (accounting for in-progress transitions). */
  getEcholocationFactor(): number {
    if (!this.transition) {
      return this.currentMode === "echolocation" ? 1 : 0;
    }
    const fromVal = this.transition.fromMode === "echolocation" ? 1 : 0;
    const toVal   = this.transition.toMode   === "echolocation" ? 1 : 0;
    const t = smoothstep(this.transition.progress);
    return fromVal + (toVal - fromVal) * t;
  }

  tick(playerPos: THREE.Vector3, delta: number, elapsed: number): void {
    this.updateTransition(delta);
    this.checkZones(playerPos, elapsed);
    this.checkRings(playerPos);
    this.maintain(playerPos, elapsed);
    this.prune(playerPos);
  }

  /**
   * Call with the dominant biome at the player's current position each tick.
   * Biomes registered in BIOME_VISION_MODES force a mode switch when entered.
   */
  checkBiome(biome: BatBiomeId, elapsed: number): void {
    if (biome === this.lastKnownBiome) return;
    this.lastKnownBiome = biome;

    const forced = BIOME_VISION_MODES[biome];
    if (!forced || forced === this.currentMode) return;
    if (elapsed - this.lastBiomeSwitchAt < 3) return; // hysteresis at biome edges

    this.switchTo(forced);
    this.lastBiomeSwitchAt = elapsed;
  }

  /**
   * Call each tick with the dominant biome 150-200 m ahead of the player.
   * Subtly tints the fog toward the biome's characteristic color so the player
   * can sense an upcoming biome shift before they enter it.
   * No-op during mode transitions (the transition system controls fog then).
   */
  updateAtmosphere(aheadBiome: BatBiomeId, delta: number): void {
    if (this.transition) return;
    const tintInfo = BIOME_FOG_TINTS[aheadBiome];
    const tintHex = this.currentMode === "daylight" ? tintInfo.day : tintInfo.echo; // chemosense uses echo tints (dark)
    _c1.set(tintHex);
    const targetFog = _c1.clone().lerp(this.baseFogColor, 1 - ATMO_TINT_MAX);
    this.sharedUniforms.uFogColor.value.lerp(targetFog, delta * ATMO_LERP_SPEED);
    if (this.scene.fog instanceof THREE.Fog) {
      this.scene.fog.color.copy(this.sharedUniforms.uFogColor.value);
    }
  }

  switchTo(targetMode: VisionModeId): void {
    if (targetMode === this.currentMode && !this.transition) return;
    this.transition = { fromMode: this.currentMode, toMode: targetMode, progress: 0 };
    this.currentMode = targetMode;
  }

  dispose(): void {
    this.zones.forEach((z) => {
      this.group.remove(z.group);
      disposeGroup(z.group);
    });
    this.rings.forEach((r) => {
      this.group.remove(r.mesh);
      disposeMesh(r.mesh);
    });
    this.zones = [];
    this.rings = [];
  }

  private updateTransition(delta: number): void {
    if (!this.transition) return;
    this.transition.progress += delta / TRANSITION_DURATION;
    if (this.transition.progress >= 1) {
      this.applyModeImmediate(VISION_MODES[this.transition.toMode]);
      this.transition = null;
    } else {
      const from = VISION_MODES[this.transition.fromMode];
      const to = VISION_MODES[this.transition.toMode];
      this.applyModeLerp(from, to, smoothstep(this.transition.progress));
    }
  }

  private checkZones(playerPos: THREE.Vector3, elapsed: number): void {
    for (const zone of this.zones) {
      if (elapsed < zone.cooldownUntil) continue;
      if (zone.targetMode === this.currentMode) continue;
      if (playerPos.distanceTo(zone.center) < zone.radius) {
        this.switchTo(zone.targetMode);
        zone.cooldownUntil = elapsed + ZONE_COOLDOWN;
      }
    }
  }

  private checkRings(playerPos: THREE.Vector3): void {
    for (const ring of this.rings) {
      if (ring.used) continue;

      _tmp.subVectors(playerPos, ring.center);
      const dot = _tmp.dot(ring.normal);
      const perpLen = Math.sqrt(Math.max(0, _tmp.lengthSq() - dot * dot));

      // Plane crossing check — sign change + within hole radius
      if (ring.lastDot * dot < 0 && perpLen < ring.innerRadius) {
        ring.used = true;
        this.switchTo(ring.targetMode);
      }
      ring.lastDot = dot;
    }
  }

  private maintain(playerPos: THREE.Vector3, elapsed: number): void {
    if (this.zones.length < ZONE_COUNT_TARGET && elapsed - this.lastZoneSpawn > 2) {
      this.spawnZone(playerPos, elapsed);
      this.lastZoneSpawn = elapsed;
    }
    const activeRings = this.rings.filter((r) => !r.used).length;
    if (activeRings < RING_COUNT_TARGET && elapsed - this.lastRingSpawn > 4) {
      this.spawnRing(playerPos, elapsed);
      this.lastRingSpawn = elapsed;
    }
  }

  private prune(playerPos: THREE.Vector3): void {
    const MAX = 350;
    this.zones = this.zones.filter((zone) => {
      if (playerPos.distanceTo(zone.center) > MAX) {
        this.group.remove(zone.group);
        disposeGroup(zone.group);
        return false;
      }
      return true;
    });
    this.rings = this.rings.filter((ring) => {
      if (ring.used || playerPos.distanceTo(ring.center) > MAX) {
        this.group.remove(ring.mesh);
        disposeMesh(ring.mesh);
        return false;
      }
      return true;
    });
  }

  private spawnZone(playerPos: THREE.Vector3, _elapsed: number): void {
    const targetMode = nextMode(this.currentMode);
    const accentHex = VISION_MODES[targetMode].accentHex;

    const angle = Math.random() * Math.PI * 2;
    const dist =
      ZONE_SPAWN_DIST_MIN + Math.random() * (ZONE_SPAWN_DIST_MAX - ZONE_SPAWN_DIST_MIN);
    const radius = ZONE_RADIUS_MIN + Math.random() * (ZONE_RADIUS_MAX - ZONE_RADIUS_MIN);
    const center = new THREE.Vector3(
      playerPos.x + Math.cos(angle) * dist,
      playerPos.y + (Math.random() - 0.5) * 10,
      playerPos.z + Math.sin(angle) * dist,
    );

    const geo = new THREE.SphereGeometry(radius, 16, 12);
    const fillMat = new THREE.MeshBasicMaterial({
      color: accentHex,
      transparent: true,
      opacity: 0.04,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const wireMat = new THREE.MeshBasicMaterial({
      color: accentHex,
      wireframe: true,
      transparent: true,
      opacity: 0.14,
      depthWrite: false,
    });

    const group = new THREE.Group();
    group.add(new THREE.Mesh(geo, fillMat));
    group.add(new THREE.Mesh(geo, wireMat));
    group.position.copy(center);
    this.group.add(group);

    this.zones.push({ group, center, radius, targetMode, cooldownUntil: 0 });
  }

  private spawnRing(playerPos: THREE.Vector3, _elapsed: number): void {
    const targetMode = nextMode(this.currentMode);
    const accentHex = VISION_MODES[targetMode].accentHex;

    const lateralAngle = (Math.random() - 0.5) * Math.PI * 0.6;
    const dist =
      RING_SPAWN_DIST_MIN + Math.random() * (RING_SPAWN_DIST_MAX - RING_SPAWN_DIST_MIN);
    const center = new THREE.Vector3(
      playerPos.x + Math.sin(lateralAngle) * dist,
      playerPos.y + (Math.random() - 0.5) * 6,
      playerPos.z + Math.cos(lateralAngle) * dist,
    );

    // Normal points from ring toward player so dot starts positive.
    const normal = new THREE.Vector3().subVectors(playerPos, center).normalize();
    const initialDot = new THREE.Vector3()
      .subVectors(playerPos, center)
      .dot(normal);

    const geo = new THREE.TorusGeometry(RING_INNER_RADIUS, RING_TUBE_RADIUS, 16, 64);
    const mat = new THREE.MeshBasicMaterial({
      color: accentHex,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(center);

    // Rotate torus so its hole axis (default Y) aligns with the desired normal.
    const q = new THREE.Quaternion().setFromUnitVectors(_defaultHoleAxis, normal);
    mesh.setRotationFromQuaternion(q);

    this.group.add(mesh);
    this.rings.push({
      mesh,
      center,
      normal,
      innerRadius: RING_INNER_RADIUS,
      targetMode,
      lastDot: initialDot,
      used: false,
    });
  }

  private applyModeImmediate(mode: VisionMode): void {
    this.baseFogColor.set(mode.fogColorHex);
    this.sharedUniforms.uFogColor.value.set(mode.fogColorHex);
    this.sharedUniforms.uFogNear.value = mode.fogNear;
    this.sharedUniforms.uFogFar.value = mode.fogFar;
    this.sharedUniforms.uBaseVisibility.value = mode.baseVisibility;
    this.sharedUniforms.uMoonColor.value.set(mode.moonColorHex);
    this.sharedUniforms.uMoonDirection.value.copy(mode.moonDirection);
    this.sharedUniforms.uDaylightFactor.value = mode.id === "daylight" ? 1 : 0;

    if (this.scene.fog instanceof THREE.Fog) {
      this.scene.fog.color.set(mode.fogColorHex);
      this.scene.fog.near = mode.fogNear;
      this.scene.fog.far = mode.fogFar;
    }

    const skyMat = this.sky.material as THREE.ShaderMaterial;
    if (skyMat.uniforms?.uColors) {
      mode.skyColors.forEach((hex, i) => {
        skyMat.uniforms.uColors.value[i]?.set(hex);
      });
    }
  }

  private applyModeLerp(from: VisionMode, to: VisionMode, t: number): void {
    const fogColor = _c1.set(from.fogColorHex).lerp(_c2.set(to.fogColorHex), t);
    this.baseFogColor.copy(fogColor);
    this.sharedUniforms.uFogColor.value.copy(fogColor);
    this.sharedUniforms.uFogNear.value = lerp(from.fogNear, to.fogNear, t);
    this.sharedUniforms.uFogFar.value = lerp(from.fogFar, to.fogFar, t);
    this.sharedUniforms.uBaseVisibility.value = lerp(
      from.baseVisibility,
      to.baseVisibility,
      t,
    );
    this.sharedUniforms.uMoonColor.value
      .set(from.moonColorHex)
      .lerp(_c2.set(to.moonColorHex), t);
    this.sharedUniforms.uMoonDirection.value
      .copy(from.moonDirection)
      .lerp(to.moonDirection, t)
      .normalize();
    // Lerp daylight factor: echolocation=0, daylight=1
    const fromDL = from.id === "daylight" ? 1 : 0;
    const toDL   = to.id   === "daylight" ? 1 : 0;
    this.sharedUniforms.uDaylightFactor.value = lerp(fromDL, toDL, t);

    if (this.scene.fog instanceof THREE.Fog) {
      this.scene.fog.color.copy(fogColor);
      this.scene.fog.near = this.sharedUniforms.uFogNear.value;
      this.scene.fog.far = this.sharedUniforms.uFogFar.value;
    }

    const skyMat = this.sky.material as THREE.ShaderMaterial;
    if (skyMat.uniforms?.uColors) {
      from.skyColors.forEach((fromHex, i) => {
        skyMat.uniforms.uColors.value[i]
          ?.set(fromHex)
          .lerp(_c2.set(to.skyColors[i]), t);
      });
    }
  }
}
