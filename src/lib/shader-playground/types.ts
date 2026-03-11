/**
 * Shader Playground v3 — Type Definitions (TSL)
 *
 * Types for the TSL-based node material system.
 */

import type { MeshStandardNodeMaterial, Node } from "three/webgpu";

// ── Geometry ──

export type GeometryType = "plane" | "sphere" | "cube" | "torus" | "cylinder";

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
	applyNodes(colorNode: Node | null, positionNode: Node | null): void;
	updateUniform(name: string, value: number | number[] | boolean): void;
	setGeometry(type: GeometryType): void;
	setRotation(enabled: boolean): void;
	setLighting(enabled: boolean): void;
	getTime(): number;
	getMaterial(): MeshStandardNodeMaterial;
	onTick(callback: ((dt: number) => void) | null): void;
	resize(): void;
	dispose(): void;
}
