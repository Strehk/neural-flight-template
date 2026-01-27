import * as THREE from "three";
import { getHeight, type HeightmapConfig } from "./heightmap";
import { TERRAIN, TERRAIN_COLORS } from "$lib/config/flight";

const COLOR_GRASS = new THREE.Color(TERRAIN_COLORS.GRASS);
const COLOR_YELLOW = new THREE.Color(TERRAIN_COLORS.YELLOW);
const COLOR_ORANGE = new THREE.Color(TERRAIN_COLORS.ORANGE);
const COLOR_ROCK = new THREE.Color(TERRAIN_COLORS.ROCK);
const COLOR_SNOW = new THREE.Color(TERRAIN_COLORS.SNOW);

const [BAND_1, BAND_2, BAND_3, BAND_4] = TERRAIN_COLORS.BANDS;

function heightColor(y: number, temp: THREE.Color): THREE.Color {
	if (y < BAND_1) return temp.copy(COLOR_GRASS);
	if (y < BAND_2) return temp.copy(COLOR_GRASS).lerp(COLOR_YELLOW, (y - BAND_1) / (BAND_2 - BAND_1));
	if (y < BAND_3) return temp.copy(COLOR_YELLOW).lerp(COLOR_ORANGE, (y - BAND_2) / (BAND_3 - BAND_2));
	if (y < BAND_4) return temp.copy(COLOR_ORANGE).lerp(COLOR_ROCK, (y - BAND_3) / (BAND_4 - BAND_3));
	return temp.copy(COLOR_ROCK).lerp(COLOR_SNOW, Math.min((y - BAND_4) / 15, 1));
}

/**
 * Create a terrain chunk BufferGeometry with heightmap displacement and vertex colors.
 *
 * @param chunkX - Chunk grid X index (world offset = chunkX * size)
 * @param chunkZ - Chunk grid Z index (world offset = chunkZ * size)
 * @param size - World size of the chunk (also segment count = size)
 * @param config - Heightmap noise parameters
 */
export function createTerrainGeometry(
	chunkX: number,
	chunkZ: number,
	size: number,
	config: HeightmapConfig,
): THREE.BufferGeometry {
	const geo = new THREE.PlaneGeometry(size, size, TERRAIN.SEGMENTS, TERRAIN.SEGMENTS);
	geo.rotateX(-Math.PI / 2);

	const pos = geo.attributes.position;
	const colors = new Float32Array(pos.count * 3);
	const temp = new THREE.Color();
	const worldOffsetX = chunkX * size;
	const worldOffsetZ = chunkZ * size;

	for (let i = 0; i < pos.count; i++) {
		const wx = pos.getX(i) + worldOffsetX;
		const wz = pos.getZ(i) + worldOffsetZ;
		const h = getHeight(wx, wz, config);
		pos.setY(i, h);

		heightColor(h, temp);
		colors[i * 3] = temp.r;
		colors[i * 3 + 1] = temp.g;
		colors[i * 3 + 2] = temp.b;
	}

	geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
	geo.computeVertexNormals();

	return geo;
}
