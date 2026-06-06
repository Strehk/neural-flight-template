import type { ExperienceState } from "../types";
import type { CarDriveState } from "./scene";
import type { Scene } from "three";

export function applySettings(
  id: string,
  value: number | boolean | string,
  state: ExperienceState,
  _scene: Scene,
): void {
  const s = state as CarDriveState;
  switch (id) {
    case "engineForce":
      s.engineForce = value as number;
      break;
    case "cameraDistance":
      s.cameraDistance = value as number;
      break;
    case "cameraHeight":
      s.cameraHeight = value as number;
      break;
  }
}
