<script lang="ts">
/**
 * RackModule — Generic wrapper for a rack module.
 *
 * Header: Chevron + Title + Port dots + Bypass switch + Context menu.
 * Body: Slot for module-specific controls.
 */

import { Collapsible, DropdownMenu, Switch } from "bits-ui";
import { ChevronRight, Copy, EllipsisVertical, Trash2 } from "lucide-svelte";
import { MODULE_REGISTRY } from "../modules/registry";
import type { RackModuleInstance } from "../modules/types";
import { SIGNAL_COLORS } from "../modules/types";
import type { Snippet } from "svelte";

interface Props {
	module: RackModuleInstance;
	ontoggleEnabled: () => void;
	ontoggleCollapsed: () => void;
	onremove: () => void;
	onduplicate: () => void;
	children?: Snippet;
}

let {
	module: mod,
	ontoggleEnabled,
	ontoggleCollapsed,
	onremove,
	onduplicate,
	children,
}: Props = $props();

const def = $derived(MODULE_REGISTRY.get(mod.type));
const inPorts = $derived(def?.ports.filter((p) => p.direction === "in") ?? []);
const outPorts = $derived(def?.ports.filter((p) => p.direction === "out") ?? []);
</script>

<div class="rack-module" class:disabled={!mod.enabled}>
	<Collapsible.Root open={!mod.collapsed} onOpenChange={() => ontoggleCollapsed()}>
		<div class="rack-module-header">
			<Collapsible.Trigger class="rack-module-chevron">
				<ChevronRight size={14} class={mod.collapsed ? "" : "rotated"} />
			</Collapsible.Trigger>

			<button class="rack-module-title" onclick={ontoggleCollapsed}>
				<span class="rack-module-label">{mod.label}</span>
				<span class="rack-module-type-badge">{mod.type.toUpperCase()}</span>
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
		</Collapsible.Content>
	</Collapsible.Root>
</div>
