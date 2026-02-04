import type { Node, Edge } from "@xyflow/svelte";

/**
 * Node classes for CSS styling
 * - node-server: Central hub (bold)
 * - node-input: Data sources (ESP32, Gyro)
 * - node-output: Data consumers (VR, Spectator, Lights)
 */
export type NodeClass = "node-server" | "node-input" | "node-output";

/**
 * Typed node data for architecture diagram
 * Extends Record<string, unknown> for Svelte Flow compatibility
 */
export interface ArchitectureNodeData extends Record<string, unknown> {
	label: string;
}

// Re-export for convenience
export type { Node, Edge };
