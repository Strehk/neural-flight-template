/**
 * Module Registry — Maps module types to their definitions
 */

import type { ModuleDef } from "./types";

const moduleRegistry = new Map<string, ModuleDef>();

export function registerModule(def: ModuleDef): void {
	moduleRegistry.set(def.type, def);
}

export function getModule(type: string): ModuleDef | undefined {
	return moduleRegistry.get(type);
}

export function getAllModules(): ModuleDef[] {
	return Array.from(moduleRegistry.values());
}
