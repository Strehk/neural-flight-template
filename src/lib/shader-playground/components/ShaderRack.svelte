<script lang="ts">
	/**
	 * ShaderRack — Vertical Accordion + Drag & Drop container.
	 *
	 * Three zones inside a single Accordion.Root:
	 *   1. Fixed zone (top) — header, uniforms, varyings, defines. Static.
	 *   2. Focus zone (middle) — functions, main, custom. Draggable.
	 *   3. Control zone (bottom) — LFO, Slider, XY, Color. Interactive.
	 *
	 * "+ Add Module" button at the bottom for adding control modules.
	 */

	import { Accordion } from "bits-ui";
	import { dragHandleZone, TRIGGERS } from "svelte-dnd-action";
	import { Plus } from "lucide-svelte";
	import RackModule from "./RackModule.svelte";
	import RackControlModule from "./RackControlModule.svelte";
	import StatusBar from "./StatusBar.svelte";
	import type { RackState } from "../rack/state.svelte";
	import type { PlaygroundState } from "../playground_state.svelte";
	import type { UniformDef } from "../types";
	import type { RackSlot, ControlModuleType } from "../rack/types";
	import { parseUniforms } from "../uniforms";

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
		const newFocus = rackState.slots.filter((s) => s.moduleClass === "focus");
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

	function handleDndFinalize(e: CustomEvent<{ items: RackSlot[]; info: { trigger: string } }>): void {
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

	// Build control sources map: uniform name → module title
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

	const CONTROL_TYPES: { type: ControlModuleType; label: string; icon: string }[] = [
		{ type: "lfo", label: "LFO", icon: "〰" },
		{ type: "slider", label: "Slider", icon: "─" },
		{ type: "xy", label: "XY Pad", icon: "✛" },
		{ type: "color", label: "Color", icon: "◆" },
	];

	// Available target uniforms from endpoint uniforms
	const availableTargets = $derived(pg.endpointUniforms.map((u) => u.name));

	let selectedControlType = $state<ControlModuleType>("lfo");
	let selectedTarget = $state("");

	function handleAddModule(): void {
		if (!selectedTarget) return;
		rackState.addControlModule(selectedControlType, selectedTarget);
		addMenuOpen = false;
		selectedTarget = "";
	}
</script>

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
		class="sp-rack-dnd-zone"
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

	<!-- Control Modules Zone -->
	{#each rackState.controlModules as mod (mod.id)}
		<RackControlModule
			module={mod}
			onToggleEnabled={rackState.toggleControlEnabled}
			onRemove={rackState.removeControlModule}
			onConfigChange={rackState.updateControlConfig}
			onUniformChange={pg.updateUniform}
		/>
	{/each}
</Accordion.Root>

<!-- Add Module Button -->
<div class="sp-rack-add">
	{#if addMenuOpen}
		<div class="sp-add-menu">
			<div class="sp-add-row">
				<span class="sp-add-label">TYPE</span>
				<div class="sp-add-types">
					{#each CONTROL_TYPES as ct (ct.type)}
						<button
							class="sp-add-type-btn"
							class:active={selectedControlType === ct.type}
							onclick={() => (selectedControlType = ct.type)}
						>
							<span class="sp-add-icon">{ct.icon}</span>
							{ct.label}
						</button>
					{/each}
				</div>
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
		</div>
	{:else}
		<button class="sp-add-btn" onclick={() => (addMenuOpen = true)}>
			<Plus size={14} />
			Add Module
		</button>
	{/if}
</div>

<style>
	:global(.sp-rack) {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		padding: 0.5rem;
		overflow-y: auto;
		height: 100%;
	}

	.sp-rack-dnd-zone {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	/* ── Add Module ── */

	.sp-rack-add {
		padding: 0.5rem;
		flex-shrink: 0;
	}

	.sp-add-btn {
		all: unset;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-xs);
		width: 100%;
		padding: var(--space-sm);
		border: 1px dashed var(--border);
		color: var(--text-muted);
		font-family: var(--font-mono);
		font-size: 0.75rem;
		cursor: pointer;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		box-sizing: border-box;
	}

	.sp-add-btn:hover {
		border-color: var(--accent-muted);
		color: var(--accent);
	}

	.sp-add-menu {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
		padding: var(--space-sm);
		border: 1px solid var(--accent-muted);
		background: var(--surface);
	}

	.sp-add-row {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
	}

	.sp-add-label {
		font-size: 0.5625rem;
		font-family: var(--font-mono);
		color: var(--text-subtle);
		text-transform: uppercase;
		min-width: 3rem;
		flex-shrink: 0;
	}

	.sp-add-types {
		display: flex;
		gap: 2px;
		flex-wrap: wrap;
	}

	.sp-add-type-btn {
		all: unset;
		font-size: 0.625rem;
		font-family: var(--font-mono);
		padding: 3px 8px;
		background: var(--border);
		color: var(--text-muted);
		cursor: pointer;
		display: flex;
		align-items: center;
		gap: 4px;
	}

	.sp-add-type-btn:hover {
		color: var(--text);
	}

	.sp-add-type-btn.active {
		background: var(--accent-muted);
		color: var(--text);
	}

	.sp-add-icon {
		font-size: 0.75rem;
	}

	.sp-add-select {
		flex: 1;
		background: var(--bg);
		border: 1px solid var(--border);
		color: var(--text);
		font-family: var(--font-mono);
		font-size: 0.625rem;
		padding: 4px 8px;
	}

	.sp-add-hint {
		font-size: 0.5625rem;
		font-family: var(--font-mono);
		color: var(--text-subtle);
		font-style: italic;
	}

	.sp-add-actions {
		display: flex;
		gap: var(--space-xs);
	}

	.sp-add-confirm {
		all: unset;
		font-size: 0.625rem;
		font-family: var(--font-mono);
		padding: 4px 12px;
		background: var(--accent-muted);
		color: var(--text);
		cursor: pointer;
		text-transform: uppercase;
	}

	.sp-add-confirm:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.sp-add-confirm:not(:disabled):hover {
		background: var(--accent);
		color: var(--bg);
	}

	.sp-add-cancel {
		all: unset;
		font-size: 0.625rem;
		font-family: var(--font-mono);
		padding: 4px 12px;
		background: var(--border);
		color: var(--text-muted);
		cursor: pointer;
		text-transform: uppercase;
	}

	.sp-add-cancel:hover {
		color: var(--text);
	}
</style>
