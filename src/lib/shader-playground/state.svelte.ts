/**
 * Shader Rack State — Reactive store for the signal-based module system.
 *
 * Modules are the single source of truth.
 * GLSL is derived via codegen. Renderer receives updates via effects.
 */

import { assembleGlsl, type CodegenResult } from "./codegen";
import { MODULE_REGISTRY } from "./modules/registry";
import type { RackModuleInstance, RackModuleType } from "./modules/types";
import type { GeometryType, PlaygroundRenderer, ShaderError } from "./types";

// ── ID Generator ──

function generateId(): string {
	return crypto.randomUUID().slice(0, 8);
}

// ── Factory ──

export interface ShaderRackState {
	// Reactive state (read)
	readonly modules: RackModuleInstance[];
	readonly generatedGlsl: string;
	readonly errors: ShaderError[];
	readonly currentGeometry: GeometryType;
	readonly rotationEnabled: boolean;
	readonly lightingEnabled: boolean;
	readonly isFullscreen: boolean;
	readonly compileOk: boolean;

	// Actions
	addModule(type: RackModuleType): void;
	removeModule(id: string): void;
	duplicateModule(id: string): void;
	toggleEnabled(id: string): void;
	toggleCollapsed(id: string): void;
	updateParam(moduleId: string, paramName: string, value: number): void;
	reorder(fromIndex: number, toIndex: number): void;
	setGeometry(type: GeometryType): void;
	toggleRotation(): void;
	toggleLighting(): void;
	toggleFullscreen(): void;
	initRenderer(renderer: PlaygroundRenderer): void;
	dispose(): void;
}

export function createShaderRackState(): ShaderRackState {
	let modules = $state<RackModuleInstance[]>([]);
	let errors = $state<ShaderError[]>([]);
	let currentGeometry = $state<GeometryType>("sphere");
	let rotationEnabled = $state(true);
	let lightingEnabled = $state(true);
	let isFullscreen = $state(false);
	let renderer: PlaygroundRenderer | null = null;

	// Derived: codegen result from current modules
	const codegenResult: CodegenResult = $derived(assembleGlsl(modules));
	const generatedGlsl: string = $derived(codegenResult.glsl);
	const compileOk: boolean = $derived(errors.length === 0);

	// ── Module CRUD ──

	function addModule(type: RackModuleType): void {
		const def = MODULE_REGISTRY.get(type);
		if (!def) return;

		const instance: RackModuleInstance = {
			id: generateId(),
			type,
			label: def.label,
			enabled: true,
			collapsed: false,
			order: modules.length,
			params: { ...def.defaultParams },
		};

		modules = [...modules, instance];
		syncToRenderer();
	}

	function removeModule(id: string): void {
		modules = modules
			.filter((m) => m.id !== id)
			.map((m, i) => ({ ...m, order: i }));
		syncToRenderer();
	}

	function duplicateModule(id: string): void {
		const source = modules.find((m) => m.id === id);
		if (!source) return;

		const clone: RackModuleInstance = {
			...source,
			id: generateId(),
			label: `${source.label} (copy)`,
			order: source.order + 1,
		};

		const updated = [...modules];
		updated.splice(source.order + 1, 0, clone);
		modules = updated.map((m, i) => ({ ...m, order: i }));
		syncToRenderer();
	}

	function toggleEnabled(id: string): void {
		modules = modules.map((m) =>
			m.id === id ? { ...m, enabled: !m.enabled } : m,
		);
		syncToRenderer();
	}

	function toggleCollapsed(id: string): void {
		modules = modules.map((m) =>
			m.id === id ? { ...m, collapsed: !m.collapsed } : m,
		);
	}

	function updateParam(
		moduleId: string,
		paramName: string,
		value: number,
	): void {
		// Update uniform directly on renderer for real-time feedback
		const uName = `u_${moduleId}_${paramName}`;
		renderer?.updateUniform(uName, value);

		// Update state (triggers codegen re-derive)
		modules = modules.map((m) =>
			m.id === moduleId
				? { ...m, params: { ...m.params, [paramName]: value } }
				: m,
		);
	}

	function reorder(fromIndex: number, toIndex: number): void {
		if (fromIndex === toIndex) return;
		const updated = [...modules];
		const [moved] = updated.splice(fromIndex, 1);
		updated.splice(toIndex, 0, moved);
		modules = updated.map((m, i) => ({ ...m, order: i }));
		syncToRenderer();
	}

	// ── Scene Controls ──

	function setGeometry(type: GeometryType): void {
		currentGeometry = type;
		renderer?.setGeometry(type);
	}

	function toggleRotation(): void {
		rotationEnabled = !rotationEnabled;
		renderer?.setRotation(rotationEnabled);
	}

	function toggleLighting(): void {
		lightingEnabled = !lightingEnabled;
		renderer?.setLighting(lightingEnabled);
	}

	function toggleFullscreen(): void {
		isFullscreen = !isFullscreen;
	}

	// ── Renderer Bridge ──

	function initRenderer(r: PlaygroundRenderer): void {
		renderer = r;
		syncToRenderer();
	}

	function syncToRenderer(): void {
		if (!renderer) return;

		const result = assembleGlsl(modules);
		const compileErrors = renderer.updateShader(result.glsl, null);
		errors = compileErrors;

		if (compileErrors.length === 0) {
			// Push all module uniforms
			for (const u of result.uniforms) {
				renderer.updateUniform(u.name, u.value);
			}
		}
	}

	function dispose(): void {
		renderer?.dispose();
		renderer = null;
	}

	return {
		get modules() { return modules; },
		get generatedGlsl() { return generatedGlsl; },
		get errors() { return errors; },
		get currentGeometry() { return currentGeometry; },
		get rotationEnabled() { return rotationEnabled; },
		get lightingEnabled() { return lightingEnabled; },
		get isFullscreen() { return isFullscreen; },
		get compileOk() { return compileOk; },

		addModule,
		removeModule,
		duplicateModule,
		toggleEnabled,
		toggleCollapsed,
		updateParam,
		reorder,
		setGeometry,
		toggleRotation,
		toggleLighting,
		toggleFullscreen,
		initRenderer,
		dispose,
	};
}
