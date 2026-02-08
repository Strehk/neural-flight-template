/**
 * Port Type Utilities — Lookup + Compatibility
 *
 * Checks whether two port types can be connected.
 * TODO: resolvePortType() needs rebuild after new NodeDef system is in place.
 */

import type { PortType } from "../graph/types";

/**
 * Check if two port types are compatible.
 *
 * All types cross-compatible (number ↔ trigger).
 * Add restrictions here when new types (e.g. audio, compound) need them.
 */
export function arePortTypesCompatible(
	_sourceType: PortType,
	_targetType: PortType,
): boolean {
	return true;
}
