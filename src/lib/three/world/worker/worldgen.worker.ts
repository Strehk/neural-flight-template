/**
 * Worldgen worker entry — runs the noise stack + biome/height/derived
 * samplers + decoration RNG + acoustic-field bake for one chunk and
 * posts the typed-array result back to the pool.
 *
 * No THREE imports — everything here is pure data. The main thread
 * wraps the returned Float32Arrays in `BufferGeometry` / `InstancedMesh`
 * via `TerrainMeshBuilder.assembleTerrainGeometry` and
 * `DecorationPlacer.applyData`.
 */

import { TerrainSampler } from "$lib/worldgen/terrain/terrain-sampler";
import {
  applyTerrainDayColor,
  applyTerrainEchoColor,
} from "$lib/worldgen/terrain/derived-field-sampler";
import { computeDecorationData } from "$lib/worldgen/vegetation/decoration-data";
import { fbm } from "$lib/three/world/NoiseStack";
import {
  computeTerrainData,
  computeTerrainPlaneLayout,
  type TerrainPlaneLayout,
} from "$lib/three/world/TerrainDataBuilder";
import { bakeAcousticField } from "$lib/three/world/AcousticFieldBaker";
import type { TerrainSample } from "$lib/worldgen/terrain/terrain-sampler";
import type {
  WorkerInboundMessage,
  WorkerOutboundMessage,
  WorkerInitMessage,
  WorkerUpdateConfigMessage,
  WorkerBuildMessage,
  SerializableAcousticField,
} from "./protocol";

interface WorkerState {
  init: WorkerInitMessage;
  sampler: TerrainSampler;
  layout: TerrainPlaneLayout;
  generation: number;
}

let state: WorkerState | null = null;

self.onmessage = (event: MessageEvent<WorkerInboundMessage>) => {
  const msg = event.data;
  try {
    switch (msg.type) {
      case "init":
        handleInit(msg);
        break;
      case "updateConfig":
        handleUpdateConfig(msg);
        break;
      case "build":
        handleBuild(msg);
        break;
    }
  } catch (err) {
    const id = msg.type === "build" ? msg.id : -1;
    const generation = state?.generation ?? 0;
    const reply: WorkerOutboundMessage = {
      type: "error",
      id,
      generation,
      message: err instanceof Error ? err.message : String(err),
    };
    (self as unknown as Worker).postMessage(reply);
  }
};

function handleInit(msg: WorkerInitMessage): void {
  const sampler = new TerrainSampler(msg.worldConfig);
  if (msg.biomeOverride !== null) {
    sampler.setBiomeOverride(msg.biomeOverride);
  }
  const layout = computeTerrainPlaneLayout(msg.chunkSize, msg.segments);
  state = { init: msg, sampler, layout, generation: 0 };
}

function handleUpdateConfig(msg: WorkerUpdateConfigMessage): void {
  if (!state) throw new Error("worldgen worker received updateConfig before init");
  if (msg.worldConfigPatch) {
    state.sampler.updateConfig(msg.worldConfigPatch);
  }
  if (msg.biomeOverride !== undefined) {
    state.sampler.setBiomeOverride(msg.biomeOverride);
  }
  if (msg.decorationSettings) {
    state.init = { ...state.init, decorationSettings: msg.decorationSettings };
  }
  state.generation = msg.generation;
}

function handleBuild(msg: WorkerBuildMessage): void {
  if (!state) throw new Error("worldgen worker received build before init");
  const { sampler, layout, init } = state;
  const sampleFn = (x: number, z: number): TerrainSample => sampler.sample(x, z);

  const terrain = computeTerrainData(msg.gridX, msg.gridZ, {
    chunkSize: init.chunkSize,
    layout,
    sample: sampleFn,
    echo: { apply: applyTerrainEchoColor, palette: init.echoPalette },
    day:  { apply: applyTerrainDayColor,  palette: init.dayPalette  },
  });

  const decorations = computeDecorationData(msg.gridX, msg.gridZ, {
    settings: init.decorationSettings,
    sample: sampleFn,
    colorizeSample: (outColor, sample) =>
      applyTerrainEchoColor(outColor, sample, init.echoPalette),
    forestSection: (x, z) =>
      fbm(
        sampler.noiseStack.getNoise("treeCluster"),
        x * 0.0024 + 41,
        z * 0.0024 - 29,
        3,
        2.05,
        0.52,
      ),
  });

  let acoustic: SerializableAcousticField | null = null;
  if (init.acousticFieldEnabled) {
    const field = bakeAcousticField({
      gridX: msg.gridX,
      gridZ: msg.gridZ,
      chunkSize: init.chunkSize,
      gridStep: init.acousticFieldGridStep,
      sample: sampleFn,
    });
    acoustic = {
      chunkSize: field.chunkSize,
      gridStep: field.gridStep,
      cellsPerSide: field.cellsPerSide,
      originX: field.originX,
      originZ: field.originZ,
      // Spread the samples into plain objects so they survive structured clone
      // cleanly (also detaches them from the worker-side sampler cache).
      samples: field.samples.map((s) => ({ ...s })),
    };
  }

  const reply: WorkerOutboundMessage = {
    type: "built",
    id: msg.id,
    generation: msg.generation,
    gridX: msg.gridX,
    gridZ: msg.gridZ,
    terrain,
    decorations,
    acoustic,
  };

  // Drop the worker-side sampler cache between builds so it doesn't grow
  // unbounded across chunks. Each chunk's noise samples are independent
  // (no cross-chunk reuse worth keeping when one worker handles many
  // chunks at varied coords).
  sampler.clearCache();

  const transfers = collectTransferables(reply);
  (self as unknown as Worker).postMessage(reply, transfers);
}

function collectTransferables(msg: WorkerOutboundMessage): Transferable[] {
  if (msg.type !== "built") return [];
  const transfers: Transferable[] = [];
  transfers.push(msg.terrain.heights.buffer);
  transfers.push(msg.terrain.waterHeights.buffer);
  transfers.push(msg.terrain.waterMask.buffer);
  transfers.push(msg.terrain.echoColors.buffer);
  transfers.push(msg.terrain.dayColors.buffer);
  for (const bucket of Object.values(msg.decorations)) {
    transfers.push(bucket.matrices.buffer);
    if (bucket.colors) transfers.push(bucket.colors.buffer);
  }
  return transfers;
}
