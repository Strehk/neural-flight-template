import * as THREE from "three";
import { seededRandom2D } from "$lib/three/random";
import type { BatBiomeId } from "./config";
import type { BatWorld } from "./world";

// Cell grid size for deterministic hotspot placement.
const CELL_SIZE = 22;
// Max hotspots visible at once.
const MAX_HOTSPOTS = 48;
// Collect radius: flying within this triggers a score.
const COLLECT_RADIUS = 7;
// Cooldown before a hotspot respawns after collection (seconds).
const RESPAWN_COOLDOWN = 8;
// Particle cloud radius around each hotspot center.
const CLOUD_RADIUS = 4.5;
// Particles per hotspot.
const PARTICLES_PER_HOTSPOT = 28;
// Render distance for hotspots.
const HOTSPOT_VIEW_DIST = 120;

// Organic biomes that carry scent hotspots.
const ORGANIC_BIOMES = new Set<BatBiomeId>(["forest", "grassland"]);

// Palette of vivid scent colors used per hotspot.
const SCENT_COLORS = [
  0xff44aa, 0x44ffaa, 0xaaff44, 0xff8844, 0x44aaff,
  0xffaa44, 0x88ff44, 0xff4488, 0x44ffdd, 0xdd44ff,
];

interface Hotspot {
  key: string;
  worldX: number;
  worldZ: number;
  worldY: number;
  color: THREE.Color;
  particleOffset: number; // index into particle geometry
  collected: boolean;
  respawnAt: number;
  visible: boolean;
}

function cellSeed(gx: number, gz: number): number {
  return gx * 73856093 + gz * 19349663 + 5923;
}

export class ChemosenseLayer {
  readonly group = new THREE.Group();

  private readonly world: BatWorld;
  private readonly points: THREE.Points;
  private readonly posAttr: THREE.BufferAttribute;
  private readonly colorAttr: THREE.BufferAttribute;
  private readonly alphaAttr: THREE.BufferAttribute;

  private hotspots: Hotspot[] = [];
  private collected = 0;
  private factor = 0; // 0 = hidden, 1 = fully visible

  constructor(world: BatWorld) {
    this.world = world;

    const maxParticles = MAX_HOTSPOTS * PARTICLES_PER_HOTSPOT;
    const positions = new Float32Array(maxParticles * 3);
    const colors    = new Float32Array(maxParticles * 3);
    const alphas    = new Float32Array(maxParticles);

    const geo = new THREE.BufferGeometry();
    this.posAttr   = new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage);
    this.colorAttr = new THREE.BufferAttribute(colors, 3).setUsage(THREE.DynamicDrawUsage);
    this.alphaAttr = new THREE.BufferAttribute(alphas, 1).setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute("position", this.posAttr);
    geo.setAttribute("color", this.colorAttr);
    geo.setAttribute("alpha", this.alphaAttr);
    geo.setDrawRange(0, 0);

    const mat = new THREE.PointsMaterial({
      size: 1.4,
      vertexColors: true,
      transparent: true,
      opacity: 0.0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
      fog: false,
      sizeAttenuation: true,
    });
    // Patch shader to use per-point alpha from the alpha attribute.
    mat.onBeforeCompile = (shader) => {
      shader.vertexShader = "attribute float alpha;\nvarying float vAlpha;\n" + shader.vertexShader;
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

  /**
   * Set the chemosense blend factor (0 = invisible, 1 = fully visible).
   * Drives particle opacity so the layer fades with mode transitions.
   */
  setFactor(factor: number): void {
    this.factor = factor;
    (this.points.material as THREE.PointsMaterial).opacity = factor;
  }

  /** Returns collected scent points accumulated since last call (drains the counter). */
  drainScore(): number {
    const n = this.collected;
    this.collected = 0;
    return n;
  }

  tick(playerPos: THREE.Vector3, elapsed: number): void {
    this.maintainHotspots(playerPos, elapsed);
    this.checkCollection(playerPos, elapsed);
    this.updateGeometry(elapsed);
  }

  dispose(): void {
    this.points.geometry.dispose();
    (this.points.material as THREE.PointsMaterial).dispose();
  }

  private maintainHotspots(playerPos: THREE.Vector3, elapsed: number): void {
    const viewDist = HOTSPOT_VIEW_DIST;
    const halfCells = Math.ceil(viewDist / CELL_SIZE) + 1;
    const centerGX = Math.round(playerPos.x / CELL_SIZE);
    const centerGZ = Math.round(playerPos.z / CELL_SIZE);

    const seen = new Set<string>();

    for (let dgx = -halfCells; dgx <= halfCells; dgx++) {
      for (let dgz = -halfCells; dgz <= halfCells; dgz++) {
        const gx = centerGX + dgx;
        const gz = centerGZ + dgz;
        const wx = gx * CELL_SIZE;
        const wz = gz * CELL_SIZE;
        const dx = wx - playerPos.x;
        const dz = wz - playerPos.z;
        if (dx * dx + dz * dz > viewDist * viewDist) continue;

        const seed = cellSeed(gx, gz);
        const r1 = seededRandom2D(seed, 1);
        const r2 = seededRandom2D(seed, 2);
        const r3 = seededRandom2D(seed, 3);

        // Only ~60% of organic cells carry a hotspot.
        if (r1 > 0.6) continue;

        const jitterX = (r2 - 0.5) * CELL_SIZE * 0.7;
        const jitterZ = (r3 - 0.5) * CELL_SIZE * 0.7;
        const hx = wx + jitterX;
        const hz = wz + jitterZ;
        const biome = this.world.sampleBiome(hx, hz);
        if (!ORGANIC_BIOMES.has(biome)) continue;

        const key = `${gx},${gz}`;
        seen.add(key);

        if (!this.hotspots.find((h) => h.key === key)) {
          const hy = this.world.sampleHeight(hx, hz) + 2.5 + seededRandom2D(seed, 4) * 3;
          const colorHex = SCENT_COLORS[Math.floor(seededRandom2D(seed, 5) * SCENT_COLORS.length)];
          this.hotspots.push({
            key,
            worldX: hx,
            worldZ: hz,
            worldY: hy,
            color: new THREE.Color(colorHex),
            particleOffset: 0,
            collected: false,
            respawnAt: 0,
            visible: true,
          });
          if (this.hotspots.length > MAX_HOTSPOTS) {
            // Remove the farthest hotspot.
            this.hotspots.sort(
              (a, b) =>
                (a.worldX - playerPos.x) ** 2 + (a.worldZ - playerPos.z) ** 2 -
                ((b.worldX - playerPos.x) ** 2 + (b.worldZ - playerPos.z) ** 2),
            );
            this.hotspots.pop();
          }
        }
      }
    }

    // Handle respawns and cull far hotspots.
    this.hotspots = this.hotspots.filter((h) => {
      if (h.collected && elapsed >= h.respawnAt) {
        h.collected = false;
        h.visible = true;
      }
      const dx = h.worldX - playerPos.x;
      const dz = h.worldZ - playerPos.z;
      return dx * dx + dz * dz <= (viewDist + CELL_SIZE) * (viewDist + CELL_SIZE);
    });

    // Re-assign particle offsets.
    let offset = 0;
    for (const h of this.hotspots) {
      h.particleOffset = offset;
      offset += PARTICLES_PER_HOTSPOT;
    }
  }

  private checkCollection(playerPos: THREE.Vector3, elapsed: number): void {
    if (this.factor < 0.1) return;
    for (const h of this.hotspots) {
      if (h.collected) continue;
      const dx = h.worldX - playerPos.x;
      const dy = h.worldY - playerPos.y;
      const dz = h.worldZ - playerPos.z;
      if (dx * dx + dy * dy + dz * dz < COLLECT_RADIUS * COLLECT_RADIUS) {
        h.collected = true;
        h.visible = false;
        h.respawnAt = elapsed + RESPAWN_COOLDOWN;
        this.collected += 1;
      }
    }
  }

  private updateGeometry(elapsed: number): void {
    const pos = this.posAttr.array as Float32Array;
    const col = this.colorAttr.array as Float32Array;
    const alp = this.alphaAttr.array as Float32Array;
    let totalParticles = 0;

    for (const h of this.hotspots) {
      if (!h.visible) {
        for (let i = 0; i < PARTICLES_PER_HOTSPOT; i++) {
          const idx = (h.particleOffset + i) * 3;
          pos[idx] = h.worldX; pos[idx + 1] = h.worldY - 1000; pos[idx + 2] = h.worldZ;
          alp[h.particleOffset + i] = 0;
        }
        totalParticles = Math.max(totalParticles, h.particleOffset + PARTICLES_PER_HOTSPOT);
        continue;
      }

      const seed = cellSeed(
        Math.round(h.worldX / CELL_SIZE),
        Math.round(h.worldZ / CELL_SIZE),
      );

      for (let i = 0; i < PARTICLES_PER_HOTSPOT; i++) {
        const fi = h.particleOffset + i;
        const r1 = seededRandom2D(seed + i, 10);
        const r2 = seededRandom2D(seed + i, 11);
        const r3 = seededRandom2D(seed + i, 12);

        // Spherical shell distribution within CLOUD_RADIUS.
        const theta = r1 * Math.PI * 2;
        const phi   = Math.acos(2 * r2 - 1);
        const rr    = CLOUD_RADIUS * (0.4 + r3 * 0.6);

        // Animate with slow drift and opacity pulse.
        const drift = elapsed * (0.18 + seededRandom2D(seed + i, 13) * 0.14);
        const px = h.worldX + Math.sin(theta) * Math.sin(phi) * rr + Math.sin(drift * 0.7 + i) * 0.5;
        const py = h.worldY + Math.cos(phi) * rr * 0.6 + Math.sin(drift + i * 0.4) * 0.4;
        const pz = h.worldZ + Math.cos(theta) * Math.sin(phi) * rr + Math.cos(drift * 0.5 + i) * 0.5;

        const pidx = fi * 3;
        pos[pidx]     = px;
        pos[pidx + 1] = py;
        pos[pidx + 2] = pz;

        col[pidx]     = h.color.r;
        col[pidx + 1] = h.color.g;
        col[pidx + 2] = h.color.b;

        const pulse = 0.55 + 0.45 * Math.sin(elapsed * 1.8 + i * 0.7 + r1 * 6.28);
        alp[fi] = pulse;

        totalParticles = Math.max(totalParticles, fi + 1);
      }
    }

    this.posAttr.needsUpdate = true;
    this.colorAttr.needsUpdate = true;
    this.alphaAttr.needsUpdate = true;
    this.points.geometry.setDrawRange(0, totalParticles);
  }
}
