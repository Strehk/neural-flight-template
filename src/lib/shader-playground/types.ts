/**
 * Shader Playground — Type Definitions
 *
 * Central types for the shader editor, renderer, uniforms, presets, and snippets.
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
	/** Exposed as node-editor endpoint (@endpoint annotation) */
	endpoint?: boolean;
	/** Render as color picker instead of sliders (vec3 only) */
	color?: boolean;
}

// ── Shader Errors ──

export interface ShaderError {
	line: number;
	message: string;
	raw: string;
	source?: "fragment" | "vertex";
}

// ── Shader Module (Save/Export format) ──

export interface ShaderModule {
	id: string;
	name: string;
	description: string;
	author: string;
	version: string;
	fragmentShader: string;
	vertexShader: string | null;
	uniforms: UniformDef[];
	geometry: GeometryType;
	tags: string[];
	presetId?: string;
}

// ── Presets ──

export interface PresetDef {
	id: string;
	name: string;
	psychEffect: string;
	description: string;
	scienceNote: string;
	fragmentShader: string;
	vertexShader: string | null;
	uniforms: UniformDef[];
	geometry: GeometryType;
	tutorial: {
		explore: string[];
		challenge: string;
		psychTip: string;
	};
	tags: string[];
	difficulty: 1 | 2 | 3;
}

// ── Snippets ──

export type SnippetCategory =
	| "noise"
	| "sdf"
	| "math"
	| "color"
	| "uv"
	| "animation"
	| "lighting"
	| "effects"
	| "modulation";

export interface ShaderSnippet {
	id: string;
	name: string;
	category: SnippetCategory;
	description: string;
	/** GLSL code to insert */
	code: string;
	/** Required uniforms (auto-added if missing) */
	requiredUniforms?: UniformDef[];
	/** Educational hint */
	hint?: string;
	/** Difficulty: 1=beginner, 2=intermediate, 3=advanced */
	difficulty: 1 | 2 | 3;
}

// ── Templates ──

export interface ShaderTemplate {
	id: string;
	name: string;
	description: string;
	fragmentShader: string;
	vertexShader: string | null;
}

// ── Renderer ──

export interface PlaygroundRenderer {
	canvas: HTMLCanvasElement;
	updateShader(fragment: string, vertex: string | null): ShaderError[];
	updateUniform(name: string, value: number | number[] | boolean): void;
	setGeometry(type: GeometryType): void;
	/** Enable/disable auto-rotation (OrbitControls autoRotate) */
	setRotation(enabled: boolean): void;
	/** Enable/disable scene lighting (system uniforms uLightDir/uLightIntensity/uAmbient) */
	setLighting(enabled: boolean): void;
	getTime(): number;
	/** Access current ShaderMaterial (for ModulationBridge) */
	getMaterial(): import("three").ShaderMaterial;
	/** Register a per-frame callback (called before render) */
	onTick(callback: ((dt: number) => void) | null): void;
	resize(): void;
	dispose(): void;
}
