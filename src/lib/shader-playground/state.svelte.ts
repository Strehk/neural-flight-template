/**
 * Shader Rack State v4 — TSL-based reactive store with modulation routing.
 *
 * Modules + modulation routes are the single source of truth.
 * composeTslNodes() produces colorNode + positionNode.
 * UniformRefs from codegen enable direct param updates (ref.value = x).
 *
 * v4: TSL node composition, direct uniform refs, scene lights for lighting.
 */

import { composeTslNodes, type TslCodegenResult } from "./codegen";
import { computeControlOutput } from "./control-engine";
import { MODULE_REGISTRY } from "./modules/registry";
import type {
	ModulationRoute,
	RackModuleInstance,
	RackModuleType,
} from "./modules/types";
import { getStage } from "./modules/types";
import type { GeometryType, PlaygroundRenderer, ShaderError } from "./types";

// ── ID Generator ──

function generateId(): string {
	return crypto.randomUUID().slice(0, 8);
}

// ── Factory ──

export interface ShaderRackState {
	// Reactive state (read)
	readonly modules: RackModuleInstance[];
	readonly modulationRoutes: ModulationRoute[];
	readonly errors: ShaderError[];
	readonly currentGeometry: GeometryType;
	readonly rotationEnabled: boolean;
	readonly lightingEnabled: boolean;
	readonly isFullscreen: boolean;
	readonly compileOk: boolean;
	readonly moduleDescriptions: Map<string, string>;
	/** Live modulated values: key = "targetModuleId:targetParam", value = modulated number */
	readonly liveModValues: Map<string, number>;

	// Module actions
	addModule(type: RackModuleType): void;
	removeModule(id: string): void;
	duplicateModule(id: string): void;
	toggleEnabled(id: string): void;
	toggleCollapsed(id: string): void;
	toggleCodeExpanded(id: string): void;
	updateParam(moduleId: string, paramName: string, value: number): void;
	reorder(fromIndex: number, toIndex: number): void;

	// Modulation actions
	addModulationRoute(
		sourceModuleId: string,
		targetModuleId: string,
		targetParam: string,
	): void;
	removeModulationRoute(routeId: string): void;
	updateModulationDepth(routeId: string, depth: number): void;

	// Scene controls
	setGeometry(type: GeometryType): void;
	toggleRotation(): void;
	toggleLighting(): void;
	toggleFullscreen(): void;
	initRenderer(renderer: PlaygroundRenderer): void;
	dispose(): void;
}

export function createShaderRackState(): ShaderRackState {
	let modules = $state<RackModuleInstance[]>([]);
	let modulationRoutes = $state<ModulationRoute[]>([]);
	let errors = $state<ShaderError[]>([]);
	let currentGeometry = $state<GeometryType>("sphere");
	let rotationEnabled = $state(true);
	let lightingEnabled = $state(true);
	let isFullscreen = $state(false);
	let liveModValues = $state<Map<string, number>>(new Map());
	let renderer: PlaygroundRenderer | null = null;

	// Current codegen result (holds live uniform refs)
	let currentResult = $state<TslCodegenResult | null>(null);

	const compileOk: boolean = $derived(errors.length === 0);
	const moduleDescriptions: Map<string, string> = $derived(
		currentResult?.moduleDescriptions ?? new Map(),
	);

	// ── onTick: CPU-side control engine ──

	function onTick(): void {
		if (!renderer || !currentResult || modulationRoutes.length === 0) return;

		const time = renderer.getTime();
		const nextLive = new Map<string, number>();

		for (const route of modulationRoutes) {
			const sourceMod = modules.find((m) => m.id === route.sourceModuleId);
			const targetMod = modules.find((m) => m.id === route.targetModuleId);
			if (!sourceMod || !targetMod || !sourceMod.enabled || !targetMod.enabled)
				continue;

			// Compute CPU-side control output
			const controlOutput = computeControlOutput(sourceMod, time);

			// Set source output uniform directly
			const sourceRef = currentResult.uniformRefs.get(
				`${sourceMod.id}:__output`,
			);
			if (sourceRef) {
				sourceRef.value = controlOutput;
			}

			// Compute modulated value for UI overlay (range-scaled)
			const baseValue = targetMod.params[route.targetParam] ?? 0;
			const targetDef = MODULE_REGISTRY.get(targetMod.type);
			const range = targetDef?.paramRanges?.[route.targetParam];
			const rangeSize = range ? range.max - range.min : 1;
			const modulatedValue =
				baseValue + controlOutput * route.depth * rangeSize;
			nextLive.set(
				`${route.targetModuleId}:${route.targetParam}`,
				modulatedValue,
			);
		}

		liveModValues = nextLive;
	}

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
			codeExpanded: false,
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
		modulationRoutes = modulationRoutes.filter(
			(r) => r.sourceModuleId !== id && r.targetModuleId !== id,
		);
		syncToRenderer();
	}

	function duplicateModule(id: string): void {
		const source = modules.find((m) => m.id === id);
		if (!source) return;

		const clone: RackModuleInstance = {
			...source,
			id: generateId(),
			label: `${source.label} (copy)`,
			codeExpanded: false,
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

	function toggleCodeExpanded(id: string): void {
		modules = modules.map((m) =>
			m.id === id ? { ...m, codeExpanded: !m.codeExpanded } : m,
		);
	}

	function updateParam(
		moduleId: string,
		paramName: string,
		value: number,
	): void {
		// Direct uniform update via TSL ref (no name mapping needed)
		const ref = currentResult?.uniformRefs.get(`${moduleId}:${paramName}`);
		if (ref) {
			ref.value = value;
		}

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

	// ── Modulation CRUD ──

	function addModulationRoute(
		sourceModuleId: string,
		targetModuleId: string,
		targetParam: string,
	): void {
		modulationRoutes = modulationRoutes.filter(
			(r) =>
				!(r.targetModuleId === targetModuleId && r.targetParam === targetParam),
		);

		const route: ModulationRoute = {
			id: generateId(),
			sourceModuleId,
			targetModuleId,
			targetParam,
			depth: 1.0,
		};

		modulationRoutes = [...modulationRoutes, route];
		syncToRenderer();
	}

	function removeModulationRoute(routeId: string): void {
		modulationRoutes = modulationRoutes.filter((r) => r.id !== routeId);
		syncToRenderer();
	}

	function updateModulationDepth(routeId: string, depth: number): void {
		// Direct depth uniform update
		const depthRef = currentResult?.uniformRefs.get(`__mod_depth:${routeId}`);
		if (depthRef) {
			depthRef.value = depth;
		}

		modulationRoutes = modulationRoutes.map((r) =>
			r.id === routeId ? { ...r, depth } : r,
		);
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
		renderer.onTick(() => onTick());
		syncToRenderer();
	}

	function syncToRenderer(): void {
		if (!renderer) return;

		try {
			const result = composeTslNodes(modules, modulationRoutes);
			currentResult = result;
			renderer.applyNodes(result.colorNode, result.positionNode);
			errors = [];
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			errors = [{ line: 0, message, raw: message, source: "fragment" }];
		}
	}

	function dispose(): void {
		renderer?.onTick(null);
		renderer?.dispose();
		renderer = null;
		currentResult = null;
	}

	return {
		get modules() {
			return modules;
		},
		get modulationRoutes() {
			return modulationRoutes;
		},
		get errors() {
			return errors;
		},
		get currentGeometry() {
			return currentGeometry;
		},
		get rotationEnabled() {
			return rotationEnabled;
		},
		get lightingEnabled() {
			return lightingEnabled;
		},
		get isFullscreen() {
			return isFullscreen;
		},
		get compileOk() {
			return compileOk;
		},
		get moduleDescriptions() {
			return moduleDescriptions;
		},
		get liveModValues() {
			return liveModValues;
		},

		addModule,
		removeModule,
		duplicateModule,
		toggleEnabled,
		toggleCollapsed,
		toggleCodeExpanded,
		updateParam,
		reorder,
		addModulationRoute,
		removeModulationRoute,
		updateModulationDepth,
		setGeometry,
		toggleRotation,
		toggleLighting,
		toggleFullscreen,
		initRenderer,
		dispose,
	};
}
