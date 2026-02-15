<script lang="ts">
	import type { UniformDef } from "../types";
	import { SNIPPETS, SNIPPET_CATEGORIES } from "../snippets";

	interface Props {
		open: boolean;
		oninsert: (code: string, requiredUniforms?: UniformDef[]) => void;
		ontoggle: () => void;
	}

	let { open, oninsert, ontoggle }: Props = $props();

	let search = $state("");
	let expandedCategories = $state<Set<string>>(new Set(SNIPPET_CATEGORIES));

	const filteredSnippets = $derived(
		search.trim()
			? SNIPPETS.filter(
					(s) =>
						s.name.toLowerCase().includes(search.toLowerCase()) ||
						s.description.toLowerCase().includes(search.toLowerCase()) ||
						s.category.toLowerCase().includes(search.toLowerCase()),
				)
			: SNIPPETS,
	);

	function snippetsForCategory(category: string) {
		return filteredSnippets.filter((s) => s.category === category);
	}

	function toggleCategory(cat: string): void {
		const next = new Set(expandedCategories);
		if (next.has(cat)) {
			next.delete(cat);
		} else {
			next.add(cat);
		}
		expandedCategories = next;
	}

	function difficultyColor(d: 1 | 2 | 3): string {
		if (d === 1) return "#44cc44";
		if (d === 2) return "#ccaa44";
		return "#cc4444";
	}

	function difficultyLabel(d: 1 | 2 | 3): string {
		if (d === 1) return "Beginner";
		if (d === 2) return "Mid";
		return "Advanced";
	}
</script>

{#if open}
	<div class="sp-snippet-drawer">
		<div class="sp-drawer-header">
			<span class="sp-drawer-title">Snippets</span>
			<button class="sp-drawer-close" onclick={ontoggle} type="button">x</button>
		</div>

		<input
			class="sp-search-input"
			type="text"
			placeholder="Search snippets..."
			bind:value={search}
		/>

		<div class="sp-drawer-content">
			{#each SNIPPET_CATEGORIES as cat}
				{@const catSnippets = snippetsForCategory(cat)}
				{#if catSnippets.length > 0}
					<div class="sp-category">
						<button
							class="sp-category-header"
							onclick={() => toggleCategory(cat)}
							type="button"
						>
							<span class="sp-category-name">{cat}</span>
							<span class="sp-category-count">{catSnippets.length}</span>
							<span class="sp-expand-icon">{expandedCategories.has(cat) ? "-" : "+"}</span>
						</button>

						{#if expandedCategories.has(cat)}
							<div class="sp-category-items">
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
					</div>
				{/if}
			{/each}
		</div>
	</div>
{/if}
