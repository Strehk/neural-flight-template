import * as THREE from "three";
import type { ExperienceState } from "../types";
import type { BatEcholocationState } from "./scene";

export function applySettings(
  id: string,
  value: number | boolean | string,
  state: ExperienceState,
  scene: THREE.Scene,
): void {
  const s = state as BatEcholocationState;

  switch (id) {
    case "cruiseSpeed":
      s.player.cruiseSpeed = value as number;
      break;

    case "boostSpeed":
      s.player.boostSpeed = value as number;
      break;

    case "strafeSpeed":
      s.player.strafeSpeed = value as number;
      break;

    case "climbSpeed":
      s.player.climbSpeed = value as number;
      break;

    case "turnSpeed":
      s.player.turnSpeed = value as number;
      break;

    case "lookSmoothing":
      s.player.lookSmoothing = value as number;
      break;

    case "minAltitude":
      s.player.minAltitude = value as number;
      break;

    case "echoRange":
      s.echoSettings.range = value as number;
      break;

    case "echoSpeed":
      s.echoSettings.speed = value as number;
      break;

    case "echoCooldown":
      s.echoSettings.cooldown = value as number;
      break;

    case "autoPulseInterval":
      s.echoSettings.autoPulseInterval = value as number;
      s.nextAutoPulseAt =
        (value as number) > 0
          ? s.elapsedTime + (value as number) * 0.6
          : Infinity;
      break;

    case "revealDuration":
      s.echoSettings.revealDuration = value as number;
      break;

    case "revealIntensity":
      s.echoSettings.revealIntensity = value as number;
      s.worldSettings.revealIntensity = value as number;
      s.world.setSettings({ revealIntensity: value as number });
      break;

    case "wireThickness":
      s.echoSettings.wireThickness = value as number;
      s.worldSettings.wireThickness = value as number;
      s.world.setSettings({ wireThickness: value as number });
      break;

    case "audioPitchCurve":
      s.audioSettings.pitchCurve = value as number;
      s.audio.setSettings({ pitchCurve: value as number });
      break;

    case "audioDistanceVolume":
      s.audioSettings.distanceVolume = value as number;
      s.audio.setSettings({ distanceVolume: value as number });
      break;

    case "audioMaxLayers":
      s.audioSettings.maxLayers = value as number;
      s.audio.setSettings({ maxLayers: value as number });
      break;

    case "audioDensityComplexity":
      s.audioSettings.densityComplexity = value as number;
      s.audio.setSettings({ densityComplexity: value as number });
      break;

    case "audioDecay":
      s.audioSettings.decay = value as number;
      s.audio.setSettings({ decay: value as number });
      break;

    case "audioDroneIntensity":
      s.audioSettings.droneIntensity = value as number;
      s.audio.setSettings({ droneIntensity: value as number });
      break;

    case "audioMaterialInfluence":
      s.audioSettings.materialInfluence = value as number;
      s.audio.setSettings({ materialInfluence: value as number });
      break;

    case "audioStereoWidth":
      s.audioSettings.stereoWidth = value as number;
      s.audio.setSettings({ stereoWidth: value as number });
      break;

    case "audioMasterVolume":
      s.audioSettings.masterVolume = value as number;
      s.audio.setSettings({ masterVolume: value as number });
      break;

    case "biomeScale":
      s.worldSettings.biomeScale = value as number;
      s.world.setSettings({ biomeScale: value as number });
      s.world.rebuild();
      break;

    case "mountainHeight":
      s.worldSettings.mountainHeight = value as number;
      s.world.setSettings({ mountainHeight: value as number });
      s.world.rebuild();
      break;

    case "treeDensity":
      s.worldSettings.treeDensity = value as number;
      s.world.setSettings({ treeDensity: value as number });
      s.world.rebuild();
      break;

    case "grassDensity":
      s.worldSettings.grassDensity = value as number;
      s.world.setSettings({ grassDensity: value as number });
      s.world.rebuild();
      break;

    case "fogIntensity": {
      s.worldSettings.fogIntensity = value as number;
      s.world.setSettings({ fogIntensity: value as number });
      if (scene.fog instanceof THREE.Fog) {
        const far = THREE.MathUtils.lerp(240, 82, value as number);
        scene.fog.near = 16;
        scene.fog.far = far;
      }
      break;
    }

    case "baseVisibility":
      s.worldSettings.baseVisibility = value as number;
      s.world.setSettings({ baseVisibility: value as number });
      break;

    default:
      break;
  }
}
