<script lang="ts">
	import type { PresetDef } from "../types";
	import { PRESETS } from "../presets/index";

	interface Props {
		open: boolean;
		onselect: (preset: PresetDef) => void;
		onclose: () => void;
	}

	let { open, onselect, onclose }: Props = $props();

	let filter = $state<"all" | 1 | 2 | 3>("all");
	let selectedPreset = $state<PresetDef | null>(null);

	const filtered = $derived(
		filter === "all"
			? PRESETS
			: PRESETS.filter((p) => p.difficulty === filter),
	);

	function difficultyColor(d: 1 | 2 | 3): string {
		if (d === 1) return "#44cc44";
		if (d === 2) return "#ccaa44";
		return "#cc4444";
	}

	function difficultyLabel(d: 1 | 2 | 3): string {
		if (d === 1) return "Beginner";
		if (d === 2) return "Intermediate";
		return "Advanced";
	}

	function handleSelect(preset: PresetDef): void {
		selectedPreset = preset;
	}

	function handleLoad(): void {
		if (selectedPreset) {
			onselect(selectedPreset);
			selectedPreset = null;
		}
	}

	function handleOverlayKeydown(e: KeyboardEvent): void {
		if (e.key === "Escape") onclose();
	}
</script>

{#if open}
	<div
		class="sp-preset-overlay"
		onclick={onclose}
		onkeydown={handleOverlayKeydown}
		role="dialog"
		aria-modal="true"
		aria-label="Preset Browser"
		tabindex="-1"
	>
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="sp-preset-browser" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()}>
			<div class="sp-browser-header">
				<h2>Immersive Effect Presets</h2>
				<button class="sp-browser-close" onclick={onclose} type="button">x</button>
			</div>

			<!-- Filters -->
			<div class="sp-filter-bar">
				<button
					class="sp-filter-btn"
					class:active={filter === "all"}
					onclick={() => (filter = "all")}
					type="button"
				>All</button>
				<button
					class="sp-filter-btn"
					class:active={filter === 1}
					onclick={() => (filter = 1)}
					type="button"
					style="--accent: #44cc44"
				>Beginner</button>
				<button
					class="sp-filter-btn"
					class:active={filter === 2}
					onclick={() => (filter = 2)}
					type="button"
					style="--accent: #ccaa44"
				>Intermediate</button>
				<button
					class="sp-filter-btn"
					class:active={filter === 3}
					onclick={() => (filter = 3)}
					type="button"
					style="--accent: #cc4444"
				>Advanced</button>
			</div>

			<!-- Grid -->
			<div class="sp-preset-grid">
				{#each filtered as preset (preset.id)}
					<button
						class="sp-preset-card"
						class:selected={selectedPreset?.id === preset.id}
						onclick={() => handleSelect(preset)}
						type="button"
					>
						<div class="sp-card-top">
							<span class="sp-card-name">{preset.name}</span>
							<span
								class="sp-card-badge"
								style="background: {difficultyColor(preset.difficulty)}"
							>
								{difficultyLabel(preset.difficulty)}
							</span>
						</div>
						<span class="sp-card-effect">{preset.psychEffect}</span>
						<span class="sp-card-desc">{preset.description}</span>
					</button>
				{/each}
			</div>

			<!-- Selected preset detail -->
			{#if selectedPreset}
				<div class="sp-preset-detail">
					<div class="sp-detail-header">
						<h3>{selectedPreset.name}</h3>
						<button class="sp-load-btn" onclick={handleLoad} type="button">
							Load Preset
						</button>
					</div>
					<p class="sp-science-note">{selectedPreset.scienceNote}</p>
					<div class="sp-tutorial-section">
						<span class="sp-tutorial-label">Explore:</span>
						<ul>
							{#each selectedPreset.tutorial.explore as step}
								<li>{step}</li>
							{/each}
						</ul>
						<span class="sp-tutorial-label">Challenge:</span>
						<p>{selectedPreset.tutorial.challenge}</p>
						<span class="sp-tutorial-label">Psych Tip:</span>
						<p class="sp-psych-tip">{selectedPreset.tutorial.psychTip}</p>
					</div>
				</div>
			{/if}
		</div>
	</div>
{/if}
