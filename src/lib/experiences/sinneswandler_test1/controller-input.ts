import * as THREE from "three";
import type { BatFlightController } from "./flight-controller";
import { MODE_SEQUENCE, type VisionModeId } from "./vision-modes";

// Match keyboard constants from keyboard-input.ts
const PITCH_CLIMB   = 15;   // degrees, nose up (ry < 0)
const PITCH_DESCEND = 28;   // degrees, nose down (ry > 0)
const ROLL_MAX      = 40;   // degrees
const BOOST_THRESHOLD = 0.5;
const DEADZONE = 0.15;

function applyDeadzone(v: number, dz: number): number {
  if (Math.abs(v) < dz) return 0;
  return (v - Math.sign(v) * dz) / (1 - dz);
}

/**
 * Find left/right gamepads from the active WebXR session (primary) or
 * navigator.getGamepads() (desktop fallback).
 */
function findGamepads(
  renderer: THREE.WebGLRenderer | null,
): { left: Gamepad | null; right: Gamepad | null } {
  // WebXR path — use inputSources which are always fresh inside a session
  const session = renderer?.xr?.getSession?.() ?? null;
  if (session) {
    let left: Gamepad | null = null;
    let right: Gamepad | null = null;
    for (const source of session.inputSources) {
      if (!source.gamepad) continue;
      if (source.handedness === "right") right = source.gamepad;
      else if (source.handedness === "left") left = source.gamepad;
    }
    if (left || right) return { left, right };
  }

  // Desktop fallback — parse handedness from controller ID string
  let left: Gamepad | null = null;
  let right: Gamepad | null = null;
  const all: Gamepad[] = [];

  for (const gp of navigator.getGamepads()) {
    if (!gp) continue;
    all.push(gp);
    const id = gp.id.toLowerCase();
    if (id.includes("right"))      right = gp;
    else if (id.includes("left"))  left  = gp;
  }

  if (!right && !left) {
    left  = all[0] ?? null;
    right = all[1] ?? all[0] ?? null;
  } else if (!right) {
    right = all.find(g => g !== left) ?? null;
  } else if (!left) {
    left  = all.find(g => g !== right) ?? null;
  }

  return { left, right };
}

/**
 * Meta Quest controller input. Runs after KeyboardInput.applyTo() so it
 * overrides keyboard when a gamepad is connected.
 *
 * Right controller:
 *   Thumbstick (axes[2/3]) → roll + pitch (analog)
 *   Trigger    (buttons[0]) → boost (3×)
 *   A button   (buttons[4]) → next vision mode
 *   B button   (buttons[5]) → previous vision mode
 *   Thumbstick click (buttons[3]) → invert toggle
 *
 * Left controller:
 *   Trigger (buttons[0]) → boost (alternative)
 */
export class ControllerInput {
  /** Keep in sync with SenseSwitchManager.currentMode each tick. */
  currentMode: VisionModeId = "luft";

  private renderer: THREE.WebGLRenderer | null = null;
  private pendingMode: VisionModeId | null = null;
  private pendingInvert = false;

  private prevA     = false;
  private prevB     = false;
  private prevThumb = false;

  setRenderer(renderer: THREE.WebGLRenderer): void {
    this.renderer = renderer;
  }

  consumePendingMode(): VisionModeId | null {
    const m = this.pendingMode;
    this.pendingMode = null;
    return m;
  }

  consumeInvertToggle(): boolean {
    const v = this.pendingInvert;
    this.pendingInvert = false;
    return v;
  }

  consumePendingBiomeDelta(): number { return 0; }

  /**
   * Call once per tick, after KeyboardInput.applyTo(). When a gamepad is
   * present it fully overrides keyboard orientation and speed.
   */
  applyTo(controller: BatFlightController): void {
    const { left, right } = findGamepads(this.renderer);
    if (!left && !right) return;

    // ── Speed / boost ─────────────────────────────────────────────────────
    const rTrigger = right?.buttons[0]?.value ?? 0;
    const lTrigger = left?.buttons[0]?.value  ?? 0;
    controller.speedMultiplier =
      rTrigger > BOOST_THRESHOLD || lTrigger > BOOST_THRESHOLD ? 3 : 1;
    controller.setSpeed(false, false);

    // ── Orientation (right thumbstick) ────────────────────────────────────
    const rx = applyDeadzone(right?.axes[2] ?? 0, DEADZONE);
    const ry = applyDeadzone(right?.axes[3] ?? 0, DEADZONE);
    // Pitch is asymmetric: climbing uses a shallower angle than diving.
    const pitch = ry < 0 ? ry * PITCH_CLIMB : ry * PITCH_DESCEND;
    controller.setOrientation(pitch, rx * ROLL_MAX);

    // ── Mode cycling (edge-triggered) ─────────────────────────────────────
    const aPressed = right?.buttons[4]?.pressed ?? false;
    if (aPressed && !this.prevA) {
      const idx = (MODE_SEQUENCE.indexOf(this.currentMode) + 1) % MODE_SEQUENCE.length;
      this.currentMode = MODE_SEQUENCE[idx];
      this.pendingMode = this.currentMode;
    }
    this.prevA = aPressed;

    const bPressed = right?.buttons[5]?.pressed ?? false;
    if (bPressed && !this.prevB) {
      const idx =
        (MODE_SEQUENCE.indexOf(this.currentMode) - 1 + MODE_SEQUENCE.length) %
        MODE_SEQUENCE.length;
      this.currentMode = MODE_SEQUENCE[idx];
      this.pendingMode = this.currentMode;
    }
    this.prevB = bPressed;

    // ── Invert toggle (right thumbstick click) ────────────────────────────
    const thumbPressed = right?.buttons[3]?.pressed ?? false;
    if (thumbPressed && !this.prevThumb) this.pendingInvert = true;
    this.prevThumb = thumbPressed;
  }

  dispose(): void { /* no listeners to remove */ }
}
