import * as THREE from "three";
import { seededRandom2D } from "$lib/three/random";
import type { BatBiomeId } from "./config";
import type { BatWorld } from "./world";

const CELL_SIZE = 42;
const VIEW_DISTANCE = 170;
const MAX_NODES = 90;
const MAX_CONNECTIONS = 150;
const CONNECTION_DISTANCE = 76;

const NETWORK_BIOMES = new Set<BatBiomeId>(["forest", "grassland", "snow"]);

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

    this.group.add(this.lines, this.nodes);
  }

  setFactor(factor: number): void {
    this.factor = THREE.MathUtils.clamp(factor, 0, 1);
    (this.lines.material as THREE.LineBasicMaterial).opacity = this.factor * 0.46;
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
        if (seededRandom2D(seed, 1) > 0.68) continue;

        const jitterX = (seededRandom2D(seed, 2) - 0.5) * CELL_SIZE * 0.72;
        const jitterZ = (seededRandom2D(seed, 3) - 0.5) * CELL_SIZE * 0.72;
        const x = gx * CELL_SIZE + jitterX;
        const z = gz * CELL_SIZE + jitterZ;
        const dx = x - playerPos.x;
        const dz = z - playerPos.z;
        if (dx * dx + dz * dz > VIEW_DISTANCE * VIEW_DISTANCE) continue;

        const biome = this.world.sampleBiome(x, z);
        if (!NETWORK_BIOMES.has(biome)) continue;

        const wave = Math.sin(elapsed * 0.55 + seededRandom2D(seed, 4) * Math.PI * 2);
        const y = this.world.sampleHeight(x, z) + 1.2 + wave * 0.35;
        const color = new THREE.Color(
          biome === "forest" ? 0x8fffce : biome === "grassland" ? 0xd8ff88 : 0xb8e8ff,
        );
        nodes.push({ x, y, z, color });
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
      let nearestIndex = -1;
      let nearestDistanceSq = CONNECTION_DISTANCE * CONNECTION_DISTANCE;

      for (let j = i + 1; j < nodes.length; j++) {
        const b = nodes[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dz = a.z - b.z;
        const distanceSq = dx * dx + dy * dy + dz * dz;
        if (distanceSq >= nearestDistanceSq) continue;
        nearestDistanceSq = distanceSq;
        nearestIndex = j;
      }

      if (nearestIndex < 0) continue;
      const b = nodes[nearestIndex];
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

    this.linePositions.needsUpdate = true;
    this.lineColors.needsUpdate = true;
    this.lines.geometry.setDrawRange(0, connectionCount * 2);
  }
}
