/**
 * Shader Rack — Type Definitions
 *
 * Types for the GLSL parser that splits monolithic shader strings
 * into semantic modules (slots) for the Rack UI.
 */

import type { UniformDef } from "../types";

export type RackSlotType =
	| "header"
	| "uniforms"
	| "varyings"
	| "defines"
	| "function"
	| "main"
	| "custom";

export interface RackSlot {
	id: string;
	type: RackSlotType;
	title: string;
	code: string;
	enabled: boolean;
	collapsed: boolean;
	editable: boolean;
	lineOffset: number;
	tags: SlotTag[];
}

export interface SlotTag {
	label: string;
	variant: "system" | "endpoint" | "custom";
}

export interface ParsedSlotUniforms {
	system: string[];
	user: UniformDef[];
}
