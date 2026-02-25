/**
 * Playground State — Reactive store for the Shader Playground.
 *
 * Extracts all business logic from the page into a headless Svelte 5 store.
 * The page component only wires layout + this state.
 */

import { DEFAULT_FRAGMENT } from "./engine/renderer";
import { parseUniforms } from "./uniforms";
import { isShadertoyFormat, wrapShadertoyCode } from "./shadertoy_compat";
import {
	saveModule,
	loadModules,
	deleteModule,
	exportModuleJSON,
	importModuleJSON,
	generateId,
} from "./store";
import { TEMPLATES } from "./templates";
import type {
	PlaygroundRenderer,
	ShaderError,
	UniformDef,
	GeometryType,
	ShaderModule,
	PresetDef,
} from "./types";

export type EditorTab = "fragment" | "vertex";

export interface PlaygroundState {
	// ── Shader ──
	fragmentCode: string;
	vertexCode: string | null;
	errors: ShaderError[];
	uniforms: UniformDef[];
	endpointUniforms: UniformDef[];

	// ── Scene ──
	currentGeometry: GeometryType;
	rotationEnabled: boolean;
	lightingEnabled: boolean;

	// ── UI ──
	activeTab: EditorTab;
	isFullscreen: boolean;

	// ── Live Telemetry ──
	readonly liveUniformValues: Map<string, number | number[]>;
	readonly fps: number;
	readonly compileOk: boolean;

	// ── Modules ──
	savedModules: ShaderModule[];

	// ── Derived ──
	readonly editorMode: "fragment" | "vertex";

	// ── Actions ──
	initRenderer(r: PlaygroundRenderer): void;
	compile(): void;
	updateUniform(name: string, value: number | number[] | boolean): void;
	changeEditor(frag: string, vert: string | null): void;
	setGeometry(type: GeometryType): void;
	loadTemplate(id: string): void;
	loadPreset(preset: PresetDef): void;
	toggleRotation(): void;
	toggleLighting(): void;
	toggleFullscreen(): void;
	save(): void;
	loadModule(mod: ShaderModule): void;
	deleteModule(id: string): void;
	exportToClipboard(): void;
	importFromClipboard(): void;
}

export function createPlaygroundState(): PlaygroundState {
	// ── Core State ──
	let fragmentCode = $state(DEFAULT_FRAGMENT);
	let vertexCode = $state<string | null>(null);
	let errors = $state<ShaderError[]>([]);
	let uniforms = $state<UniformDef[]>([]);
	let endpointUniforms = $state<UniformDef[]>([]);
	let currentGeometry = $state<GeometryType>("sphere");
	let rotationEnabled = $state(true);
	let lightingEnabled = $state(true);
	let activeTab = $state<EditorTab>("fragment");
	let isFullscreen = $state(false);
	let savedModules = $state<ShaderModule[]>(loadModules());
	let renderer: PlaygroundRenderer | undefined;

	// ── Live Telemetry ──
	let liveUniformValues = $state(new Map<string, number | number[]>());
	let fps = $state(60);
	let compileOk = $state(true);
	let frameCount = 0;
	let fpsLastTime = 0;

	const editorMode = $derived(
		activeTab === "vertex" ? ("vertex" as const) : ("fragment" as const),
	);

	// ── Internal Helpers ──

	function compile(): void {
		if (!renderer) return;

		let frag = fragmentCode;
		if (isShadertoyFormat(frag)) {
			frag = wrapShadertoyCode(frag);
		}

		errors = renderer.updateShader(frag, vertexCode);
		compileOk = errors.length === 0;

		const parsed = parseUniforms(fragmentCode);
		uniforms = parsed;
		endpointUniforms = parsed.filter((u) => u.endpoint);

		for (const u of parsed) {
			renderer.updateUniform(u.name, u.value);
		}
	}

	function applyShader(frag: string, vert: string | null, geo?: GeometryType): void {
		fragmentCode = frag;
		vertexCode = vert;
		if (geo) {
			currentGeometry = geo;
			renderer?.setGeometry(geo);
		}
		compile();
	}

	function buildModule(name: string): ShaderModule {
		return {
			id: generateId(),
			name,
			description: "",
			author: "User",
			version: "1.0.0",
			fragmentShader: fragmentCode,
			vertexShader: vertexCode,
			uniforms,
			geometry: currentGeometry,
			tags: [],
		};
	}

	// ── Public API ──

	return {
		get fragmentCode() { return fragmentCode; },
		set fragmentCode(v: string) { fragmentCode = v; },
		get vertexCode() { return vertexCode; },
		set vertexCode(v: string | null) { vertexCode = v; },
		get errors() { return errors; },
		get uniforms() { return uniforms; },
		get endpointUniforms() { return endpointUniforms; },
		get currentGeometry() { return currentGeometry; },
		get rotationEnabled() { return rotationEnabled; },
		get lightingEnabled() { return lightingEnabled; },
		get activeTab() { return activeTab; },
		set activeTab(v: EditorTab) { activeTab = v; },
		get isFullscreen() { return isFullscreen; },
		get savedModules() { return savedModules; },
		set savedModules(v: ShaderModule[]) { savedModules = v; },
		get liveUniformValues() { return liveUniformValues; },
		get fps() { return fps; },
		get compileOk() { return compileOk; },
		get editorMode() { return editorMode; },

		initRenderer(r: PlaygroundRenderer): void {
			renderer = r;
			r.setRotation(rotationEnabled);
			compile();

			r.onTick((_dt) => {
				// FPS tracking (~4 Hz update rate)
				frameCount++;
				const now = performance.now();
				const elapsed = now - fpsLastTime;
				if (elapsed >= 250) {
					fps = Math.round((frameCount / elapsed) * 1000);
					frameCount = 0;
					fpsLastTime = now;

					// Read live uniform values (~4 fps for perf)
					const mat = r.getMaterial();
					const next = new Map<string, number | number[]>();
					for (const [key, u] of Object.entries(mat.uniforms)) {
						const v = u.value;
						if (typeof v === "number") {
							next.set(key, v);
						} else if (v && typeof v === "object" && "x" in v) {
							if ("w" in v) next.set(key, [v.x, v.y, v.z, v.w]);
							else if ("z" in v) next.set(key, [v.x, v.y, v.z]);
							else next.set(key, [v.x, v.y]);
						}
					}
					liveUniformValues = next;
				}
			});
		},

		compile,

		updateUniform(name: string, value: number | number[] | boolean): void {
			renderer?.updateUniform(name, value);
		},

		changeEditor(frag: string, vert: string | null): void {
			fragmentCode = frag;
			vertexCode = vert;
			compile();
		},

		setGeometry(type: GeometryType): void {
			currentGeometry = type;
			renderer?.setGeometry(type);
		},

		loadTemplate(id: string): void {
			const t = TEMPLATES.find((t) => t.id === id);
			if (!t) return;
			applyShader(t.fragmentShader, t.vertexShader);
		},

		loadPreset(preset: PresetDef): void {
			applyShader(preset.fragmentShader, preset.vertexShader, preset.geometry);
		},

		toggleRotation(): void {
			rotationEnabled = !rotationEnabled;
			renderer?.setRotation(rotationEnabled);
		},

		toggleLighting(): void {
			lightingEnabled = !lightingEnabled;
			renderer?.setLighting(lightingEnabled);
		},

		toggleFullscreen(): void {
			isFullscreen = !isFullscreen;
		},

		save(): void {
			const mod = buildModule(`Shader ${new Date().toLocaleTimeString()}`);
			saveModule(mod);
			savedModules = loadModules();
		},

		loadModule(mod: ShaderModule): void {
			applyShader(mod.fragmentShader, mod.vertexShader, mod.geometry);
		},

		deleteModule(id: string): void {
			deleteModule(id);
			savedModules = loadModules();
		},

		exportToClipboard(): void {
			const json = exportModuleJSON(buildModule("Exported Shader"));
			navigator.clipboard.writeText(json);
		},

		importFromClipboard(): void {
			const json = prompt("Paste ShaderModule JSON:");
			if (!json) return;
			const mod = importModuleJSON(json);
			if (mod) applyShader(mod.fragmentShader, mod.vertexShader, mod.geometry);
		},
	};
}
