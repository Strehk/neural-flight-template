<script lang="ts">
/**
 * RackModule — Generic wrapper for a rack module.
 *
 * Header: Chevron + Title + Stage badge + Port dots + Code toggle + Bypass switch + Context menu.
 * Body Level 1: Slot for module-specific controls.
 * Body Level 2: TSL description (toggled by </> button).
 * data-stage attribute drives stage-colored left border.
 */

import { Collapsible, DropdownMenu, Switch } from "bits-ui";
import { ChevronRight, Code, Copy, EllipsisVertical, Trash2 } from "lucide-svelte";
import { MODULE_REGISTRY } from "../modules/registry";
import type { RackModuleInstance } from "../modules/types";
import { SIGNAL_COLORS, getStage } from "../modules/types";
import type { Snippet } from "svelte";
import TslDescriptionView from "./TslDescriptionView.svelte";

interface Props {
	module: RackModuleInstance;
	/** TSL description for this module (from codegen moduleDescriptions map) */
	snippet?: string;
	ontoggleEnabled: () => void;
	ontoggleCollapsed: () => void;
	ontoggleCodeExpanded: () => void;
	onremove: () => void;
	onduplicate: () => void;
	children?: Snippet;
}

let {
	module: mod,
	snippet = "",
	ontoggleEnabled,
	ontoggleCollapsed,
	ontoggleCodeExpanded,
	onremove,
	onduplicate,
	children,
}: Props = $props();

const def = $derived(MODULE_REGISTRY.get(mod.type));
const stage = $derived(getStage(mod.type));
const stageBadge = $derived(
	stage === "vertex" ? "VERT" : stage === "fragment" ? "FRAG" : "CTRL",
);
const inPorts = $derived(def?.ports.filter((p) => p.direction === "in") ?? []);
const outPorts = $derived(def?.ports.filter((p) => p.direction === "out") ?? []);
const hasCode = $derived(stage !== "control" && snippet.length > 0);
</script>

<div class="rack-module" class:disabled={!mod.enabled} data-stage={stage}>
	<Collapsible.Root open={!mod.collapsed} onOpenChange={() => ontoggleCollapsed()}>
		<div class="rack-module-header">
			<Collapsible.Trigger class="rack-module-chevron">
				<ChevronRight size={14} class={mod.collapsed ? "" : "rotated"} />
			</Collapsible.Trigger>

			<button class="rack-module-title" onclick={ontoggleCollapsed}>
				<span class="rack-module-label">{mod.label}</span>
				<span class="rack-module-stage-badge" data-stage={stage}>{stageBadge}</span>
			</button>

			<div class="rack-module-ports">
				{#each inPorts as port (port.name)}
					<span
						class="rack-port-dot port-in"
						style:background={SIGNAL_COLORS[port.type]}
						title="IN: {port.name} ({port.type})"
					></span>
				{/each}
				{#each outPorts as port (port.name)}
					<span
						class="rack-port-dot port-out"
						style:background={SIGNAL_COLORS[port.type]}
						title="OUT: {port.name} ({port.type})"
					></span>
				{/each}
			</div>

			<div class="rack-module-actions">
				{#if hasCode}
					<button
						class="rack-module-code-btn"
						class:active={mod.codeExpanded}
						onclick={ontoggleCodeExpanded}
						title="Toggle TSL description"
					>
						<Code size={12} />
					</button>
				{/if}

				<Switch.Root checked={mod.enabled} onCheckedChange={ontoggleEnabled} class="rack-bypass-switch">
					<Switch.Thumb class="rack-bypass-thumb" />
				</Switch.Root>

				<DropdownMenu.Root>
					<DropdownMenu.Trigger class="rack-module-menu-btn">
						<EllipsisVertical size={14} />
					</DropdownMenu.Trigger>
					<DropdownMenu.Content class="sp-dropdown-content" sideOffset={4}>
						<DropdownMenu.Item class="sp-dropdown-item" onSelect={onduplicate}>
							<Copy size={12} /> Duplicate
						</DropdownMenu.Item>
						<DropdownMenu.Separator class="sp-dropdown-separator" />
						<DropdownMenu.Item class="sp-dropdown-item sp-dropdown-danger" onSelect={onremove}>
							<Trash2 size={12} /> Remove
						</DropdownMenu.Item>
					</DropdownMenu.Content>
				</DropdownMenu.Root>
			</div>
		</div>

		<Collapsible.Content>
			{#if children && mod.enabled}
				<div class="rack-module-body">
					{@render children()}
				</div>
			{/if}

			{#if mod.codeExpanded && hasCode}
				<div class="rack-module-code">
					<TslDescriptionView code={snippet} compact />
				</div>
			{/if}
		</Collapsible.Content>
	</Collapsible.Root>
</div>
