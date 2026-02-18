<script lang="ts">
	import { Tabs } from "bits-ui";
	import "$lib/shader-playground/shader-playground.css";
	import PreviewCanvas from "$lib/shader-playground/components/PreviewCanvas.svelte";
	import ErrorConsole from "$lib/shader-playground/components/ErrorConsole.svelte";
	import ShaderEditor from "$lib/shader-playground/components/ShaderEditor.svelte";
	import PlaygroundSidebar from "$lib/shader-playground/components/PlaygroundSidebar.svelte";
	import ModulationCanvas from "$lib/shader-playground/components/ModulationCanvas.svelte";
	import PageHeader from "$lib/components/PageHeader.svelte";
	import { createPlaygroundState } from "$lib/shader-playground/playground_state.svelte";
	import { Palette, Menu } from "lucide-svelte";

	const pg = createPlaygroundState();

	let editorRef: ShaderEditor | undefined = $state();

	function handleSnippetInsert(code: string): void {
		editorRef?.insertCode(code);
	}
</script>

<svelte:head>
	<title>Shader Playground | ICAROS</title>
</svelte:head>

<div class="sp-page" class:fullscreen={pg.isFullscreen}>
	<PageHeader icon={Palette} label="Shader Playground">
		{#snippet actions()}
			<button
				class="header-settings-btn"
				onclick={() => (pg.sidebarOpen = !pg.sidebarOpen)}
				title="Menu"
			>
				<Menu size={14} />
			</button>
		{/snippet}
	</PageHeader>

	<main class="sp-main">
		{#if !pg.isFullscreen}
			<div class="sp-left">
				<Tabs.Root bind:value={pg.activeTab}>
					<Tabs.List class="sp-editor-tabs">
						<Tabs.Trigger value="fragment">Fragment</Tabs.Trigger>
						<Tabs.Trigger value="vertex">Vertex</Tabs.Trigger>
						<Tabs.Trigger value="nodes">Node Editor</Tabs.Trigger>
					</Tabs.List>
				</Tabs.Root>

				{#if pg.activeTab === "fragment" || pg.activeTab === "vertex"}
					<div class="sp-editor-wrap">
						<ShaderEditor
							bind:this={editorRef}
							bind:fragmentCode={pg.fragmentCode}
							bind:vertexCode={pg.vertexCode}
							errors={pg.errors}
							mode={pg.editorMode}
							onchange={pg.changeEditor}
							oncompile={pg.compile}
						/>
					</div>
					{#if pg.errors.length > 0}
						<div class="sp-errors-wrap">
							<ErrorConsole
								errors={pg.errors}
								onclick={(line) => editorRef?.scrollToLine(line)}
							/>
						</div>
					{/if}
				{:else}
					<div class="sp-modulation-wrap">
						<ModulationCanvas
							bridge={pg.bridge}
							endpointUniforms={pg.endpointUniforms}
							bind:nodes={pg.modNodes}
							bind:edges={pg.modEdges}
							sourceEngineMap={pg.modSourceMap}
						/>
					</div>
				{/if}
			</div>
		{/if}

		<div class="sp-right">
			<div class="sp-preview-wrap">
				<PreviewCanvas onrenderer={pg.initRenderer} />
			</div>
		</div>
	</main>

	<PlaygroundSidebar
		open={pg.sidebarOpen}
		onclose={() => (pg.sidebarOpen = false)}
		ontemplate={pg.loadTemplate}
		currentGeometry={pg.currentGeometry}
		ongeometry={pg.setGeometry}
		oninsert={handleSnippetInsert}
		oncompile={pg.compile}
		rotationEnabled={pg.rotationEnabled}
		onrotation={pg.toggleRotation}
		lightingEnabled={pg.lightingEnabled}
		onlighting={pg.toggleLighting}
		isFullscreen={pg.isFullscreen}
		onfullscreen={pg.toggleFullscreen}
		savedModules={pg.savedModules}
		onloadmodule={pg.loadModule}
		ondeletemodule={pg.deleteModule}
		onsave={pg.save}
		onexport={pg.exportToClipboard}
		onimport={pg.importFromClipboard}
		onpreset={pg.loadPreset}
		activeTab={pg.activeTab}
		endpointUniforms={pg.endpointUniforms}
	/>
</div>
