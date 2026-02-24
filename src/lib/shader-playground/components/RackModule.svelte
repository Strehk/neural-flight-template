<script lang="ts">
	/**
	 * RackModule — Single module in the Shader Rack.
	 *
	 * Fixed modules: Compact header (chevron + title + count only)
	 * Focus modules: Prominent header (drag handle + LED + badge + bypass)
	 */

	import { Accordion, Switch } from "bits-ui";
	import { dragHandle } from "svelte-dnd-action";
	import { ChevronDown } from "lucide-svelte";
	import SlotCodeEditor from "./SlotCodeEditor.svelte";
	import SlotUniformWidgets from "./SlotUniformWidgets.svelte";
	import type { RackSlot } from "../rack/types";
	import type { ShaderError, UniformDef } from "../types";

	interface Props {
		slot: RackSlot;
		slotIndex: number;
		slotErrors: ShaderError[];
		onCodeChange: (slotId: string, code: string) => void;
		onToggleEnabled: (slotId: string) => void;
		onUniformChange: (name: string, value: number | number[] | boolean) => void;
		parsedUniforms?: UniformDef[];
		liveValues?: Map<string, number | number[]>;
		controlSources?: Map<string, string>;
	}

	let {
		slot,
		slotIndex,
		slotErrors,
		onCodeChange,
		onToggleEnabled,
		onUniformChange,
		parsedUniforms = [],
		liveValues,
		controlSources,
	}: Props = $props();

	const isMain = $derived(slot.type === "main");
	const isFixed = $derived(slot.moduleClass === "fixed");
	const canBypass = $derived(slot.moduleClass === "focus" && !isMain);
	const hasErrors = $derived(slotErrors.length > 0);

	// Status LED for focus modules: error = red, active = green, bypassed = dim
	const ledStatus = $derived.by(() => {
		if (!slot.enabled) return "bypassed";
		if (hasErrors) return "error";
		return "active";
	});

	// Count for fixed modules (lines of meaningful code)
	const fixedCount = $derived.by(() => {
		if (!isFixed) return "";
		const outputs = extractOutputs(slot.code);
		if (outputs.length > 0) return `${outputs.length} vars`;
		const lines = slot.code.split("\n").filter((l) => l.trim().length > 0).length;
		return `${lines} lines`;
	});
</script>

<Accordion.Item
	value={slot.id}
	class="sp-rack-module"
	data-bypassed={!slot.enabled}
	data-module-class={slot.moduleClass}
>
	<!-- ── Header ── -->
	<Accordion.Header>
		<Accordion.Trigger class="sp-rack-header" data-header-class={slot.moduleClass}>
			{#if isFixed}
				<!-- Fixed: Compact — just chevron + title + count -->
				<span class="sp-rack-chevron">
					<ChevronDown size={12} />
				</span>
				<span class="sp-rack-title" data-module-class="fixed">{slot.title}</span>
				<span class="sp-rack-spacer"></span>
				{#if hasErrors}
					<span class="sp-rack-error-count">{slotErrors.length}</span>
				{/if}
				<span class="sp-fixed-count">{fixedCount}</span>
			{:else}
				<!-- Focus: Full header — drag handle + chevron + title + LED + badge + bypass -->
				<span class="sp-rack-port" use:dragHandle>●</span>

				<span class="sp-rack-chevron">
					<ChevronDown size={14} />
				</span>

				<span class="sp-rack-title" data-module-class="focus">{slot.title}</span>

				<span class="sp-rack-led" data-status={ledStatus}></span>

				<span class="sp-rack-class-badge">
					{isMain ? "MAIN" : slot.type.toUpperCase()}
				</span>

				<span class="sp-rack-spacer"></span>

				{#if hasErrors}
					<span class="sp-rack-error-count">{slotErrors.length}</span>
				{/if}

				{#if canBypass}
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<span class="sp-rack-switch-wrap" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()}>
						<Switch.Root
							checked={slot.enabled}
							onCheckedChange={() => onToggleEnabled(slot.id)}
							class="sp-rack-switch"
						>
							<Switch.Thumb class="sp-rack-switch-thumb" />
						</Switch.Root>
					</span>
				{/if}

				<span class="sp-rack-port" use:dragHandle>●</span>
			{/if}
		</Accordion.Trigger>
	</Accordion.Header>

	<!-- ── Body ── -->
	<Accordion.Content class="sp-rack-body">
		<SlotCodeEditor
			code={slot.code}
			errors={slotErrors}
			editable={slot.editable}
			{liveValues}
			{controlSources}
			onchange={(code) => onCodeChange(slot.id, code)}
		/>
		{#if parsedUniforms.length > 0}
			<SlotUniformWidgets
				uniforms={parsedUniforms}
				onchange={onUniformChange}
			/>
		{/if}
	</Accordion.Content>

	<!-- ── Footer (focus only) ── -->
	{#if !isFixed}
		{@const outputs = extractOutputs(slot.code)}
		<div class="sp-rack-footer">
			{#if outputs.length > 0}
				<span class="sp-rack-footer-label">OUTPUTS</span>
				{#each outputs as name (name)}
					<span class="sp-rack-io-tag">{name}</span>
				{/each}
			{:else}
				<span class="sp-rack-footer-label">{slot.type}</span>
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
</script>

<style>
	/* ══════════════════════════════════════════
	   Module Container
	   ══════════════════════════════════════════ */

	:global(.sp-rack-module) {
		overflow: hidden;
		transition: opacity var(--transition-slow), filter var(--transition-slow);
	}

	:global(.sp-rack-module[data-module-class="fixed"]) {
		border: 1px solid var(--border-subtle);
		background: var(--bg);
	}

	:global(.sp-rack-module[data-module-class="focus"]) {
		border: 1px solid var(--border);
		background: var(--surface);
	}

	:global(.sp-rack-module[data-bypassed="true"]) {
		opacity: 0.4;
		filter: saturate(0.3);
	}

	/* ══════════════════════════════════════════
	   Header
	   ══════════════════════════════════════════ */

	:global(.sp-rack-header) {
		all: unset;
		box-sizing: border-box;
		display: flex;
		align-items: center;
		gap: var(--space-xs);
		cursor: pointer;
		width: 100%;
		font-family: var(--font-mono);
		user-select: none;
	}

	/* Fixed header: more compact */
	:global(.sp-rack-header[data-header-class="fixed"]) {
		padding: 4px var(--space-sm);
		background: var(--bg);
	}

	:global(.sp-rack-header[data-header-class="fixed"]:hover) {
		background: color-mix(in srgb, var(--bg) 80%, var(--surface));
	}

	/* Focus header: standard */
	:global(.sp-rack-header[data-header-class="focus"]) {
		padding: 6px var(--space-xs);
		background: var(--surface);
	}

	:global(.sp-rack-header[data-header-class="focus"]:hover) {
		background: color-mix(in srgb, var(--surface) 80%, var(--border));
	}

	/* ── Port Circles (drag handles) ── */

	.sp-rack-port {
		font-size: 0.5rem;
		line-height: 1;
		flex-shrink: 0;
		cursor: grab;
		color: var(--accent-muted);
		opacity: 0.7;
	}

	/* ── Chevron ── */

	.sp-rack-chevron {
		display: flex;
		align-items: center;
		color: var(--text-subtle);
		transition: transform var(--transition-fast);
		flex-shrink: 0;
	}

	:global(.sp-rack-module[data-state="open"]) .sp-rack-chevron {
		transform: rotate(0deg);
	}

	:global(.sp-rack-module[data-state="closed"]) .sp-rack-chevron {
		transform: rotate(-90deg);
	}

	/* ── Title ── */

	.sp-rack-title {
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.sp-rack-title[data-module-class="fixed"] {
		font-size: 0.625rem;
		color: var(--text-muted);
	}

	.sp-rack-title[data-module-class="focus"] {
		font-size: 0.75rem;
		color: var(--text);
	}

	/* ── Fixed Count ── */

	.sp-fixed-count {
		font-size: 0.5rem;
		font-family: var(--font-mono);
		color: var(--text-subtle);
		flex-shrink: 0;
	}

	/* ── Status LED (focus only) ── */

	.sp-rack-led {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.sp-rack-led[data-status="active"] {
		background: var(--success);
		box-shadow: 0 0 4px var(--success);
	}

	.sp-rack-led[data-status="error"] {
		background: var(--error);
		box-shadow: 0 0 4px var(--error);
	}

	.sp-rack-led[data-status="bypassed"] {
		background: var(--text-subtle);
		opacity: 0.4;
	}

	/* ── Class Badge ── */

	.sp-rack-class-badge {
		font-size: 0.5rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		padding: 1px 5px;
		background: var(--accent-muted);
		color: var(--text);
		flex-shrink: 0;
	}

	/* ── Spacer ── */

	.sp-rack-spacer {
		flex: 1;
	}

	/* ── Error Count ── */

	.sp-rack-error-count {
		font-size: 0.5rem;
		font-weight: 700;
		padding: 0 4px;
		background: var(--error);
		color: var(--bg);
		flex-shrink: 0;
	}

	/* ── Bypass Switch ── */

	.sp-rack-switch-wrap {
		display: flex;
		align-items: center;
		flex-shrink: 0;
	}

	:global(.sp-rack-switch) {
		width: 28px;
		height: 14px;
		background: var(--border);
		border: none;
		padding: 2px;
		cursor: pointer;
		display: flex;
		align-items: center;
	}

	:global(.sp-rack-switch[data-state="checked"]) {
		background: var(--accent-muted);
	}

	:global(.sp-rack-switch-thumb) {
		display: block;
		width: 10px;
		height: 10px;
		background: var(--text);
		transition: transform var(--transition-fast);
	}

	:global(.sp-rack-switch[data-state="checked"] .sp-rack-switch-thumb) {
		transform: translateX(14px);
	}

	/* ══════════════════════════════════════════
	   Body
	   ══════════════════════════════════════════ */

	:global(.sp-rack-body) {
		border-top: 1px solid var(--border-subtle);
		padding: 0;
	}

	:global(.sp-rack-body[data-state="closed"]) {
		display: none;
	}

	/* ══════════════════════════════════════════
	   Footer
	   ══════════════════════════════════════════ */

	.sp-rack-footer {
		display: flex;
		align-items: center;
		gap: 4px;
		padding: 3px var(--space-sm);
		border-top: 1px solid var(--border-subtle);
		flex-wrap: wrap;
		min-height: 20px;
		background: color-mix(in srgb, var(--surface) 60%, var(--bg));
	}

	.sp-rack-footer-label {
		font-size: 0.5rem;
		font-family: var(--font-mono);
		color: var(--text-subtle);
		text-transform: uppercase;
		letter-spacing: 0.06em;
	}

	.sp-rack-io-tag {
		font-size: 0.5rem;
		font-family: var(--font-mono);
		padding: 1px 4px;
		background: var(--border);
		color: var(--text-muted);
		white-space: nowrap;
	}
</style>
