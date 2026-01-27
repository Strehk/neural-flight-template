// Three.js
export { FlightPlayer } from "./three/player";
export { createFlightScene } from "./three/scene";
export { loadGLTF } from "./three/loader";
export { TerrainManager } from "./three/terrain/manager";
export { TerrainChunk } from "./three/terrain/chunk";
export { getHeight, DEFAULT_HEIGHTMAP } from "./three/terrain/heightmap";
export type { HeightmapConfig } from "./three/terrain/heightmap";
export { createTerrainGeometry } from "./three/terrain/geometry";
export { createChunkDecorations } from "./three/terrain/decorations";
export type { ChunkDecorations } from "./three/terrain/decorations";
export { createWater } from "./three/terrain/water";
export { createChunkRings, updateRings } from "./three/rings";
export type { RingState, ChunkRings } from "./three/rings";
export { createSky } from "./three/sky";
export { createClouds } from "./three/clouds";
export type {
	ControllerMessage,
	OrientationData,
	SpeedCommand,
} from "./types/orientation";
export type {
	ConnectionStatus,
	WebSocketClientOptions,
} from "./types/websocket";
// Client
export { createWebSocketClient } from "./ws/client.svelte";
