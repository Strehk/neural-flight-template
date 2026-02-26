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

export type ModuleClass = "fixed" | "focus" | "main";

export const MODULE_CLASS: Record<RackSlotType, ModuleClass> = {
	header: "fixed",
	uniforms: "fixed",
	varyings: "fixed",
	defines: "fixed",
	function: "focus",
	main: "main",
	custom: "focus",
};

export interface RackSlot {
	id: string;
	type: RackSlotType;
	moduleClass: ModuleClass;
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

// ── Control Modules ──

export type ControlModuleType = "lfo" | "xy" | "slider" | "color";

export type Waveform = "sine" | "square" | "saw" | "triangle";

export interface LFOConfig {
	waveform: Waveform;
	rate: number;
	min: number;
	max: number;
}

export interface XYConfig {
	x: number;
	y: number;
	minX: number;
	maxX: number;
	minY: number;
	maxY: number;
}

export interface SliderConfig {
	value: number;
	min: number;
	max: number;
	step: number;
}

export interface ColorConfig {
	hex: string;
}

export type ControlConfig = LFOConfig | XYConfig | SliderConfig | ColorConfig;

export interface RackControlModule {
	id: string;
	type: ControlModuleType;
	title: string;
	targetUniform: string;
	enabled: boolean;
	collapsed: boolean;
	config: ControlConfig;
}
