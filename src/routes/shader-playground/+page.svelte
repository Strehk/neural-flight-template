<script lang="ts">
	import { onMount } from "svelte";
	import "$lib/shader-playground/shader-playground.css";
	import PreviewCanvas from "$lib/shader-playground/components/PreviewCanvas.svelte";
	import ErrorConsole from "$lib/shader-playground/components/ErrorConsole.svelte";
	import ShaderEditor from "$lib/shader-playground/components/ShaderEditor.svelte";
	import UniformPanel from "$lib/shader-playground/components/UniformPanel.svelte";
	import Toolbar from "$lib/shader-playground/components/Toolbar.svelte";
	import SnippetDrawer from "$lib/shader-playground/components/SnippetDrawer.svelte";
	import PresetBrowser from "$lib/shader-playground/components/PresetBrowser.svelte";
	import ModulationPanel from "$lib/shader-playground/components/ModulationPanel.svelte";
	import ModuleLibrary from "$lib/shader-playground/components/ModuleLibrary.svelte";
	import { DEFAULT_FRAGMENT } from "$lib/shader-playground/renderer";
	import { parseUniforms } from "$lib/shader-playground/uniforms";
	import {
		isShadertoyFormat,
		wrapShadertoyCode,
	} from "$lib/shader-playground/shadertoy_compat";
	import { createModulationBridge } from "$lib/shader-playground/modulation";
	import {
		saveModule,
		loadModules,
		deleteModule,
		exportModuleJSON,
		importModuleJSON,
		generateId,
	} from "$lib/shader-playground/store";
	import type {
		PlaygroundRenderer,
		ShaderError,
		UniformDef,
		GeometryType,
		ShaderModule,
		PresetDef,
		ShaderTemplate,
	} from "$lib/shader-playground/types";
	import type { ModulationBridge } from "$lib/shader-playground/modulation";

	// ── State ──

	let fragmentCode = $state(DEFAULT_FRAGMENT);
	let vertexCode = $state<string | null>(null);
	let errors = $state<ShaderError[]>([]);
	let uniforms = $state<UniformDef[]>([]);
	let endpointUniforms = $state<UniformDef[]>([]);
	let currentGeometry = $state<GeometryType>("plane");
	let renderer = $state<PlaygroundRenderer | undefined>();
	let bridge = $state<ModulationBridge | null>(null);
	let savedModules = $state<ShaderModule[]>([]);
	let snippetDrawerOpen = $state(false);
	let presetBrowserOpen = $state(false);
	let isFullscreen = $state(false);
	let editorRef: ShaderEditor | undefined = $state();

	// ── Lifecycle ──

	onMount(() => {
		savedModules = loadModules();
	});

	// ── Renderer Callback ──

	function handleRenderer(r: PlaygroundRenderer): void {
		renderer = r;
		// Initial compile
		compileShader();
	}

	// ── Shader Compilation ──

	function compileShader(): void {
		if (!renderer) return;

		let frag = fragmentCode;

		// Shadertoy compat
		if (isShadertoyFormat(frag)) {
			frag = wrapShadertoyCode(frag);
		}

		errors = renderer.updateShader(frag, vertexCode);

		// Parse uniforms from original source
		const parsed = parseUniforms(fragmentCode);
		uniforms = parsed;
		endpointUniforms = parsed.filter((u) => u.endpoint);

		// Init user uniforms in renderer
		for (const u of parsed) {
			renderer.updateUniform(u.name, u.value);
		}

		// Sync bridge with new material (updateShader replaces the material)
		syncBridgeMaterial();

		// Update modulation bridge endpoints
		updateModulationEndpoints(parsed.filter((u) => u.endpoint));
	}

	function updateModulationEndpoints(
		endpoints: UniformDef[],
	): void {
		if (!bridge) return;
		bridge.clearEndpoints();
		for (const ep of endpoints) {
			bridge.registerEndpoint(ep);
		}
	}

	// ── Editor Changes ──

	function handleEditorChange(
		frag: string,
		vert: string | null,
	): void {
		fragmentCode = frag;
		vertexCode = vert;
		compileShader();
	}

	// ── Uniform Changes ──

	function handleUniformChange(
		name: string,
		value: number | number[] | boolean,
	): void {
		renderer?.updateUniform(name, value);
	}

	// ── Geometry ──

	function handleGeometry(type: GeometryType): void {
		currentGeometry = type;
		renderer?.setGeometry(type);
	}

	// ── Templates ──

	function handleTemplate(template: ShaderTemplate): void {
		fragmentCode = template.fragmentShader;
		vertexCode = template.vertexShader;
		compileShader();
	}

	// ── Presets ──

	function handlePreset(preset: PresetDef): void {
		fragmentCode = preset.fragmentShader;
		vertexCode = preset.vertexShader;
		currentGeometry = preset.geometry;
		renderer?.setGeometry(preset.geometry);
		presetBrowserOpen = false;
		compileShader();
	}

	// ── Snippets ──

	function handleSnippetInsert(
		code: string,
		requiredUniforms?: UniformDef[],
	): void {
		editorRef?.insertCode(code);
	}

	// ── Save / Load / Export / Import ──

	function handleSave(): void {
		const mod: ShaderModule = {
			id: generateId(),
			name: `Shader ${new Date().toLocaleTimeString()}`,
			description: "",
			author: "User",
			version: "1.0.0",
			fragmentShader: fragmentCode,
			vertexShader: vertexCode,
			uniforms,
			geometry: currentGeometry,
			tags: [],
		};
		saveModule(mod);
		savedModules = loadModules();
	}

	function handleLoadModule(mod: ShaderModule): void {
		fragmentCode = mod.fragmentShader;
		vertexCode = mod.vertexShader;
		currentGeometry = mod.geometry;
		renderer?.setGeometry(mod.geometry);
		compileShader();
	}

	function handleDeleteModule(id: string): void {
		deleteModule(id);
		savedModules = loadModules();
	}

	function handleExport(): void {
		const mod: ShaderModule = {
			id: generateId(),
			name: "Exported Shader",
			description: "",
			author: "User",
			version: "1.0.0",
			fragmentShader: fragmentCode,
			vertexShader: vertexCode,
			uniforms,
			geometry: currentGeometry,
			tags: [],
		};
		const json = exportModuleJSON(mod);
		navigator.clipboard.writeText(json);
	}

	function handleImport(): void {
		const json = prompt("Paste ShaderModule JSON:");
		if (!json) return;
		const mod = importModuleJSON(json);
		if (mod) {
			handleLoadModule(mod);
		}
	}

	// ── Error Click ──

	function handleErrorClick(line: number): void {
		console.log("Navigate to line:", line);
	}

	// ── Modulation Bridge Setup ──

	$effect(() => {
		if (renderer && !bridge) {
			const b = createModulationBridge(renderer.getMaterial());
			bridge = b;

			// Per-frame: evaluate signal graph → push to uniforms
			renderer.onTick((dt) => {
				b.update(dt);
			});
		}
	});

	// Keep bridge material in sync after recompile
	function syncBridgeMaterial(): void {
		if (bridge && renderer) {
			bridge.updateMaterial(renderer.getMaterial());
		}
	}
</script>

<div class="sp-page" class:fullscreen={isFullscreen}>
	<!-- Toolbar -->
	<Toolbar
		ontemplate={handleTemplate}
		onpreset={() => (presetBrowserOpen = true)}
		oncompile={compileShader}
		onsave={handleSave}
		onexport={handleExport}
		onimport={handleImport}
		onfullscreen={() => (isFullscreen = !isFullscreen)}
		{currentGeometry}
		ongeometry={handleGeometry}
		{snippetDrawerOpen}
		ontogglesidebar={() => (snippetDrawerOpen = !snippetDrawerOpen)}
	/>

	<!-- Main Content -->
	<div class="sp-content">
		<!-- Snippet Drawer -->
		<SnippetDrawer
			open={snippetDrawerOpen}
			oninsert={handleSnippetInsert}
			ontoggle={() => (snippetDrawerOpen = !snippetDrawerOpen)}
		/>

		<!-- Left: Code Editor + Uniforms -->
		{#if !isFullscreen}
			<div class="sp-left">
				<div class="sp-editor-wrap">
					<ShaderEditor
						bind:this={editorRef}
						bind:fragmentCode
						bind:vertexCode
						{errors}
						onchange={handleEditorChange}
					/>
				</div>
				<div class="sp-uniforms-wrap">
					<UniformPanel {uniforms} onchange={handleUniformChange} />
				</div>
			</div>
		{/if}

		<!-- Right: Preview Canvas -->
		<div class="sp-preview-wrap">
			<PreviewCanvas onrenderer={handleRenderer} />
		</div>
	</div>

	<!-- Bottom: Modulation -->
	{#if !isFullscreen}
		<div class="sp-modulation-wrap">
			<ModulationPanel {bridge} {endpointUniforms} />
		</div>
	{/if}

	<!-- Error Console -->
	<div class="sp-errors-wrap">
		<ErrorConsole {errors} onclick={handleErrorClick} />
	</div>

	<!-- Saved Modules -->
	{#if !isFullscreen}
		<div class="sp-library-wrap">
			<ModuleLibrary
				modules={savedModules}
				onload={handleLoadModule}
				ondelete={handleDeleteModule}
			/>
		</div>
	{/if}

	<!-- Preset Browser (overlay) -->
	<PresetBrowser
		open={presetBrowserOpen}
		onselect={handlePreset}
		onclose={() => (presetBrowserOpen = false)}
	/>
</div>
