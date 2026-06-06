import { setup, tick, dispose } from "./scene";
import { applySettings } from "./settings";
import { updatePlayer } from "./player";
import type { ExperienceManifest } from "../types";

export const manifest: ExperienceManifest = {
  id: "car-drive",
  name: "Auto fahren",
  description: "Fahre ein Auto durch eine generierte Welt. Steuerung: WASD / Pfeiltasten, Leertaste bremsen, R zurücksetzen.",
  version: "0.1.0",
  author: "fun-branch",

  camera: { fov: 70, near: 0.1, far: 1500 },
  scene: {
    background: "#87ceeb",
    fogNear: 250,
    fogFar: 700,
    fogColor: "#a8ccee",
    ambientIntensity: 0.6,
    sunIntensity: 1.2,
    sunColor: "#fff8e0",
    sunPosition: { x: 80, y: 150, z: 60 },
  },
  spawn: { position: { x: 0, y: 5, z: 0 } },

  parameters: [
    {
      id: "engineForce",
      label: "Motorleistung",
      group: "Fahrzeug",
      type: "number",
      min: 500,
      max: 6000,
      default: 2800,
      step: 100,
      unit: "N",
    },
    {
      id: "cameraDistance",
      label: "Kamera-Abstand",
      group: "Kamera",
      type: "number",
      min: 5,
      max: 30,
      default: 12,
      step: 1,
      unit: "m",
    },
    {
      id: "cameraHeight",
      label: "Kamera-Höhe",
      group: "Kamera",
      type: "number",
      min: 1,
      max: 20,
      default: 5,
      step: 0.5,
      unit: "m",
    },
  ],

  interfaces: {
    orientation: false,
    speed: false,
  },

  world: {
    supported: true,
    defaultPresetId: "dry-steppe",
    requiredLayers: ["height"],
  },

  setup,
  tick,
  dispose,
  applySettings,
  updatePlayer,
};
