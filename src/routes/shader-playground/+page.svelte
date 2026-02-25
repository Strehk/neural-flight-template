<script lang="ts">
	import { Tabs, ToggleGroup } from "bits-ui";
	import "$lib/shader-playground/shader-playground.css";
	import PreviewCanvas from "$lib/shader-playground/components/PreviewCanvas.svelte";
	import ErrorConsole from "$lib/shader-playground/components/ErrorConsole.svelte";
	import ShaderEditor from "$lib/shader-playground/components/ShaderEditor.svelte";
	import ShaderRack from "$lib/shader-playground/components/ShaderRack.svelte";
	import PlaygroundSidebar from "$lib/shader-playground/components/PlaygroundSidebar.svelte";
	import PreviewToolbar from "$lib/shader-playground/components/PreviewToolbar.svelte";
	import PageHeader from "$lib/components/PageHeader.svelte";
	import { createPlaygroundState } from "$lib/shader-playground/playground_state.svelte";
	import { createRackState } from "$lib/shader-playground/rack/state.svelte";
	import { Palette, Menu, Rows3, Code, Zap } from "lucide-svelte";

	const pg = createPlaygroundState();
	const rackState = createRackState(pg);

	let editorRef: ShaderEditor | undefined = $state();
	let viewMode = $state<"rack" | "raw">("rack");

	function handleSnippetInsert(code: string): void {
		editorRef?.insertCode(code);
	}
</script>

<svelte:head>
	<title>SHADERRACK | ICAROS</title>
</svelte:head>

<div class="sp-page" class:fullscreen={pg.isFullscreen}>
	<PageHeader icon={Zap} label="SHADERRACK" status={pg.compileOk ? "connected" : "error"}>
		{#snippet actions()}
			<span class="sp-header-sub">
				{pg.activeTab === "fragment" ? (viewMode === "rack" ? "M-FRAG" : "RAW") : "VERTEX"}
			</span>
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
				<div class="sp-editor-tabs-row">
					<Tabs.Root bind:value={pg.activeTab}>
						<Tabs.List class="sp-editor-tabs">
							<Tabs.Trigger value="fragment">Fragment</Tabs.Trigger>
							<Tabs.Trigger value="vertex">Vertex</Tabs.Trigger>

						</Tabs.List>
					</Tabs.Root>

					{#if pg.activeTab === "fragment"}
						<ToggleGroup.Root
							type="single"
							bind:value={viewMode}
							class="sp-view-toggle"
						>
							<ToggleGroup.Item value="rack" aria-label="Rack view">
								<Rows3 size={14} />
							</ToggleGroup.Item>
							<ToggleGroup.Item value="raw" aria-label="Raw editor">
								<Code size={14} />
							</ToggleGroup.Item>
						</ToggleGroup.Root>
					{/if}
				</div>

				{#if pg.activeTab === "fragment"}
					{#if viewMode === "rack"}
						<div class="sp-editor-wrap">
							<ShaderRack {rackState} {pg} />
						</div>
					{:else}
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
					{/if}
					{#if pg.errors.length > 0}
						<div class="sp-errors-wrap">
							<ErrorConsole
								errors={pg.errors}
								onclick={(line) => editorRef?.scrollToLine(line)}
							/>
						</div>
					{/if}
				{:else if pg.activeTab === "vertex"}
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
				{/if}
			</div>
		{/if}

		<div class="sp-right">
			<PreviewToolbar
				oncompile={pg.compile}
				rotationEnabled={pg.rotationEnabled}
				onrotation={pg.toggleRotation}
				lightingEnabled={pg.lightingEnabled}
				onlighting={pg.toggleLighting}
				isFullscreen={pg.isFullscreen}
				onfullscreen={pg.toggleFullscreen}
				currentGeometry={pg.currentGeometry}
				ongeometry={pg.setGeometry}
			/>
			<div class="sp-preview-wrap">
				<PreviewCanvas onrenderer={pg.initRenderer} />
			</div>
		</div>
	</main>

	<PlaygroundSidebar
		open={pg.sidebarOpen}
		onclose={() => (pg.sidebarOpen = false)}
		ontemplate={pg.loadTemplate}
		oninsert={handleSnippetInsert}
		savedModules={pg.savedModules}
		onloadmodule={pg.loadModule}
		ondeletemodule={pg.deleteModule}
		onsave={pg.save}
		onexport={pg.exportToClipboard}
		onimport={pg.importFromClipboard}
		onpreset={pg.loadPreset}
	/>
</div>
