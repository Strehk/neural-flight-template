/**
 * Shader Playground Store — localStorage persistence + JSON export/import.
 */

import type { ShaderModule } from "./types";

const STORAGE_KEY = "shader-playground-modules";

/** Generate a random 8-char hex ID */
export function generateId(): string {
	const bytes = new Uint8Array(4);
	crypto.getRandomValues(bytes);
	return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Save a shader module to localStorage */
export function saveModule(module: ShaderModule): void {
	const modules = loadModules();
	const idx = modules.findIndex((m) => m.id === module.id);
	if (idx >= 0) {
		modules[idx] = module;
	} else {
		modules.push(module);
	}
	localStorage.setItem(STORAGE_KEY, JSON.stringify(modules));
}

/** Load all saved shader modules from localStorage */
export function loadModules(): ShaderModule[] {
	const raw = localStorage.getItem(STORAGE_KEY);
	if (!raw) return [];
	try {
		return JSON.parse(raw) as ShaderModule[];
	} catch {
		return [];
	}
}

/** Delete a shader module by ID */
export function deleteModule(id: string): void {
	const modules = loadModules().filter((m) => m.id !== id);
	localStorage.setItem(STORAGE_KEY, JSON.stringify(modules));
}

/** Export a module as JSON string */
export function exportModuleJSON(module: ShaderModule): string {
	return JSON.stringify(module, null, 2);
}

/** Import a module from JSON string */
export function importModuleJSON(json: string): ShaderModule | null {
	try {
		const parsed = JSON.parse(json) as ShaderModule;
		if (!parsed.id || !parsed.fragmentShader) return null;
		return parsed;
	} catch {
		return null;
	}
}
