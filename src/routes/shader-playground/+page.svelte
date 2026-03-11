<script lang="ts">
import { Tabs } from "bits-ui";
import "$lib/shader-playground/shader-playground.css";
import { Code, Rows3, Zap } from "lucide-svelte";
import { onDestroy } from "svelte";
import PageHeader from "$lib/components/PageHeader.svelte";
import CodeView from "$lib/shader-playground/components/CodeView.svelte";
import Preview from "$lib/shader-playground/components/Preview.svelte";
import PreviewToolbar from "$lib/shader-playground/components/PreviewToolbar.svelte";
import Rack from "$lib/shader-playground/components/Rack.svelte";
import { createShaderRackState } from "$lib/shader-playground/state.svelte";

const rackState = createShaderRackState();

let activeTab = $state<"rack" | "code">("rack");

onDestroy(() => rackState.dispose());
</script>

<svelte:head>
	<title>SHADERRACK v3 | ICAROS</title>
</svelte:head>

<div class="sp-page" class:fullscreen={rackState.isFullscreen}>
	<PageHeader icon={Zap} label="SHADERRACK" status={rackState.compileOk ? "connected" : "error"}>
		{#snippet actions()}
			<span class="sp-header-sub">
				{activeTab === "rack" ? "RACK" : "TSL"}
			</span>
		{/snippet}
	</PageHeader>

	<main class="sp-main">
		{#if !rackState.isFullscreen}
			<div class="sp-left">
				<Tabs.Root bind:value={activeTab}>
					<Tabs.List class="sp-tabs-row">
						<Tabs.Trigger value="rack">
							<Rows3 size={14} />
							Rack
						</Tabs.Trigger>
						<Tabs.Trigger value="code">
							<Code size={14} />
							Code
						</Tabs.Trigger>
					</Tabs.List>
				</Tabs.Root>

				{#if activeTab === "rack"}
					<Rack rack={rackState} />
				{:else}
					<CodeView descriptions={rackState.moduleDescriptions} />
				{/if}
			</div>
		{/if}

		<div class="sp-right">
			<PreviewToolbar
				rotationEnabled={rackState.rotationEnabled}
				onrotation={rackState.toggleRotation}
				lightingEnabled={rackState.lightingEnabled}
				onlighting={rackState.toggleLighting}
				isFullscreen={rackState.isFullscreen}
				onfullscreen={rackState.toggleFullscreen}
				currentGeometry={rackState.currentGeometry}
				ongeometry={rackState.setGeometry}
			/>
			<div class="sp-preview-wrap">
				<Preview onrenderer={rackState.initRenderer} />
			</div>
		</div>
	</main>
</div>
