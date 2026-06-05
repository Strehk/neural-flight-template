import type { BatFlightController } from "./flight-controller";
import type { VisionModeId } from "./vision-modes";

const PITCH_CLIMB    = -15;  // W: nose up → ascend
const PITCH_DESCEND  =  28;  // S: nose down → descend (no reverse)
const ROLL_AMOUNT    =  40;  // A / D: roll → turn
const BOOST_FACTOR   =   3;  // Space: 3× speed multiplier

const FWD   = ["KeyW"];
const BWD   = ["KeyS"];
const LEFT  = ["KeyA"];
const RIGHT = ["KeyD"];
const FLIGHT_KEYS = [...FWD, ...BWD, ...LEFT, ...RIGHT, "Space"];
const NEXT_BIOME_KEYS = ["ArrowRight", "ArrowUp"];
const PREV_BIOME_KEYS = ["ArrowLeft", "ArrowDown"];
const BIOME_KEYS = [...NEXT_BIOME_KEYS, ...PREV_BIOME_KEYS];

const MODE_KEYS: Record<string, VisionModeId> = {
  Digit1: "luft",
  Digit2: "echoLocation",
  Digit3: "infrarot",
  Digit4: "duft",
  Digit5: "netzwerk",
  Digit6: "depthDebug",
  Digit7: "normal",
};

export class KeyboardInput {
  private readonly keys = new Set<string>();
  private pendingMode: VisionModeId | null = null;
  private pendingBiomeDelta = 0;
  private pendingInvertToggle = false;
  private pendingMinimapToggle = false;
  private readonly onDown: (e: KeyboardEvent) => void;
  private readonly onUp: (e: KeyboardEvent) => void;

  constructor() {
    this.onDown = (e) => {
      if (FLIGHT_KEYS.includes(e.code)) this.keys.add(e.code);
      if (e.code in MODE_KEYS && !e.repeat) this.pendingMode = MODE_KEYS[e.code];
      if (e.code === "KeyI" && !e.repeat) {
        this.pendingInvertToggle = true;
      }
      if (e.code === "KeyM" && !e.repeat) {
        this.pendingMinimapToggle = true;
      }
      if (BIOME_KEYS.includes(e.code) && !e.repeat) {
        e.preventDefault();
        this.pendingBiomeDelta += NEXT_BIOME_KEYS.includes(e.code) ? 1 : -1;
      }
    };
    this.onUp = (e) => this.keys.delete(e.code);
    window.addEventListener("keydown", this.onDown);
    window.addEventListener("keyup",   this.onUp);
  }

  /** Returns a requested mode switch and clears it (edge-triggered, consume-once). */
  consumePendingMode(): VisionModeId | null {
    const m = this.pendingMode;
    this.pendingMode = null;
    return m;
  }

  /** Returns whether global color inversion was toggled this frame. */
  consumeInvertToggle(): boolean {
    const pending = this.pendingInvertToggle;
    this.pendingInvertToggle = false;
    return pending;
  }

  /** Returns whether the minimap was toggled this frame. */
  consumeMinimapToggle(): boolean {
    const pending = this.pendingMinimapToggle;
    this.pendingMinimapToggle = false;
    return pending;
  }

  /** Returns a requested biome cycle step and clears it (edge-triggered). */
  consumePendingBiomeDelta(): number {
    const delta = this.pendingBiomeDelta;
    this.pendingBiomeDelta = 0;
    return delta;
  }

  get anyFlightActive(): boolean {
    return FLIGHT_KEYS.some((k) => this.keys.has(k));
  }

  /** Call once per tick before controller.tick(). Applies orientation, speed, and boost. */
  applyTo(controller: BatFlightController): void {
    const boost = this.keys.has("Space");
    controller.speedMultiplier = boost ? BOOST_FACTOR : 1;

    if (!this.anyFlightActive) return;

    const fwd   = FWD.some((k)  => this.keys.has(k));
    const back  = BWD.some((k)  => this.keys.has(k));
    const left  = LEFT.some((k) => this.keys.has(k));
    const right = RIGHT.some((k) => this.keys.has(k));

    const pitch = fwd ? PITCH_CLIMB : back ? PITCH_DESCEND : 0;
    const roll  = (left ? -ROLL_AMOUNT : 0) + (right ? ROLL_AMOUNT : 0);

    controller.setOrientation(pitch, roll);
    controller.setSpeed(fwd, false); // S only descends, never reverses
  }

  dispose(): void {
    window.removeEventListener("keydown", this.onDown);
    window.removeEventListener("keyup",   this.onUp);
    this.keys.clear();
  }
}
