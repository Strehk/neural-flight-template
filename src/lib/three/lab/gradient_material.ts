/**
 * TSL Gradient Material — N-stop gradient via MeshBasicNodeMaterial.
 *
 * Uses nStopGradient from $lib/tsl for chained mix/smoothstep interpolation.
 * Supports directional (x, y) and radial gradients.
 */

import { length, uv, vec3 } from "three/tsl";
import * as THREE from "three/webgpu";
import { nStopGradient } from "$lib/tsl";

export interface GradientConfig {
	colors: THREE.Color[];
	direction?: "x" | "y" | "radial";
	opacity?: number;
	transparent?: boolean;
	side?: THREE.Side;
}

function buildGradientFactor(direction: "x" | "y" | "radial"): THREE.Node {
	switch (direction) {
		case "x":
			return uv().x;
		case "radial":
			return length(uv().sub(0.5)).mul(2.0);
		default:
			return uv().y;
	}
}

export function createGradientMaterial(
	config: GradientConfig,
): THREE.MeshBasicNodeMaterial {
	const direction = config.direction ?? "y";
	const opacity = config.opacity ?? 1.0;
	const transparent = config.transparent ?? false;

	if (config.colors.length === 0) {
		throw new Error("GradientConfig.colors must have at least 1 color");
	}

	const colorNodes = config.colors.map((c) => vec3(c.r, c.g, c.b));
	const factor = buildGradientFactor(direction);

	const mat = new THREE.MeshBasicNodeMaterial();
	mat.colorNode = nStopGradient(colorNodes, factor);
	mat.transparent = transparent;
	mat.opacity = opacity;
	mat.side = config.side ?? THREE.FrontSide;
	mat.toneMapped = false;

	return mat;
}
