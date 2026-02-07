/**
 * Module Definition Types (simplified — no binding system)
 *
 * Each Module = ModuleDef (metadata + component ref) + Content component (Svelte).
 * Svelte handles reactivity via props + events — no JSON bindings needed.
 */

import type { Component, ComponentType } from "svelte";
import type { PortType } from "../graph/types";

// biome-ignore lint/suspicious/noExplicitAny: Svelte 5 supports both class + function components
export type AnyComponent = ComponentType | Component<any>;

/** Node variant for visual theming (sets --node-color) */
export type ModuleVariant = "input" | "process" | "trigger" | "logic" | "output";

/** Exposed port that appears as a SvelteFlow Handle */
export interface ExposedPort {
	id: string;
	label: string;
	side: "left" | "right";
	handleClass: string;
	position?: string;
	/** Semantic port type (default: "number") */
	portType?: PortType;
}

/** Complete module definition */
export interface ModuleDef {
	type: string;
	label: string;
	icon: AnyComponent;
	variant: ModuleVariant;
	component: AnyComponent;
	inputs: ExposedPort[];
	outputs: ExposedPort[];
	defaultData: Record<string, unknown>;
}
