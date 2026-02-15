<script lang="ts">
	import type { ShaderModule } from "../types";

	interface Props {
		modules: ShaderModule[];
		onload: (module: ShaderModule) => void;
		ondelete: (id: string) => void;
	}

	let { modules, onload, ondelete }: Props = $props();

	let collapsed = $state(true);
</script>

{#if modules.length > 0}
	<div class="sp-module-library">
		<button
			class="sp-library-header"
			onclick={() => (collapsed = !collapsed)}
			type="button"
		>
			<span>Saved Modules ({modules.length})</span>
			<span class="sp-panel-toggle">{collapsed ? "+" : "-"}</span>
		</button>

		{#if !collapsed}
			<ul class="sp-module-list">
				{#each modules as mod}
					<li class="sp-module-item">
						<div class="sp-module-info">
							<span class="sp-module-name">{mod.name}</span>
							<span class="sp-module-desc">{mod.description || "No description"}</span>
						</div>
						<div class="sp-module-actions">
							<button class="sp-action-btn" onclick={() => onload(mod)} type="button">
								Load
							</button>
							<button
								class="sp-action-btn delete"
								onclick={() => ondelete(mod.id)}
								type="button"
							>
								Del
							</button>
						</div>
					</li>
				{/each}
			</ul>
		{/if}
	</div>
{/if}
