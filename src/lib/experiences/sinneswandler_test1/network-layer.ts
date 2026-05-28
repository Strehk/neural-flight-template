import * as THREE from "three";
import { seededRandom2D } from "$lib/three/random";
import type { BatBiomeId } from "./config";
import type { BatWorld } from "./world";

const CELL_SIZE = 24;
const VIEW_DISTANCE = 260;
const MAX_NODES = 360;
const MAX_CONNECTIONS = 980;
const CONNECTION_DISTANCE = 112;
const CONNECTIONS_PER_NODE = 5;

// Cluster settings: ~30% of occupied cells spawn a tight group of organisms.
const CLUSTER_CHANCE = 0.3;
const CLUSTER_SIZE_MIN = 3;
const CLUSTER_SIZE_MAX = 6;
const CLUSTER_RADIUS = 6.5;

const NETWORK_BIOMES = new Set<BatBiomeId>(["forest", "grassland", "snow"]);

// Red palette — solo nodes vs. cluster nodes get slightly different shades.
const COLOR_SOLO = 0xff1a2e;
const COLOR_CLUSTER_CORE = 0xff0022;
const COLOR_CLUSTER_MEMBER = 0xff3344;

interface NetworkNode {
  x: number;
  y: number;
  z: number;
  color: THREE.Color;
}

function cellSeed(gx: number, gz: number): number {
  return gx * 83492791 + gz * 2654435761 + 1949;
}

export class NetworkLayer {
  readonly group = new THREE.Group();

  private readonly world: BatWorld;
  private readonly linePositions: THREE.BufferAttribute;
  private readonly lineColors: THREE.BufferAttribute;
  private readonly nodePositions: THREE.BufferAttribute;
  private readonly nodeColors: THREE.BufferAttribute;
  private readonly lines: THREE.LineSegments;
  private readonly nodes: THREE.Points;
  private factor = 0;

  constructor(world: BatWorld) {
    this.world = world;

    const lineGeo = new THREE.BufferGeometry();
    this.linePositions = new THREE.BufferAttribute(
      new Float32Array(MAX_CONNECTIONS * 2 * 3),
      3,
    ).setUsage(THREE.DynamicDrawUsage);
    this.lineColors = new THREE.BufferAttribute(
      new Float32Array(MAX_CONNECTIONS * 2 * 3),
      3,
    ).setUsage(THREE.DynamicDrawUsage);
    lineGeo.setAttribute("position", this.linePositions);
    lineGeo.setAttribute("color", this.lineColors);
    lineGeo.setDrawRange(0, 0);

    const lineMat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
      fog: false,
    });
    this.lines = new THREE.LineSegments(lineGeo, lineMat);
    this.lines.frustumCulled = false;
    this.lines.renderOrder = 4;

    const nodeGeo = new THREE.BufferGeometry();
    this.nodePositions = new THREE.BufferAttribute(
      new Float32Array(MAX_NODES * 3),
      3,
    ).setUsage(THREE.DynamicDrawUsage);
    this.nodeColors = new THREE.BufferAttribute(
      new Float32Array(MAX_NODES * 3),
      3,
    ).setUsage(THREE.DynamicDrawUsage);
    nodeGeo.setAttribute("position", this.nodePositions);
    nodeGeo.setAttribute("color", this.nodeColors);
    nodeGeo.setDrawRange(0, 0);

    const nodeMat = new THREE.PointsMaterial({
      size: 1.25,
      sizeAttenuation: true,
      vertexColors: true,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
      fog: false,
    });
    this.nodes = new THREE.Points(nodeGeo, nodeMat);
    this.nodes.frustumCulled = false;
    this.nodes.renderOrder = 5;

    this.group.add(this.lines, this.nodes);
  }

  setFactor(factor: number): void {
    this.factor = THREE.MathUtils.clamp(factor, 0, 1);
    (this.lines.material as THREE.LineBasicMaterial).opacity = this.factor * 0.68;
    (this.nodes.material as THREE.PointsMaterial).opacity = this.factor * 0.82;
    this.group.visible = this.factor > 0.01;
  }

  tick(playerPos: THREE.Vector3, elapsed: number): void {
    if (this.factor <= 0.01) return;

    const nodes = this.collectNodes(playerPos, elapsed);
    this.writeNodes(nodes, elapsed);
    this.writeConnections(nodes, elapsed);
  }

  dispose(): void {
    this.lines.geometry.dispose();
    (this.lines.material as THREE.Material).dispose();
    this.nodes.geometry.dispose();
    (this.nodes.material as THREE.Material).dispose();
  }

  private collectNodes(playerPos: THREE.Vector3, elapsed: number): NetworkNode[] {
    const nodes: NetworkNode[] = [];
    const halfCells = Math.ceil(VIEW_DISTANCE / CELL_SIZE);
    const centerGX = Math.round(playerPos.x / CELL_SIZE);
    const centerGZ = Math.round(playerPos.z / CELL_SIZE);

    for (let gx = centerGX - halfCells; gx <= centerGX + halfCells; gx++) {
      for (let gz = centerGZ - halfCells; gz <= centerGZ + halfCells; gz++) {
        const seed = cellSeed(gx, gz);
        if (seededRandom2D(seed, 1) > 0.82) continue;

        const jitterX = (seededRandom2D(seed, 2) - 0.5) * CELL_SIZE * 0.72;
        const jitterZ = (seededRandom2D(seed, 3) - 0.5) * CELL_SIZE * 0.72;
        const cx = gx * CELL_SIZE + jitterX;
        const cz = gz * CELL_SIZE + jitterZ;
        const dx = cx - playerPos.x;
        const dz = cz - playerPos.z;
        if (dx * dx + dz * dz > VIEW_DISTANCE * VIEW_DISTANCE) continue;

        const biome = this.world.sampleBiome(cx, cz);
        if (!NETWORK_BIOMES.has(biome)) continue;

        const isCluster = seededRandom2D(seed, 10) < CLUSTER_CHANCE;

        if (isCluster) {
          // Spawn a tight group of organisms around this cell center.
          const clusterSize =
            CLUSTER_SIZE_MIN +
            Math.floor(seededRandom2D(seed, 11) * (CLUSTER_SIZE_MAX - CLUSTER_SIZE_MIN + 1));

          for (let ci = 0; ci < clusterSize; ci++) {
            let nx = cx;
            let nz = cz;
            if (ci > 0) {
              const angle = seededRandom2D(seed, 12 + ci * 2) * Math.PI * 2;
              const r = seededRandom2D(seed, 13 + ci * 2) * CLUSTER_RADIUS;
              nx = cx + Math.cos(angle) * r;
              nz = cz + Math.sin(angle) * r;
            }
            const wave = Math.sin(elapsed * 0.55 + seededRandom2D(seed, 4 + ci) * Math.PI * 2);
            const y = this.world.sampleHeight(nx, nz) + 1.2 + wave * 0.35;
            const color = new THREE.Color(ci === 0 ? COLOR_CLUSTER_CORE : COLOR_CLUSTER_MEMBER);
            nodes.push({ x: nx, y, z: nz, color });
          }
        } else {
          const wave = Math.sin(elapsed * 0.55 + seededRandom2D(seed, 4) * Math.PI * 2);
          const y = this.world.sampleHeight(cx, cz) + 1.2 + wave * 0.35;
          nodes.push({ x: cx, y, z: cz, color: new THREE.Color(COLOR_SOLO) });
        }
      }
    }

    nodes.sort((a, b) => {
      const adx = a.x - playerPos.x;
      const adz = a.z - playerPos.z;
      const bdx = b.x - playerPos.x;
      const bdz = b.z - playerPos.z;
      return adx * adx + adz * adz - (bdx * bdx + bdz * bdz);
    });
    return nodes.slice(0, MAX_NODES);
  }

  private writeNodes(nodes: NetworkNode[], elapsed: number): void {
    const pos = this.nodePositions.array as Float32Array;
    const col = this.nodeColors.array as Float32Array;
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      const pulse = 0.74 + 0.26 * Math.sin(elapsed * 1.8 + i * 0.37);
      pos[i * 3] = node.x;
      pos[i * 3 + 1] = node.y;
      pos[i * 3 + 2] = node.z;
      col[i * 3] = node.color.r * pulse;
      col[i * 3 + 1] = node.color.g * pulse;
      col[i * 3 + 2] = node.color.b * pulse;
    }
    this.nodePositions.needsUpdate = true;
    this.nodeColors.needsUpdate = true;
    this.nodes.geometry.setDrawRange(0, nodes.length);
  }

  private writeConnections(nodes: NetworkNode[], elapsed: number): void {
    const pos = this.linePositions.array as Float32Array;
    const col = this.lineColors.array as Float32Array;
    let connectionCount = 0;

    for (let i = 0; i < nodes.length && connectionCount < MAX_CONNECTIONS; i++) {
      const a = nodes[i];
      const candidates: { index: number; distanceSq: number }[] = [];

      for (let j = i + 1; j < nodes.length; j++) {
        const b = nodes[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dz = a.z - b.z;
        const distanceSq = dx * dx + dy * dy + dz * dz;
        if (distanceSq >= CONNECTION_DISTANCE * CONNECTION_DISTANCE) continue;
        candidates.push({ index: j, distanceSq });
      }

      candidates.sort((aCandidate, bCandidate) => aCandidate.distanceSq - bCandidate.distanceSq);

      const maxCandidates = Math.min(CONNECTIONS_PER_NODE, candidates.length);
      for (
        let candidateIndex = 0;
        candidateIndex < maxCandidates && connectionCount < MAX_CONNECTIONS;
        candidateIndex++
      ) {
        const b = nodes[candidates[candidateIndex].index];
        const base = connectionCount * 6;
        const colorPulse = 0.66 + 0.34 * Math.sin(elapsed * 1.25 + i * 0.41);

        pos[base] = a.x;
        pos[base + 1] = a.y;
        pos[base + 2] = a.z;
        pos[base + 3] = b.x;
        pos[base + 4] = b.y;
        pos[base + 5] = b.z;

        col[base] = a.color.r * colorPulse;
        col[base + 1] = a.color.g * colorPulse;
        col[base + 2] = a.color.b * colorPulse;
        col[base + 3] = b.color.r * colorPulse;
        col[base + 4] = b.color.g * colorPulse;
        col[base + 5] = b.color.b * colorPulse;

        connectionCount += 1;
      }
    }

    this.linePositions.needsUpdate = true;
    this.lineColors.needsUpdate = true;
    this.lines.geometry.setDrawRange(0, connectionCount * 2);
  }
}
