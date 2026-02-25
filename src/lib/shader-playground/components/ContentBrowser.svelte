<script lang="ts">
	/**
	 * ContentBrowser — Popover panel for Templates, Presets, and Saved modules.
	 *
	 * Replaces the permanent sidebar sections with a "load once" pattern.
	 * Opens from a header button (like Reason's Patch Browser).
	 */

	import { Popover } from "bits-ui";
	import { Palette } from "lucide-svelte";
	import { TEMPLATES } from "../templates";
	import { SNIPPETS, SNIPPET_CATEGORIES } from "../snippets";
	import { PRESETS } from "../data/presets/index";
	import { ShaderButton } from "../controls/index";
	import { difficultyColor, difficultyLabel } from "../difficulty";
	import type { UniformDef, ShaderModule, PresetDef } from "../types";

	interface Props {
		ontemplate: (value: string) => void;
		onpreset: (preset: PresetDef) => void;
		savedModules: ShaderModule[];
		onloadmodule: (mod: ShaderModule) => void;
		ondeletemodule: (id: string) => void;
		onsave: () => void;
		onexport: () => void;
		onimport: () => void;
		oninsert: (code: string, requiredUniforms?: UniformDef[]) => void;
	}

	let {
		ontemplate,
		onpreset,
		savedModules,
		onloadmodule,
		ondeletemodule,
		onsave,
		onexport,
		onimport,
		oninsert,
	}: Props = $props();

	let activeSection = $state<"templates" | "presets" | "saved" | "snippets">("templates");

	// ── Preset filter ──
	let presetFilter = $state<"all" | 1 | 2 | 3>("all");

	const filteredPresets = $derived(
		presetFilter === "all"
			? PRESETS
			: PRESETS.filter((p) => p.difficulty === presetFilter),
	);

	// ── Snippet search ──
	let snippetSearch = $state("");

	const filteredSnippets = $derived(
		snippetSearch.trim()
			? SNIPPETS.filter(
					(s) =>
						s.name.toLowerCase().includes(snippetSearch.toLowerCase()) ||
						s.description.toLowerCase().includes(snippetSearch.toLowerCase()) ||
						s.category.toLowerCase().includes(snippetSearch.toLowerCase()),
				)
			: SNIPPETS,
	);

	function snippetsForCategory(category: string) {
		return filteredSnippets.filter((s) => s.category === category);
	}
</script>

<Popover.Root>
	<Popover.Trigger class="sp-cb-trigger" aria-label="Content Browser">
		<Palette size={14} />
	</Popover.Trigger>

	<Popover.Content class="sp-cb-panel" side="bottom" align="end" sideOffset={4}>
		<div class="sp-cb-tabs">
			<button
				class="sp-cb-tab"
				class:active={activeSection === "templates"}
				onclick={() => (activeSection = "templates")}
			>Templates</button>
			<button
				class="sp-cb-tab"
				class:active={activeSection === "presets"}
				onclick={() => (activeSection = "presets")}
			>Presets</button>
			<button
				class="sp-cb-tab"
				class:active={activeSection === "saved"}
				onclick={() => (activeSection = "saved")}
			>Saved</button>
			<button
				class="sp-cb-tab"
				class:active={activeSection === "snippets"}
				onclick={() => (activeSection = "snippets")}
			>Snippets</button>
		</div>

		<div class="sp-cb-body">
			{#if activeSection === "templates"}
				{#each TEMPLATES as t}
					<button
						class="sp-cb-item"
						onclick={() => ontemplate(t.id)}
						type="button"
					>
						<span class="sp-cb-name">{t.name}</span>
						<span class="sp-cb-desc">{t.description}</span>
					</button>
				{/each}

			{:else if activeSection === "presets"}
				<div class="sp-cb-filters">
					<ShaderButton active={presetFilter === "all"} onclick={() => (presetFilter = "all")}>All</ShaderButton>
					<ShaderButton active={presetFilter === 1} onclick={() => (presetFilter = 1)}>Beginner</ShaderButton>
					<ShaderButton active={presetFilter === 2} onclick={() => (presetFilter = 2)}>Mid</ShaderButton>
					<ShaderButton active={presetFilter === 3} onclick={() => (presetFilter = 3)}>Expert</ShaderButton>
				</div>
				{#each filteredPresets as preset}
					<button
						class="sp-cb-item"
						onclick={() => onpreset(preset)}
						type="button"
					>
						<div class="sp-cb-preset-top">
							<span class="sp-cb-name">{preset.name}</span>
							<span
								class="sp-cb-badge"
								style="background: {difficultyColor(preset.difficulty)}"
							>
								{difficultyLabel(preset.difficulty)}
							</span>
						</div>
						<span class="sp-cb-effect">{preset.psychEffect}</span>
						<span class="sp-cb-desc">{preset.description}</span>
					</button>
				{/each}

			{:else if activeSection === "saved"}
				<div class="sp-cb-actions">
					<ShaderButton onclick={onsave}>Save Module</ShaderButton>
					<ShaderButton onclick={onexport}>Export</ShaderButton>
					<ShaderButton onclick={onimport}>Import</ShaderButton>
				</div>
				{#if savedModules.length === 0}
					<p class="sp-cb-hint">No saved modules yet.</p>
				{:else}
					{#each savedModules as mod}
						<div class="sp-cb-saved-row">
							<div class="sp-cb-saved-info">
								<span class="sp-cb-name">{mod.name}</span>
								<span class="sp-cb-desc">{mod.description || "No description"}</span>
							</div>
							<div class="sp-cb-saved-actions">
								<ShaderButton onclick={() => onloadmodule(mod)}>Load</ShaderButton>
								<ShaderButton variant="danger" onclick={() => ondeletemodule(mod.id)}>Del</ShaderButton>
							</div>
						</div>
					{/each}
				{/if}

			{:else if activeSection === "snippets"}
				<input
					class="sp-cb-search"
					type="text"
					placeholder="Search snippets..."
					bind:value={snippetSearch}
				/>
				{#each SNIPPET_CATEGORIES as cat}
					{@const catSnippets = snippetsForCategory(cat)}
					{#if catSnippets.length > 0}
						<div class="sp-cb-snippet-cat">
							<span class="sp-cb-cat-label">{cat}</span>
							{#each catSnippets as snippet}
								<button
									class="sp-cb-item"
									onclick={() => oninsert(snippet.code, snippet.requiredUniforms)}
									type="button"
									title={snippet.hint ?? snippet.description}
								>
									<div class="sp-cb-preset-top">
										<span class="sp-cb-name">{snippet.name}</span>
										<span
											class="sp-cb-badge"
											style="background: {difficultyColor(snippet.difficulty)}"
										>
											{difficultyLabel(snippet.difficulty)}
										</span>
									</div>
									<span class="sp-cb-desc">{snippet.description}</span>
								</button>
							{/each}
						</div>
					{/if}
				{/each}
			{/if}
		</div>
	</Popover.Content>
</Popover.Root>

<style>
	/* ── Trigger ── */

	:global(.sp-cb-trigger) {
		all: unset;
		display: flex;
		align-items: center;
		color: var(--text-subtle);
		cursor: pointer;
		padding: 2px 4px;
	}

	:global(.sp-cb-trigger:hover) {
		color: var(--text-muted);
	}

	/* ── Panel ── */

	:global(.sp-cb-panel) {
		width: 320px;
		max-height: 480px;
		background: var(--bg);
		border: 1px solid var(--border);
		display: flex;
		flex-direction: column;
		z-index: 50;
	}

	/* ── Tabs ── */

	.sp-cb-tabs {
		display: flex;
		border-bottom: 1px solid var(--border-subtle);
		flex-shrink: 0;
	}

	.sp-cb-tab {
		all: unset;
		flex: 1;
		text-align: center;
		padding: 0.4rem 0.25rem;
		font-size: 0.625rem;
		font-family: var(--font-mono);
		color: var(--text-subtle);
		cursor: pointer;
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.sp-cb-tab:hover {
		color: var(--text-muted);
	}

	.sp-cb-tab.active {
		color: var(--accent);
		border-bottom: 1px solid var(--accent);
	}

	/* ── Body ── */

	.sp-cb-body {
		overflow-y: auto;
		padding: 0.5rem;
		flex: 1;
		min-height: 0;
	}

	/* ── Items ── */

	.sp-cb-item {
		all: unset;
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
		width: 100%;
		padding: 0.35rem 0.4rem;
		cursor: pointer;
		font-family: var(--font-main);
		box-sizing: border-box;
		border-radius: var(--radius-sm);
	}

	.sp-cb-item:hover {
		background: var(--surface);
	}

	.sp-cb-name {
		font-size: 0.7rem;
		color: var(--text-muted);
		font-weight: 500;
	}

	.sp-cb-desc {
		font-size: 0.6rem;
		color: var(--text-subtle);
	}

	.sp-cb-effect {
		font-size: 0.6rem;
		color: var(--accent);
	}

	.sp-cb-preset-top {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.sp-cb-badge {
		font-size: 0.5rem;
		padding: 0.05rem 0.25rem;
		border-radius: var(--radius-sm);
		color: var(--bg);
		font-weight: 600;
	}

	/* ── Filters ── */

	.sp-cb-filters {
		display: flex;
		gap: var(--space-xs);
		margin-bottom: 0.4rem;
		flex-wrap: wrap;
	}

	/* ── Actions ── */

	.sp-cb-actions {
		display: flex;
		gap: var(--space-xs);
		margin-bottom: 0.4rem;
	}

	.sp-cb-hint {
		font-size: 0.65rem;
		color: var(--text-subtle);
		margin: var(--space-xs) 0;
	}

	/* ── Saved ── */

	.sp-cb-saved-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.3rem 0;
		gap: var(--space-xs);
	}

	.sp-cb-saved-row + .sp-cb-saved-row {
		border-top: 1px solid var(--border-subtle);
	}

	.sp-cb-saved-info {
		display: flex;
		flex-direction: column;
		gap: 0.05rem;
		min-width: 0;
	}

	.sp-cb-saved-actions {
		display: flex;
		gap: var(--space-xs);
		flex-shrink: 0;
	}

	/* ── Snippets ── */

	.sp-cb-search {
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

	.sp-cb-search::placeholder {
		color: var(--text-subtle);
	}

	.sp-cb-snippet-cat {
		margin-bottom: var(--space-xs);
	}

	.sp-cb-cat-label {
		display: block;
		text-transform: capitalize;
		font-weight: 600;
		font-size: 0.65rem;
		color: var(--text-subtle);
		padding: var(--space-xs) 0 0.1rem;
	}
</style>
