export interface UniformDef {
	name: string;
	type: "float" | "vec2" | "vec3" | "vec4" | "int" | "sampler2D";
	default: number | number[];
	min?: number;
	max?: number;
	label?: string;
}

export type ShaderCategory =
	| "noise"
	| "sdf"
	| "landscape"
	| "generative"
	| "lighting"
	| "abstract";

export interface ShaderDef {
	id: string;
	name: string;
	description: string;
	category: ShaderCategory;
	fragmentShader: string;
	vertexShader?: string;
	uniforms: UniformDef[];
	credits?: string;
	tags?: string[];
}
