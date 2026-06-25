/**
 * Per-pixel biome classification + vegetation density.
 *
 * Classification is driven by the continuous fields (height, temperature,
 * moisture, slope, shore, water) rather than the macro WFC cells, so biome
 * boundaries are soft and follow terrain — no square macro borders. Vegetation
 * follows biome, moisture, slope and a tree line, with seamless world-space
 * noise variation.
 */
import { Biome, type ChunkData, type GenParams } from './mapTypes';
import { valueNoise2D } from './noise';

const VEG_BASE: number[] = (() => {
  const v = new Array<number>(14).fill(0);
  v[Biome.Forest] = 0.95;
  v[Biome.Taiga] = 0.7;
  v[Biome.Wetland] = 0.65;
  v[Biome.Grassland] = 0.5;
  v[Biome.Hills] = 0.42;
  v[Biome.Tundra] = 0.18;
  v[Biome.RockyMountain] = 0.12;
  v[Biome.Beach] = 0.06;
  v[Biome.Desert] = 0.05;
  v[Biome.SnowMountain] = 0.0;
  return v;
})();

export function classifyChunk(
  chunk: ChunkData,
  params: GenParams,
  originX: number,
  originY: number,
): void {
  const size = chunk.size;
  const wl = params.waterLevel;
  const { heightMap, moistureMap, temperatureMap, slopeMap, riverMap, lakeMap, shoreMap } = chunk;
  const vegSeed = (params.seed ^ 0x7e57) >>> 0;

  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const i = py * size + px;
      const h = heightMap[i];
      const m = moistureMap[i];
      const t = temperatureMap[i];
      const s = slopeMap[i];
      const shore = shoreMap[i];

      let b: Biome;
      if (lakeMap[i] > 0.12) b = Biome.Lake;
      else if (riverMap[i] > 0.18) b = Biome.River;
      else if (h < wl - 0.04) b = Biome.Ocean;
      else if (h < wl) b = Biome.Coast;
      else if (shore > 0.5 && h < wl + 0.012) b = Biome.Beach;
      else if (h > 0.83 && t < 0.45) b = Biome.SnowMountain;
      else if (h > 0.75) b = Biome.RockyMountain;
      else if (h > 0.62) b = t < 0.3 ? Biome.Taiga : Biome.Hills;
      else if (t < 0.22) b = Biome.Tundra;
      else if (m > 0.6 && h < wl + 0.08) b = Biome.Wetland;
      else if (m < 0.3 && t > 0.55) b = Biome.Desert;
      else if (m > 0.52) b = t < 0.35 ? Biome.Taiga : Biome.Forest;
      else b = Biome.Grassland;

      chunk.biomeMap[i] = b;

      // Vegetation.
      const wx = originX + px;
      const wy = originY + py;
      const variation = 0.6 + 0.4 * valueNoise2D(wx * 0.04, wy * 0.04, vegSeed);
      let veg = VEG_BASE[b] * (0.45 + m * 0.75) * (1 - s * 0.75) * variation;
      veg *= params.vegetationDensity;
      if (h > 0.78) veg *= Math.max(0, Math.min(1, (0.86 - h) / 0.1)); // tree line
      chunk.vegetationDensityMap[i] = Math.max(0, Math.min(1, veg));
    }
  }
}
