<script lang="ts">
/**
 * RackModule — Universal module in the Shader Rack.
 *
 * Renders both code modules (fixed/focus/main) and control modules.
 * All styling via shader-rack.css — no local <style> block.
 *
 * Code modules: pass `slot` prop → renders SlotCodeEditor + footer.
 * Control modules: pass `controlMod` prop + children snippet → renders custom body.
 */

import { Accordion, Switch } from "bits-ui";
import { ChevronDown, X } from "lucide-svelte";
import type { Snippet } from "svelte";
import { dragHandle } from "svelte-dnd-action";
import type {
	ColorConfig,
	ControlConfig,
	LFOConfig,
	RackControlModule,
	RackSlot,
	SliderConfig,
	XYConfig,
} from "../rack/types";
import type { ShaderError, UniformDef } from "../types";
import SlotCodeEditor from "./SlotCodeEditor.svelte";
import SlotUniformWidgets from "./SlotUniformWidgets.svelte";

interface Props {
	// Code module (optional — provide either slot OR controlMod)
	slot?: RackSlot;
	slotIndex?: number;
	slotErrors?: ShaderError[];
	onCodeChange?: (slotId: string, code: string) => void;
	parsedUniforms?: UniformDef[];
	liveValues?: Map<string, number | number[]>;
	controlSources?: Map<string, string>;

	// Control module (optional)
	controlMod?: RackControlModule;
	onRemove?: (id: string) => void;
	onConfigChange?: (id: string, config: ControlConfig) => void;

	// Shared
	onToggleEnabled: (id: string) => void;
	onUniformChange?: (name: string, value: number | number[] | boolean) => void;

	// Custom body content (used for control modules)
	children?: Snippet;
}

let {
	slot,
	slotIndex = 0,
	slotErrors = [],
	onCodeChange,
	parsedUniforms = [],
	liveValues,
	controlSources,
	controlMod,
	onRemove,
	onConfigChange,
	onToggleEnabled,
	onUniformChange,
	children,
}: Props = $props();

// ── Derived State ──

const isControl = $derived(!!controlMod);
const moduleId = $derived(slot?.id ?? controlMod?.id ?? "");
const moduleType = $derived(
	isControl ? "control" : (slot?.moduleClass ?? "fixed"),
);
const title = $derived(slot?.title ?? controlMod?.title ?? "");
const enabled = $derived(slot?.enabled ?? controlMod?.enabled ?? true);
const isFixed = $derived(moduleType === "fixed");
const isMain = $derived(moduleType === "main");
const canBypass = $derived(moduleType === "focus" || isControl);
const hasErrors = $derived(slotErrors.length > 0);

const ledStatus = $derived.by(() => {
	if (!enabled) return "bypassed";
	if (hasErrors) return "error";
	return "active";
});

const slotNumber = $derived(String(slotIndex + 1).padStart(2, "0"));

const fixedCount = $derived.by(() => {
	if (!isFixed || !slot) return "";
	const outputs = extractOutputs(slot.code);
	if (outputs.length > 0) return `${outputs.length} vars`;
	const lines = slot.code.split("\n").filter((l) => l.trim().length > 0).length;
	return `${lines} lines`;
});

const headerTags = $derived(slot?.tags ?? []);

// Control module helpers
const CTRL_ICONS: Record<string, string> = {
	lfo: "\u301C",
	slider: "\u2500",
	xy: "\u271B",
	color: "\u25C6",
};

const previewValue = $derived.by(() => {
	if (!controlMod) return "";
	switch (controlMod.type) {
		case "lfo": {
			const c = controlMod.config as LFOConfig;
			return `${c.waveform.slice(0, 3).toUpperCase()} ${c.rate.toFixed(1)}Hz`;
		}
		case "slider": {
			const c = controlMod.config as SliderConfig;
			return c.value.toFixed(3);
		}
		case "xy": {
			const c = controlMod.config as XYConfig;
			return `${c.x.toFixed(2)}, ${c.y.toFixed(2)}`;
		}
		case "color": {
			const c = controlMod.config as ColorConfig;
			return c.hex;
		}
		default:
			return "";
	}
});
</script>

<Accordion.Item
	value={moduleId}
	class="sp-module"
	data-module={moduleType}
	data-bypassed={!enabled}
>
	<!-- ── Header ── -->
	<Accordion.Header>
		<Accordion.Trigger class="sp-header" data-header={moduleType}>
			{#if isControl && controlMod}
				<!-- Control: icon + chevron + title + LED + preview + target + spacer + switch + remove -->
				<span class="sp-ctrl-icon">{CTRL_ICONS[controlMod.type] ?? "\u25CF"}</span>
				<span class="sp-chevron"><ChevronDown size={12} /></span>
				<span class="sp-title" data-module="control">{title}</span>
				<span class="sp-led" data-status={enabled ? "active" : "bypassed"}></span>
				<span class="sp-ctrl-preview">{previewValue}</span>
				<span class="sp-ctrl-target">&rarr; {controlMod.targetUniform}</span>
				<span class="sp-spacer"></span>
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<span class="sp-switch-wrap" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()}>
					<Switch.Root
						checked={enabled}
						onCheckedChange={() => onToggleEnabled(moduleId)}
						class="sp-switch"
					>
						<Switch.Thumb class="sp-switch-thumb" />
					</Switch.Root>
				</span>
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<span
					class="sp-ctrl-remove"
					onclick={(e) => { e.stopPropagation(); onRemove?.(moduleId); }}
					onkeydown={(e) => e.stopPropagation()}
					title="Remove module"
				>
					<X size={11} />
				</span>

			{:else if isFixed && slot}
				<!-- Fixed: slot# + chevron + title + tags + count -->
				<span class="sp-slot-num">{slotNumber}</span>
				<span class="sp-chevron"><ChevronDown size={12} /></span>
				<span class="sp-title" data-module="fixed">{title}</span>
				{#if headerTags.length > 0}
					{@const systemCount = headerTags.filter((t) => t.variant === "system").length}
					{@const endpointCount = headerTags.filter((t) => t.variant === "endpoint").length}
					{#if systemCount > 0}
						<span class="sp-tag" data-variant="system">system</span>
					{/if}
					{#if endpointCount > 0}
						<span class="sp-tag" data-variant="endpoint">endpoint</span>
					{/if}
				{/if}
				<span class="sp-spacer"></span>
				{#if hasErrors}
					<span class="sp-error-count">{slotErrors.length}</span>
				{/if}
				<span class="sp-fixed-count">{fixedCount}</span>

			{:else if slot}
				<!-- Focus/Main: port + slot# + chevron + title + LED + badge + spacer + switch + port -->
				<span class="sp-port" use:dragHandle>&#x25CF;</span>
				<span class="sp-slot-num">{slotNumber}</span>
				<span class="sp-chevron"><ChevronDown size={14} /></span>
				<span class="sp-title" data-module={moduleType}>{title}</span>
				<span class="sp-led" data-status={ledStatus}></span>
				<span class="sp-class-badge">
					{isMain ? "MAIN" : slot.type.toUpperCase()}
				</span>
				<span class="sp-spacer"></span>
				{#if hasErrors}
					<span class="sp-error-count">{slotErrors.length}</span>
				{/if}
				{#if canBypass}
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<span class="sp-switch-wrap" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()}>
						<Switch.Root
							checked={enabled}
							onCheckedChange={() => onToggleEnabled(moduleId)}
							class="sp-switch"
						>
							<Switch.Thumb class="sp-switch-thumb" />
						</Switch.Root>
					</span>
				{/if}
				<span class="sp-port" use:dragHandle>&#x25CF;</span>
			{/if}
		</Accordion.Trigger>
	</Accordion.Header>

	<!-- ── Body ── -->
	<Accordion.Content class="sp-body">
		{#if children}
			<div class="sp-ctrl-body">
				{@render children()}
			</div>
		{:else if slot}
			<SlotCodeEditor
				code={slot.code}
				errors={slotErrors}
				editable={slot.editable}
				{liveValues}
				{controlSources}
				onchange={(code) => onCodeChange?.(slot.id, code)}
			/>
			{#if parsedUniforms.length > 0 && onUniformChange}
				<SlotUniformWidgets
					uniforms={parsedUniforms}
					onchange={onUniformChange}
				/>
			{/if}
		{/if}
	</Accordion.Content>

	<!-- ── Footer (code modules only) ── -->
	{#if slot && !isControl}
		{@const outputs = extractOutputs(slot.code)}
		{@const inputs = extractInputs(slot.code)}
		<div class="sp-footer">
			<span class="sp-footer-label">IN</span>
			{#if inputs.length > 0}
				{#each inputs as name (name)}
					<span class="sp-io-tag">{name}</span>
				{/each}
			{:else}
				<span class="sp-io-none">--</span>
			{/if}
			<span class="sp-footer-sep">&vert;</span>
			<span class="sp-footer-label">OUT</span>
			{#if outputs.length > 0}
				{#each outputs as name (name)}
					<span class="sp-io-tag">{name}</span>
				{/each}
			{:else}
				<span class="sp-io-none">--</span>
			{/if}
		</div>
	{/if}
</Accordion.Item>

<script lang="ts" module>
	function extractOutputs(code: string): string[] {
		const names: string[] = [];
		for (const line of code.split("\n")) {
			const match = line
				.trim()
				.match(/^(?:uniform|varying)\s+\w+\s+(\w+)\s*;/);
			if (match) names.push(match[1]);
		}
		return names;
	}

	function extractInputs(code: string): string[] {
		const names: string[] = [];
		for (const line of code.split("\n")) {
			const defineMatch = line.trim().match(/^#define\s+\w+\s+(.+)/);
			if (defineMatch) continue;
			const varyingRead = line.trim().match(/varying\s+\w+\s+(\w+)/);
			if (varyingRead) continue;
		}
		const funcMatch = code.match(/\{([\s\S]*)\}/);
		if (funcMatch) {
			const body = funcMatch[1];
			const identifiers = body.match(/\bu_\w+\b/g);
			if (identifiers) {
				for (const id of new Set(identifiers)) {
					names.push(id);
				}
			}
		}
		return names;
	}
</script>
