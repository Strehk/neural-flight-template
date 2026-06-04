import * as THREE from "three";
import { seededRandom2D } from "$lib/three/random";
import type { BatWorld, ChemosenseSource } from "./world";

const MAX_SOURCES = 900;
const MAX_PARTICLES_PER_SOURCE = 26;
const MAX_PARTICLES = MAX_SOURCES * MAX_PARTICLES_PER_SOURCE;
const COLLECT_RADIUS = 5.5;
const RESPAWN_COOLDOWN = 8;
const HOTSPOT_VIEW_DIST = 420;
const PARTICLE_SIZE = 2.7;

interface ActiveSource {
  source: ChemosenseSource;
  seed: number;
  particleOffset: number;
  particleCount: number;
  visible: boolean;
}

function createScentParticleTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    gradient.addColorStop(0, "rgba(255,255,255,1)");
    gradient.addColorStop(0.48, "rgba(255,255,255,0.72)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 32, 32);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function hashKey(key: string): number {
  let hash = 2166136261;
  for (let i = 0; i < key.length; i++) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash;
}

export class ChemosenseLayer {
  readonly group = new THREE.Group();

  private readonly world: BatWorld;
  private readonly points: THREE.Points;
  private readonly particleTexture: THREE.CanvasTexture;
  private readonly posAttr: THREE.BufferAttribute;
  private readonly colorAttr: THREE.BufferAttribute;
  private readonly alphaAttr: THREE.BufferAttribute;
  private readonly tempColor = new THREE.Color();

  private activeSources: ActiveSource[] = [];
  private readonly respawnBySource = new Map<string, number>();
  private collected = 0;
  private factor = 0;

  constructor(world: BatWorld) {
    this.world = world;

    const positions = new Float32Array(MAX_PARTICLES * 3);
    const colors = new Float32Array(MAX_PARTICLES * 3);
    const alphas = new Float32Array(MAX_PARTICLES);

    const geo = new THREE.BufferGeometry();
    this.particleTexture = createScentParticleTexture();
    this.posAttr = new THREE.BufferAttribute(positions, 3).setUsage(
      THREE.DynamicDrawUsage,
    );
    this.colorAttr = new THREE.BufferAttribute(colors, 3).setUsage(
      THREE.DynamicDrawUsage,
    );
    this.alphaAttr = new THREE.BufferAttribute(alphas, 1).setUsage(
      THREE.DynamicDrawUsage,
    );
    geo.setAttribute("position", this.posAttr);
    geo.setAttribute("color", this.colorAttr);
    geo.setAttribute("alpha", this.alphaAttr);
    geo.setDrawRange(0, 0);

    const mat = new THREE.PointsMaterial({
      size: PARTICLE_SIZE,
      map: this.particleTexture,
      vertexColors: true,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      depthTest: true,
      blending: THREE.NormalBlending,
      toneMapped: false,
      fog: false,
      sizeAttenuation: false,
    });
    mat.onBeforeCompile = (shader) => {
      shader.vertexShader =
        "attribute float alpha;\nvarying float vAlpha;\n" + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\nvAlpha = alpha;",
      );
      shader.fragmentShader = "varying float vAlpha;\n" + shader.fragmentShader;
      shader.fragmentShader = shader.fragmentShader.replace(
        "gl_FragColor = vec4( outgoingLight, diffuseColor.a );",
        "gl_FragColor = vec4( outgoingLight, diffuseColor.a * vAlpha );",
      );
    };

    this.points = new THREE.Points(geo, mat);
    this.points.frustumCulled = false;
    this.group.add(this.points);
  }

  setFactor(factor: number): void {
    this.factor = factor;
    (this.points.material as THREE.PointsMaterial).opacity = factor;
  }

  drainScore(): number {
    const n = this.collected;
    this.collected = 0;
    return n;
  }

  tick(playerPos: THREE.Vector3, elapsed: number): void {
    this.maintainSources(playerPos, elapsed);
    this.checkCollection(playerPos, elapsed);
    this.updateGeometry(elapsed);
  }

  dispose(): void {
    this.points.geometry.dispose();
    (this.points.material as THREE.PointsMaterial).dispose();
    this.particleTexture.dispose();
  }

  private maintainSources(playerPos: THREE.Vector3, elapsed: number): void {
    const sources = this.world
      .sampleChemosenseSources(playerPos, HOTSPOT_VIEW_DIST)
      .slice(0, MAX_SOURCES);
    const activeKeys = new Set<string>();
    let offset = 0;

    this.activeSources = sources.map((source) => {
      activeKeys.add(source.key);
      const respawnAt = this.respawnBySource.get(source.key) ?? 0;
      if (respawnAt > 0 && elapsed >= respawnAt) {
        this.respawnBySource.delete(source.key);
      }
      const particleCount = Math.min(
        source.particleCount,
        MAX_PARTICLES_PER_SOURCE,
        MAX_PARTICLES - offset,
      );
      const active: ActiveSource = {
        source,
        seed: hashKey(source.key),
        particleOffset: offset,
        particleCount,
        visible: respawnAt <= 0 || elapsed >= respawnAt,
      };
      offset += particleCount;
      return active;
    });

    for (const key of this.respawnBySource.keys()) {
      if (!activeKeys.has(key)) this.respawnBySource.delete(key);
    }
  }

  private checkCollection(playerPos: THREE.Vector3, elapsed: number): void {
    if (this.factor < 0.1) return;
    for (const active of this.activeSources) {
      if (!active.visible) continue;
      const radius = COLLECT_RADIUS + active.source.radius * 0.35;
      if (
        active.source.position.distanceToSquared(playerPos) <
        radius * radius
      ) {
        this.respawnBySource.set(active.source.key, elapsed + RESPAWN_COOLDOWN);
        active.visible = false;
        this.collected += 1;
      }
    }
  }

  private updateGeometry(elapsed: number): void {
    const pos = this.posAttr.array as Float32Array;
    const col = this.colorAttr.array as Float32Array;
    const alp = this.alphaAttr.array as Float32Array;
    let totalParticles = 0;

    for (const active of this.activeSources) {
      const source = active.source;
      const base = source.position;
      const baseColor = this.tempColor.set(source.color);

      for (let i = 0; i < active.particleCount; i++) {
        const fi = active.particleOffset + i;
        const pidx = fi * 3;

        if (!active.visible) {
          pos[pidx] = base.x;
          pos[pidx + 1] = base.y - 1000;
          pos[pidx + 2] = base.z;
          alp[fi] = 0;
          totalParticles = Math.max(totalParticles, fi + 1);
          continue;
        }

        const r1 = seededRandom2D(active.seed + i, 10);
        const r2 = seededRandom2D(active.seed + i, 11);
        const r3 = seededRandom2D(active.seed + i, 12);
        const r4 = seededRandom2D(active.seed + i, 13);
        const r5 = seededRandom2D(active.seed + i, 14);
        const theta = r1 * Math.PI * 2;
        const phi = Math.acos(2 * r2 - 1);
        const radius = source.radius * (0.24 + r3 * 0.82);
        const drift = elapsed * (0.28 + r4 * 0.32);
        const wind = source.radius * 0.2;

        const px =
          base.x +
          Math.sin(theta) * Math.sin(phi) * radius +
          Math.sin(drift * 0.7 + r5 * 9.0) * wind;
        const py =
          base.y +
          Math.cos(phi) * radius * 0.58 +
          Math.sin(drift + i * 0.37) * source.radius * 0.15;
        const pz =
          base.z +
          Math.cos(theta) * Math.sin(phi) * radius +
          Math.cos(drift * 0.56 + r5 * 7.0) * wind;

        pos[pidx] = px;
        pos[pidx + 1] = py;
        pos[pidx + 2] = pz;

        this.tempColor
          .copy(baseColor)
          .offsetHSL((r5 - 0.5) * 0.035, 0.16, (r4 - 0.5) * 0.16);
        col[pidx] = this.tempColor.r;
        col[pidx + 1] = this.tempColor.g;
        col[pidx + 2] = this.tempColor.b;

        const pulse =
          0.48 + 0.52 * Math.sin(elapsed * 2.35 + i * 0.73 + r1 * 6.28);
        alp[fi] = THREE.MathUtils.clamp(source.intensity * (0.62 + pulse * 0.5), 0, 1);

        totalParticles = Math.max(totalParticles, fi + 1);
      }
    }

    this.posAttr.needsUpdate = true;
    this.colorAttr.needsUpdate = true;
    this.alphaAttr.needsUpdate = true;
    this.points.geometry.setDrawRange(0, totalParticles);
  }
}
