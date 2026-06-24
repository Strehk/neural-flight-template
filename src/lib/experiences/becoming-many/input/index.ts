// ── Becoming Many — Input System ───────────────────────────────
//
// Public surface for the modular control system. Sources are interchangeable
// plugins behind one FlightIntent (see types.ts); the hub merges them (hub.ts).
//
//   Add a control:    hub.add(new MySource())
//   Swap / disable:   hub.remove("keyboard")
//   Reach a source:   hub.get("network")  // e.g. to feed updatePlayer data
//
// `createDefaultInput()` wires the three M1 controls in priority order:
//   network (5)  <  keyboard (10)  <  gamepad (20)
// i.e. a local controller/keyboard overrides incoming network orientation.

import type { AnyRenderer } from "../../types";
import { GamepadSource } from "./gamepad-source";
import { InputHub } from "./hub";
import { KeyboardSource } from "./keyboard-source";
import { NetworkSource } from "./network-source";

export { InputHub } from "./hub";
export { KeyboardSource } from "./keyboard-source";
export { GamepadSource } from "./gamepad-source";
export { NetworkSource } from "./network-source";
export type { FlightIntent, InputAction, InputSource } from "./types";
export { emptyIntent } from "./types";

/** Build the default M1 control stack: network + keyboard + gamepad/XR. */
export function createDefaultInput(renderer: AnyRenderer): InputHub {
	return new InputHub()
		.add(new NetworkSource())
		.add(new KeyboardSource())
		.add(new GamepadSource(renderer));
}
