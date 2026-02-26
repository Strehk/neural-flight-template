/**
 * Shader Playground v2 — Type Definitions
 *
 * Trimmed types for the signal-based module system.
 */

// ── Geometry ──

export type GeometryType = "plane" | "sphere" | "cube" | "torus" | "cylinder";

// ── Uniforms ──

export type UniformType =
	| "float"
	| "vec2"
	| "vec3"
	| "vec4"
	| "int"
	| "bool"
	| "sampler2D";

export interface UniformDef {
	name: string;
	type: UniformType;
	value: number | number[] | boolean;
	min?: number;
	max?: number;
	step?: number;
	label?: string;
}

// ── Shader Errors ──

export interface ShaderError {
	line: number;
	message: string;
	raw: string;
	source?: "fragment" | "vertex";
}

// ── Renderer ──

export interface PlaygroundRenderer {
	canvas: HTMLCanvasElement;
	updateShader(fragment: string, vertex: string | null): ShaderError[];
	updateUniform(name: string, value: number | number[] | boolean): void;
	setGeometry(type: GeometryType): void;
	setRotation(enabled: boolean): void;
	setLighting(enabled: boolean): void;
	getTime(): number;
	getMaterial(): import("three").ShaderMaterial;
	onTick(callback: ((dt: number) => void) | null): void;
	resize(): void;
	dispose(): void;
}
