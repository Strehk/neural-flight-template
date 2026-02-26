<script lang="ts">
/**
 * ShaderRack — Vertical Accordion + Drag & Drop container.
 *
 * Three zones inside a single Accordion.Root:
 *   1. Fixed zone (top) — header, uniforms, varyings, defines. Static.
 *   2. Focus zone (middle) — functions, main, custom. Draggable.
 *   3. Control zone (bottom) — LFO, Slider, XY, Color via RackModule.
 *
 * All styling via shader-rack.css — no local <style> block.
 */

import { Accordion, Popover, ToggleGroup } from "bits-ui";
import { Plus } from "lucide-svelte";
import { dragHandleZone, TRIGGERS } from "svelte-dnd-action";
import type { PlaygroundState } from "../playground_state.svelte";
import type { RackState } from "../rack/state.svelte";
import type { ControlModuleType, RackSlot } from "../rack/types";
import type { UniformDef } from "../types";
import { parseUniforms } from "../uniforms";
import ColorModule from "./controls/ColorModule.svelte";
import LFOModule from "./controls/LFOModule.svelte";
import SliderModule from "./controls/SliderModule.svelte";
import XYPadModule from "./controls/XYPadModule.svelte";
import RackModule from "./RackModule.svelte";
import StatusBar from "./StatusBar.svelte";

interface Props {
	rackState: RackState;
	pg: PlaygroundState;
}

let { rackState, pg }: Props = $props();

const FLIP_DURATION_MS = 200;

// ── Slot Zones ──

const fixedSlots = $derived(
	rackState.slots.filter((s) => s.moduleClass === "fixed"),
);

let focusSlots = $state<RackSlot[]>([]);

$effect(() => {
	const newFocus = rackState.slots.filter((s) => s.moduleClass !== "fixed");
	const currentIds = focusSlots.map((s) => s.id).join(",");
	const newIds = newFocus.map((s) => s.id).join(",");
	if (currentIds !== newIds) {
		focusSlots = newFocus;
	}
});

// ── Accordion State ──

const openSlotIds = $derived([
	...rackState.slots.filter((s) => !s.collapsed).map((s) => s.id),
	...rackState.controlModules.filter((m) => !m.collapsed).map((m) => m.id),
]);

function handleValueChange(value: string[]): void {
	for (const slot of rackState.slots) {
		const shouldBeOpen = value.includes(slot.id);
		if (slot.collapsed === shouldBeOpen) {
			rackState.toggleSlotCollapsed(slot.id);
		}
	}
	for (const mod of rackState.controlModules) {
		const shouldBeOpen = value.includes(mod.id);
		if (mod.collapsed === shouldBeOpen) {
			rackState.toggleControlCollapsed(mod.id);
		}
	}
}

// ── DnD Handlers ──

function handleDndConsider(e: CustomEvent<{ items: RackSlot[] }>): void {
	focusSlots = e.detail.items;
}

function handleDndFinalize(
	e: CustomEvent<{ items: RackSlot[]; info: { trigger: string } }>,
): void {
	focusSlots = e.detail.items;
	if (e.detail.info.trigger === TRIGGERS.DROPPED_INTO_ZONE) {
		rackState.reorderSlots(focusSlots);
	}
}

// ── Helpers ──

function getEndpointUniforms(code: string): UniformDef[] {
	return parseUniforms(code).filter((u) => u.endpoint);
}

function globalIndex(slot: RackSlot): number {
	return rackState.slots.indexOf(slot);
}

const controlSources = $derived.by(() => {
	const map = new Map<string, string>();
	for (const mod of rackState.controlModules) {
		if (mod.enabled) {
			map.set(mod.targetUniform, mod.title);
		}
	}
	return map;
});

// ── Add Module ──

let addMenuOpen = $state(false);

const CONTROL_TYPES: {
	type: ControlModuleType;
	label: string;
	icon: string;
}[] = [
	{ type: "lfo", label: "LFO", icon: "\u301C" },
	{ type: "slider", label: "Slider", icon: "\u2500" },
	{ type: "xy", label: "XY Pad", icon: "\u271B" },
	{ type: "color", label: "Color", icon: "\u25C6" },
];

const availableTargets = $derived(pg.endpointUniforms.map((u) => u.name));

let selectedControlType = $state<ControlModuleType>("lfo");
let selectedTarget = $state("");

$effect(() => {
	if (availableTargets.length === 1 && !selectedTarget) {
		selectedTarget = availableTargets[0];
	}
});

function handleAddModule(): void {
	if (!selectedTarget) return;
	rackState.addControlModule(selectedControlType, selectedTarget);
	addMenuOpen = false;
	selectedTarget = "";
}

function handleTypeChange(value: string): void {
	if (value) selectedControlType = value as ControlModuleType;
}
</script>

<div class="sp-rack-wrap">
<Accordion.Root
	type="multiple"
	value={openSlotIds}
	onValueChange={handleValueChange}
	class="sp-rack"
>
	<!-- Fixed Zone (locked, no DnD) -->
	{#each fixedSlots as slot (slot.id)}
		<RackModule
			{slot}
			slotIndex={globalIndex(slot)}
			slotErrors={rackState.slotErrors.get(slot.id) ?? []}
			onCodeChange={rackState.updateSlotCode}
			onToggleEnabled={rackState.toggleSlotEnabled}
			onUniformChange={pg.updateUniform}
			parsedUniforms={slot.type === "uniforms" ? getEndpointUniforms(slot.code) : []}
			liveValues={pg.liveUniformValues}
			{controlSources}
		/>
	{/each}

	<!-- Focus Zone (draggable) -->
	<div
		class="sp-dnd-zone"
		use:dragHandleZone={{
			items: focusSlots,
			flipDurationMs: FLIP_DURATION_MS,
			type: "rack-focus",
		}}
		onconsider={handleDndConsider}
		onfinalize={handleDndFinalize}
	>
		{#each focusSlots as slot (slot.id)}
			<RackModule
				{slot}
				slotIndex={globalIndex(slot)}
				slotErrors={rackState.slotErrors.get(slot.id) ?? []}
				onCodeChange={rackState.updateSlotCode}
				onToggleEnabled={rackState.toggleSlotEnabled}
				onUniformChange={pg.updateUniform}
				parsedUniforms={slot.type === "uniforms" ? getEndpointUniforms(slot.code) : []}
				liveValues={pg.liveUniformValues}
				{controlSources}
			/>
		{/each}
	</div>

	<!-- Status Bar -->
	<StatusBar
		controlModules={rackState.controlModules}
		fps={pg.fps}
		compileOk={pg.compileOk}
		errorCount={pg.errors.length}
	/>

	<!-- Control Modules Zone (via RackModule + children snippet) -->
	{#each rackState.controlModules as mod (mod.id)}
		<RackModule
			controlMod={mod}
			onToggleEnabled={rackState.toggleControlEnabled}
			onRemove={rackState.removeControlModule}
			onConfigChange={rackState.updateControlConfig}
			onUniformChange={pg.updateUniform}
		>
			{#if mod.type === "lfo"}
				<LFOModule
					config={mod.config}
					enabled={mod.enabled}
					targetUniform={mod.targetUniform}
					onConfigChange={(c) => rackState.updateControlConfig(mod.id, c)}
					onUniformChange={pg.updateUniform}
				/>
			{:else if mod.type === "xy"}
				<XYPadModule
					config={mod.config}
					enabled={mod.enabled}
					targetUniform={mod.targetUniform}
					onConfigChange={(c) => rackState.updateControlConfig(mod.id, c)}
					onUniformChange={pg.updateUniform}
				/>
			{:else if mod.type === "slider"}
				<SliderModule
					config={mod.config}
					enabled={mod.enabled}
					targetUniform={mod.targetUniform}
					onConfigChange={(c) => rackState.updateControlConfig(mod.id, c)}
					onUniformChange={pg.updateUniform}
				/>
			{:else if mod.type === "color"}
				<ColorModule
					config={mod.config}
					enabled={mod.enabled}
					targetUniform={mod.targetUniform}
					onConfigChange={(c) => rackState.updateControlConfig(mod.id, c)}
					onUniformChange={pg.updateUniform}
				/>
			{/if}
		</RackModule>
	{/each}
</Accordion.Root>

<!-- Add Module Popover -->
<div class="sp-add">
	<Popover.Root bind:open={addMenuOpen}>
		<Popover.Trigger
			class="sp-add-trigger"
			disabled={availableTargets.length === 0}
			title={availableTargets.length === 0 ? "Add @endpoint annotation to a uniform first" : "Add control module"}
		>
			<Plus size={14} />
			Add Module
		</Popover.Trigger>
		<Popover.Content class="sp-add-menu" sideOffset={4} side="top">
			<div class="sp-add-row">
				<span class="sp-add-label">TYPE</span>
				<ToggleGroup.Root
					type="single"
					value={selectedControlType}
					onValueChange={handleTypeChange}
					class="sp-add-types"
				>
					{#each CONTROL_TYPES as ct (ct.type)}
						<ToggleGroup.Item value={ct.type}>
							<span class="sp-add-icon">{ct.icon}</span>
							{ct.label}
						</ToggleGroup.Item>
					{/each}
				</ToggleGroup.Root>
			</div>

			<div class="sp-add-row">
				<span class="sp-add-label">TARGET</span>
				{#if availableTargets.length > 0}
					<select
						class="sp-add-select"
						bind:value={selectedTarget}
					>
						<option value="">Select uniform...</option>
						{#each availableTargets as name (name)}
							<option value={name}>{name}</option>
						{/each}
					</select>
				{:else}
					<span class="sp-add-hint">No @endpoint uniforms found</span>
				{/if}
			</div>

			<div class="sp-add-actions">
				<button class="sp-add-confirm" onclick={handleAddModule} disabled={!selectedTarget}>
					Add {CONTROL_TYPES.find((c) => c.type === selectedControlType)?.label}
				</button>
				<button class="sp-add-cancel" onclick={() => (addMenuOpen = false)}>
					Cancel
				</button>
			</div>
		</Popover.Content>
	</Popover.Root>
</div>
</div>
