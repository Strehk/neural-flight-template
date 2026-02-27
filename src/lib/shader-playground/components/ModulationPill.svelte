<script lang="ts">
/**
 * ModulationPill — CV-style parameter modulation dropdown.
 *
 * Shows which control module modulates a parameter.
 * Click opens dropdown with available control modules.
 * Styled as a small pill next to each slider label.
 */

import { DropdownMenu } from "bits-ui";
import type { ShaderRackState } from "../state.svelte";
import { getStage } from "../modules/types";

interface Props {
	rack: ShaderRackState;
	moduleId: string;
	paramName: string;
}

let { rack, moduleId, paramName }: Props = $props();

// Find the modulation route for this param (if any)
const route = $derived(
	rack.modulationRoutes.find(
		(r) => r.targetModuleId === moduleId && r.targetParam === paramName,
	),
);

// Available control modules (sources) — exclude self to prevent feedback loops
const controlModules = $derived(
	rack.modules.filter((m) => getStage(m.type) === "control" && m.enabled && m.id !== moduleId),
);

// Source module label (if assigned)
const sourceLabel = $derived(
	route
		? rack.modules.find((m) => m.id === route.sourceModuleId)?.label ?? "?"
		: null,
);

function assign(sourceModuleId: string): void {
	rack.addModulationRoute(sourceModuleId, moduleId, paramName);
}

function remove(): void {
	if (route) {
		rack.removeModulationRoute(route.id);
	}
}
</script>

<DropdownMenu.Root>
	<DropdownMenu.Trigger class={`mod-pill ${route ? "mod-pill-active" : ""}`}>
		{#if sourceLabel}
			<span class="mod-pill-dot"></span>
			<span class="mod-pill-label">{sourceLabel}</span>
		{:else}
			<span class="mod-pill-label">—</span>
		{/if}
		<span class="mod-pill-caret">▾</span>
	</DropdownMenu.Trigger>
	<DropdownMenu.Content class="sp-dropdown-content" sideOffset={4} align="end">
		{#if route}
			<DropdownMenu.Item class="sp-dropdown-item sp-dropdown-danger" onSelect={remove}>
				None (remove)
			</DropdownMenu.Item>
			<DropdownMenu.Separator class="sp-dropdown-separator" />
		{/if}
		{#each controlModules as ctrl (ctrl.id)}
			<DropdownMenu.Item
				class="sp-dropdown-item"
				onSelect={() => assign(ctrl.id)}
			>
				<span class="mod-pill-dot-menu"></span>
				{ctrl.label}
			</DropdownMenu.Item>
		{/each}
		{#if controlModules.length === 0}
			<div class="sp-dropdown-item" style="opacity: 0.5; cursor: default">
				No control modules
			</div>
		{/if}
	</DropdownMenu.Content>
</DropdownMenu.Root>

{#if route}
	<div class="mod-depth-row">
		<span class="mod-depth-label">Depth</span>
		<input
			class="mod-depth-input"
			type="range"
			min="0"
			max="1"
			step="0.01"
			value={route.depth}
			oninput={(e) => rack.updateModulationDepth(route.id, Number(e.currentTarget.value))}
		/>
		<span class="mod-depth-value">{route.depth.toFixed(2)}</span>
	</div>
{/if}
