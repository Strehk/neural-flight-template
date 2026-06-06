import type * as THREE from "three";
import type { ExperienceState } from "../types";
import { rebuildHexFloor } from "./hex-floor";
import type { VisioTechnologicaState } from "./scene";
import { rebuildZonedTiles } from "./zoned-tiles";

export function applySettings(
  id: string,
  value: number | boolean | string,
  state: ExperienceState,
  scene: THREE.Scene,
): void {
  const s = state as VisioTechnologicaState;

  switch (id) {
    case "tileSize":
      s.tileSize = value as number;
      rebuildHexFloor(s, scene);
      rebuildZonedTiles(s, scene);
      break;

    case "tileGap":
      s.tileGap = value as number;
      rebuildHexFloor(s, scene);
      rebuildZonedTiles(s, scene);
      break;

    case "tileHeight":
      s.tileHeight = value as number;
      rebuildHexFloor(s, scene);
      rebuildZonedTiles(s, scene);
      break;

    case "floorColor":
      s.floorColor = value as string;
      s.tileMaterial.color.set(s.floorColor);
      break;

    default:
      break;
  }
}
