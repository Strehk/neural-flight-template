<script lang="ts">
	/**
	 * PlaygroundSidebar — Unified sidebar with 6 collapsible sections.
	 * Pattern: bits-ui Collapsible (like SettingsSidebar).
	 */

	import { Collapsible } from "bits-ui";
	import {
		X,
		ChevronDown,
		ChevronRight,
		FileCode,
		Box,
		Code,
		Archive,
		Settings,
		BookOpen,
		Play,
		RotateCcw,
		Pause,
		Lightbulb,
		LightbulbOff,
		Maximize,
		Minimize,
	} from "lucide-svelte";
	import { TEMPLATES } from "../templates";
	import { SNIPPETS, SNIPPET_CATEGORIES } from "../snippets";
	import { PRESETS } from "../data/presets/index";
	import { ShaderButton } from "../controls/index";
	import type {
		GeometryType,
		UniformDef,
		ShaderModule,
		PresetDef,
	} from "../types";
	import { difficultyColor, difficultyLabel } from "../difficulty";

	interface Props {
		open: boolean;
		onclose: () => void;
		ontemplate: (value: string) => void;
		currentGeometry: GeometryType;
		ongeometry: (type: GeometryType) => void;
		oninsert: (code: string, requiredUniforms?: UniformDef[]) => void;
		oncompile: () => void;
		rotationEnabled: boolean;
		onrotation: () => void;
		lightingEnabled: boolean;
		onlighting: () => void;
		isFullscreen: boolean;
		onfullscreen: () => void;
		savedModules: ShaderModule[];
		onloadmodule: (mod: ShaderModule) => void;
		ondeletemodule: (id: string) => void;
		onsave: () => void;
		onexport: () => void;
		onimport: () => void;
		onpreset: (preset: PresetDef) => void;
	}

	let {
		open,
		onclose,
		ontemplate,
		currentGeometry,
		ongeometry,
		oninsert,
		oncompile,
		rotationEnabled,
		onrotation,
		lightingEnabled,
		onlighting,
		isFullscreen,
		onfullscreen,
		savedModules,
		onloadmodule,
		ondeletemodule,
		onsave,
		onexport,
		onimport,
		onpreset,
	}: Props = $props();

	// ── Section open state ──

	let sections = $state({
		controls: true,
		templates: true,
		geometry: false,
		snippets: false,
		saved: false,
		presets: false,
	});

	// ── Snippet search ──

	let snippetSearch = $state("");

	const filteredSnippets = $derived(
		snippetSearch.trim()
			? SNIPPETS.filter(
					(s) =>
						s.name.toLowerCase().includes(snippetSearch.toLowerCase()) ||
						s.description
							.toLowerCase()
							.includes(snippetSearch.toLowerCase()) ||
						s.category
							.toLowerCase()
							.includes(snippetSearch.toLowerCase()),
				)
			: SNIPPETS,
	);

	function snippetsForCategory(category: string) {
		return filteredSnippets.filter((s) => s.category === category);
	}

	// ── Preset filter ──

	let presetFilter = $state<"all" | 1 | 2 | 3>("all");

	const filteredPresets = $derived(
		presetFilter === "all"
			? PRESETS
			: PRESETS.filter((p) => p.difficulty === presetFilter),
	);

	// ── Geometry options ──

	const geometries: { value: GeometryType; label: string }[] = [
		{ value: "plane", label: "Plane" },
		{ value: "sphere", label: "Sphere" },
		{ value: "cube", label: "Cube" },
		{ value: "torus", label: "Torus" },
		{ value: "cylinder", label: "Cylinder" },
	];


</script>

{#if open}
	<aside class="sidebar">
		<div class="sidebar-header">
			<span class="sidebar-title">
				<Settings size={14} />
				<span class="mono-label">SHADER TOOLS</span>
			</span>
			<button class="sidebar-close" onclick={onclose} type="button">
				<X size={16} />
			</button>
		</div>

		<div class="sidebar-content">
			<!-- 1. Controls -->
			<Collapsible.Root bind:open={sections.controls}>
				<Collapsible.Trigger class="sp-section-trigger">
					<span class="sp-section-icon">
						{#if sections.controls}<ChevronDown size={14} />{:else}<ChevronRight size={14} />{/if}
						<Settings size={14} />
						Controls
					</span>
				</Collapsible.Trigger>
				<Collapsible.Content>
					<div class="sp-section-body sp-controls-grid">
						<ShaderButton onclick={oncompile}>
							<Play size={12} />
							Compile
						</ShaderButton>
						<ShaderButton
							active={rotationEnabled}
							onclick={onrotation}
						>
							{#if rotationEnabled}
								<Pause size={12} />
								Pause Rotation
							{:else}
								<RotateCcw size={12} />
								Start Rotation
							{/if}
						</ShaderButton>
						<ShaderButton
							active={lightingEnabled}
							onclick={onlighting}
						>
							{#if lightingEnabled}
								<LightbulbOff size={12} />
								Disable Lighting
							{:else}
								<Lightbulb size={12} />
								Enable Lighting
							{/if}
						</ShaderButton>
						<ShaderButton onclick={onfullscreen}>
							{#if isFullscreen}
								<Minimize size={12} />
								Exit Fullscreen
							{:else}
								<Maximize size={12} />
								Fullscreen
							{/if}
						</ShaderButton>
					</div>
				</Collapsible.Content>
			</Collapsible.Root>

			<!-- 2. Templates -->
			<Collapsible.Root bind:open={sections.templates}>
				<Collapsible.Trigger class="sp-section-trigger">
					<span class="sp-section-icon">
						{#if sections.templates}<ChevronDown size={14} />{:else}<ChevronRight size={14} />{/if}
						<FileCode size={14} />
						Templates
					</span>
				</Collapsible.Trigger>
				<Collapsible.Content>
					<div class="sp-section-body">
						{#each TEMPLATES as t}
							<button
								class="sp-radio-item"
								onclick={() => ontemplate(t.id)}
								type="button"
							>
								<span class="sp-radio-name">{t.name}</span>
								<span class="sp-radio-desc">{t.description}</span>
							</button>
						{/each}
					</div>
				</Collapsible.Content>
			</Collapsible.Root>

			<!-- 3. Geometry -->
			<Collapsible.Root bind:open={sections.geometry}>
				<Collapsible.Trigger class="sp-section-trigger">
					<span class="sp-section-icon">
						{#if sections.geometry}<ChevronDown size={14} />{:else}<ChevronRight size={14} />{/if}
						<Box size={14} />
						Geometry
					</span>
				</Collapsible.Trigger>
				<Collapsible.Content>
					<div class="sp-section-body">
						{#each geometries as g}
							<button
								class="sp-radio-item"
								class:active={currentGeometry === g.value}
								onclick={() => ongeometry(g.value)}
								type="button"
							>
								<span class="sp-radio-name">{g.label}</span>
							</button>
						{/each}
					</div>
				</Collapsible.Content>
			</Collapsible.Root>

			<!-- 4. Snippets -->
			<Collapsible.Root bind:open={sections.snippets}>
				<Collapsible.Trigger class="sp-section-trigger">
					<span class="sp-section-icon">
						{#if sections.snippets}<ChevronDown size={14} />{:else}<ChevronRight size={14} />{/if}
						<Code size={14} />
						Snippets
					</span>
				</Collapsible.Trigger>
				<Collapsible.Content>
					<div class="sp-section-body">
						<input
							class="sp-search-input"
							type="text"
							placeholder="Search snippets..."
							bind:value={snippetSearch}
						/>
						{#each SNIPPET_CATEGORIES as cat}
							{@const catSnippets = snippetsForCategory(cat)}
							{#if catSnippets.length > 0}
								<div class="sp-snippet-category">
									<span class="sp-snippet-cat-label">{cat}</span>
									{#each catSnippets as snippet}
										<button
											class="sp-snippet-item"
											onclick={() =>
												oninsert(
													snippet.code,
													snippet.requiredUniforms,
												)}
											type="button"
											title={snippet.hint ?? snippet.description}
										>
											<div class="sp-snippet-top">
												<span class="sp-snippet-name">{snippet.name}</span>
												<span
													class="sp-difficulty-badge"
													style="background: {difficultyColor(snippet.difficulty)}"
												>
													{difficultyLabel(snippet.difficulty)}
												</span>
											</div>
											<span class="sp-snippet-desc">{snippet.description}</span>
										</button>
									{/each}
								</div>
							{/if}
						{/each}
					</div>
				</Collapsible.Content>
			</Collapsible.Root>

			<!-- 5. Saved -->
			<Collapsible.Root bind:open={sections.saved}>
				<Collapsible.Trigger class="sp-section-trigger">
					<span class="sp-section-icon">
						{#if sections.saved}<ChevronDown size={14} />{:else}<ChevronRight size={14} />{/if}
						<Archive size={14} />
						Saved ({savedModules.length})
					</span>
				</Collapsible.Trigger>
				<Collapsible.Content>
					<div class="sp-section-body">
						<div class="sp-actions-grid">
							<ShaderButton onclick={onsave}>Save Module</ShaderButton>
							<ShaderButton onclick={onexport}>Export to Clipboard</ShaderButton>
							<ShaderButton onclick={onimport}>Import from Clipboard</ShaderButton>
						</div>
						{#if savedModules.length === 0}
							<p class="sp-hint">No saved modules yet.</p>
						{:else}
							{#each savedModules as mod}
								<div class="sp-saved-item">
									<div class="sp-saved-info">
										<span class="sp-saved-name">{mod.name}</span>
										<span class="sp-saved-desc">{mod.description || "No description"}</span>
									</div>
									<div class="sp-saved-actions">
										<ShaderButton onclick={() => onloadmodule(mod)}>Load</ShaderButton>
										<ShaderButton variant="danger" onclick={() => ondeletemodule(mod.id)}>Del</ShaderButton>
									</div>
								</div>
							{/each}
						{/if}
					</div>
				</Collapsible.Content>
			</Collapsible.Root>

			<!-- 6. Presets -->
			<Collapsible.Root bind:open={sections.presets}>
				<Collapsible.Trigger class="sp-section-trigger">
					<span class="sp-section-icon">
						{#if sections.presets}<ChevronDown size={14} />{:else}<ChevronRight size={14} />{/if}
						<BookOpen size={14} />
						Presets
					</span>
				</Collapsible.Trigger>
				<Collapsible.Content>
					<div class="sp-section-body">
						<div class="sp-preset-filters">
							<ShaderButton active={presetFilter === "all"} onclick={() => (presetFilter = "all")}>All</ShaderButton>
							<ShaderButton active={presetFilter === 1} onclick={() => (presetFilter = 1)}>Beginner</ShaderButton>
							<ShaderButton active={presetFilter === 2} onclick={() => (presetFilter = 2)}>Mid</ShaderButton>
							<ShaderButton active={presetFilter === 3} onclick={() => (presetFilter = 3)}>Expert</ShaderButton>
						</div>
						{#each filteredPresets as preset}
							<button
								class="sp-preset-card"
								onclick={() => onpreset(preset)}
								type="button"
							>
								<div class="sp-preset-top">
									<span class="sp-preset-name">{preset.name}</span>
									<span
										class="sp-difficulty-badge"
										style="background: {difficultyColor(preset.difficulty)}"
									>
										{difficultyLabel(preset.difficulty)}
									</span>
								</div>
								<span class="sp-preset-effect">{preset.psychEffect}</span>
								<span class="sp-preset-desc">{preset.description}</span>
							</button>
						{/each}
					</div>
				</Collapsible.Content>
			</Collapsible.Root>
		</div>
	</aside>
{/if}

<style>
	/* ── Section Trigger ── */

	:global(.sp-section-trigger) {
		all: unset;
		display: flex;
		align-items: center;
		width: 100%;
		padding: var(--space-xs) var(--space-sm);
		cursor: pointer;
		color: var(--text-muted);
		font-size: 0.75rem;
		font-weight: 600;
		font-family: var(--font-main);
		border-bottom: 1px solid var(--border-subtle);
		box-sizing: border-box;
	}

	:global(.sp-section-trigger:hover) {
		background: var(--surface);
	}

	.sp-section-icon {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
	}

	/* ── Section Body ── */

	.sp-section-body {
		padding: var(--space-xs) var(--space-sm);
	}

	/* ── Controls ── */

	.sp-controls-grid {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	/* ── Templates / Geometry Radio Items ── */

	.sp-radio-item {
		all: unset;
		display: flex;
		flex-direction: column;
		gap: 0.05rem;
		width: 100%;
		padding: var(--space-xs) var(--space-xs);
		cursor: pointer;
		font-family: var(--font-main);
		box-sizing: border-box;
		border-radius: var(--radius-sm);
	}

	.sp-radio-item:hover {
		background: var(--surface);
	}

	.sp-radio-item.active {
		background: var(--surface-active);
		border-left: 2px solid var(--accent-muted);
	}

	.sp-radio-name {
		font-size: 0.7rem;
		color: var(--text-muted);
		font-weight: 500;
	}

	.sp-radio-desc {
		font-size: 0.6rem;
		color: var(--text-subtle);
	}

	/* ── Snippets ── */

	.sp-search-input {
		width: 100%;
		background: var(--surface);
		color: var(--text-muted);
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-sm);
		padding: var(--space-xs);
		font-size: 0.7rem;
		font-family: var(--font-main);
		outline: none;
		box-sizing: border-box;
		margin-bottom: var(--space-xs);
	}

	.sp-search-input::placeholder {
		color: var(--text-subtle);
	}

	.sp-snippet-category {
		margin-bottom: var(--space-xs);
	}

	.sp-snippet-cat-label {
		display: block;
		text-transform: capitalize;
		font-weight: 600;
		font-size: 0.65rem;
		color: var(--text-subtle);
		padding: var(--space-xs) 0 0.1rem;
	}

	.sp-snippet-item {
		all: unset;
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
		width: 100%;
		padding: var(--space-xs);
		cursor: pointer;
		font-family: var(--font-main);
		box-sizing: border-box;
		border-radius: var(--radius-sm);
	}

	.sp-snippet-item:hover {
		background: var(--surface);
	}

	.sp-snippet-top {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
	}

	.sp-snippet-name {
		font-size: 0.7rem;
		color: var(--text-muted);
	}

	.sp-difficulty-badge {
		font-size: 0.5rem;
		padding: 0.05rem 0.25rem;
		border-radius: var(--radius-sm);
		color: var(--bg);
		font-weight: 600;
	}

	.sp-snippet-desc {
		font-size: 0.6rem;
		color: var(--text-subtle);
	}

	/* ── Hint ── */

	.sp-hint {
		font-size: 0.65rem;
		color: var(--text-subtle);
		margin: var(--space-xs) 0;
	}

	/* ── Saved Modules ── */

	.sp-saved-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: var(--space-xs) 0;
		gap: var(--space-xs);
	}

	.sp-saved-item + .sp-saved-item {
		border-top: 1px solid var(--border-subtle);
	}

	.sp-saved-info {
		display: flex;
		flex-direction: column;
		gap: 0.05rem;
		min-width: 0;
	}

	.sp-saved-name {
		font-size: 0.7rem;
		font-weight: 500;
		color: var(--text-muted);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.sp-saved-desc {
		font-size: 0.6rem;
		color: var(--text-subtle);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.sp-saved-actions {
		display: flex;
		gap: var(--space-xs);
		flex-shrink: 0;
	}

	/* ── Actions ── */

	.sp-actions-grid {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
		margin-bottom: var(--space-xs);
	}

	/* ── Presets ── */

	.sp-preset-filters {
		display: flex;
		gap: var(--space-xs);
		margin-bottom: var(--space-xs);
		flex-wrap: wrap;
	}

	.sp-preset-card {
		all: unset;
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
		width: 100%;
		padding: var(--space-xs);
		cursor: pointer;
		font-family: var(--font-main);
		box-sizing: border-box;
		border-radius: var(--radius-sm);
	}

	.sp-preset-card:hover {
		background: var(--surface);
	}

	.sp-preset-top {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.sp-preset-name {
		font-size: 0.7rem;
		font-weight: 600;
		color: var(--text-muted);
	}

	.sp-preset-effect {
		font-size: 0.6rem;
		color: var(--accent);
	}

	.sp-preset-desc {
		font-size: 0.6rem;
		color: var(--text-subtle);
	}

</style>
