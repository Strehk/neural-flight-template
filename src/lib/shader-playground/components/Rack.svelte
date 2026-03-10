<script lang="ts">
/**
 * Rack — Scrollable module stack with grouped Add-Module dropdown.
 *
 * Uses CONTROL_COMPONENTS map instead of if/else chains.
 * Dropdown groups modules by stage (Vertex / Fragment / Controls).
 * Passes moduleDescriptions + modulation state to child components.
 */

import { DropdownMenu, Separator } from "bits-ui";
import { Plus } from "lucide-svelte";
import { MODULE_REGISTRY } from "../modules/registry";
import { MODULE_CATEGORIES, getStage } from "../modules/types";
import type { RackModuleType } from "../modules/types";
import type { ShaderRackState } from "../state.svelte";
import { CONTROL_COMPONENTS } from "../modules/controls/index";
import RackModule from "./RackModule.svelte";

interface Props {
	rack: ShaderRackState;
}

let { rack }: Props = $props();

// Drag & Drop state
let dragIndex = $state<number | null>(null);
let dragOverIndex = $state<number | null>(null);

function handleDragStart(index: number, e: DragEvent): void {
	dragIndex = index;
	if (e.dataTransfer) {
		e.dataTransfer.effectAllowed = "move";
		e.dataTransfer.setData("text/plain", String(index));
	}
}

function handleDragOver(index: number, e: DragEvent): void {
	e.preventDefault();
	dragOverIndex = index;
}

function handleDrop(toIndex: number, e: DragEvent): void {
	e.preventDefault();
	if (dragIndex !== null && dragIndex !== toIndex) {
		rack.reorder(dragIndex, toIndex);
	}
	dragIndex = null;
	dragOverIndex = null;
}

function handleDragEnd(): void {
	dragIndex = null;
	dragOverIndex = null;
}
</script>

<div class="rack-container">
	<div class="rack-modules">
		{#each rack.modules as mod, i (mod.id)}
			{@const ControlComponent = CONTROL_COMPONENTS[mod.type]}
			{@const snippet = rack.moduleDescriptions.get(mod.id) ?? ""}
			<div
				class="rack-module-slot"
				class:drag-over={dragOverIndex === i}
				draggable="true"
				ondragstart={(e) => handleDragStart(i, e)}
				ondragover={(e) => handleDragOver(i, e)}
				ondrop={(e) => handleDrop(i, e)}
				ondragend={handleDragEnd}
				role="listitem"
			>
				<RackModule
					module={mod}
					{snippet}
					ontoggleEnabled={() => rack.toggleEnabled(mod.id)}
					ontoggleCollapsed={() => rack.toggleCollapsed(mod.id)}
					ontoggleCodeExpanded={() => rack.toggleCodeExpanded(mod.id)}
					onremove={() => rack.removeModule(mod.id)}
					onduplicate={() => rack.duplicateModule(mod.id)}
				>
					{#if ControlComponent}
						<ControlComponent
							params={mod.params}
							onparamchange={(name, value) => rack.updateParam(mod.id, name, value)}
							moduleId={mod.id}
							{rack}
						/>
					{/if}
				</RackModule>
			</div>

			{#if i < rack.modules.length - 1}
				<Separator.Root class="rack-separator" />
			{/if}
		{/each}
	</div>

	<div class="rack-add-row">
		<DropdownMenu.Root>
			<DropdownMenu.Trigger class="rack-add-btn">
				<Plus size={14} />
				<span>Add Module</span>
			</DropdownMenu.Trigger>
			<DropdownMenu.Content class="sp-dropdown-content sp-dropdown-grouped" sideOffset={4}>
				{#each MODULE_CATEGORIES as category, ci (category.label)}
					{#if ci > 0}
						<DropdownMenu.Separator class="sp-dropdown-separator" />
					{/if}
					<div class="sp-dropdown-heading" data-stage={category.stage}>
						{category.label}
					</div>
					{#each category.types as type (type)}
						{@const def = MODULE_REGISTRY.get(type)}
						<DropdownMenu.Item
							class="sp-dropdown-item"
							onSelect={() => rack.addModule(type)}
						>
							{def?.label ?? type}
						</DropdownMenu.Item>
					{/each}
				{/each}
			</DropdownMenu.Content>
		</DropdownMenu.Root>
	</div>
</div>
