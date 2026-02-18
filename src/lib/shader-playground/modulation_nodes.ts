/**
 * Modulation Node Definitions — Types for SvelteFlow canvas nodes.
 *
 * Shader Node: central sink with dynamic @endpoint input ports.
 * Source Nodes: LFO, Envelope, Noise, Spring, Multiply — each with 1 output.
 */

import {
	Activity,
	TrendingUp,
	Zap,
	Anchor,
	X,
	Code,
} from "lucide-svelte";
import type { Component, ComponentType } from "svelte";
import type { SignalDef } from "$lib/node-editor/graph/types";
import { COMPONENT_LFO } from "$lib/node-editor/components/lfo";
import { COMPONENT_ENVELOPE } from "$lib/node-editor/components/envelope";
import { COMPONENT_NOISE } from "$lib/node-editor/components/noise";
import { COMPONENT_SPRING } from "$lib/node-editor/components/spring";
import { COMPONENT_MULTIPLY } from "$lib/node-editor/components/multiply";
import type { UniformDef } from "./types";

// biome-ignore lint/suspicious/noExplicitAny: Svelte 5 supports both class + function components
type AnyIcon = ComponentType | Component<any>;

// ── Source Node Definition ──

export interface ModSourceDef {
	type: string;
	label: string;
	icon: AnyIcon;
	outputPort: string;
	signal: SignalDef;
}

export const MOD_SOURCES: ModSourceDef[] = [
	{ type: "lfo", label: "LFO", icon: Activity, outputPort: "wave", signal: COMPONENT_LFO },
	{
		type: "envelope",
		label: "Envelope",
		icon: TrendingUp,
		outputPort: "envelope",
		signal: COMPONENT_ENVELOPE,
	},
	{ type: "noise", label: "Noise", icon: Zap, outputPort: "noise", signal: COMPONENT_NOISE },
	{ type: "spring", label: "Spring", icon: Anchor, outputPort: "position", signal: COMPONENT_SPRING },
	{ type: "multiply", label: "Multiply", icon: X, outputPort: "out", signal: COMPONENT_MULTIPLY },
];

export function getModSource(type: string): ModSourceDef | undefined {
	return MOD_SOURCES.find((s) => s.type === type);
}

// ── Shader Node (dynamic from @endpoint uniforms) ──

export interface ShaderNodePort {
	id: string;
	label: string;
}

export interface ShaderNodeDef {
	type: "shader-code";
	label: string;
	icon: AnyIcon;
	inputs: ShaderNodePort[];
}

export function createShaderNodeDef(
	endpoints: UniformDef[],
	label = "Shader",
): ShaderNodeDef {
	return {
		type: "shader-code",
		label,
		icon: Code,
		inputs: endpoints.map((ep) => ({
			id: ep.name,
			label: ep.label ?? ep.name,
		})),
	};
}
