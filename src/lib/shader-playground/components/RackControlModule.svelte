<script lang="ts">
	/**
	 * RackControlModule — Compact strip design for control modules.
	 *
	 * Collapsed (1 line): icon + title + LED + mini-preview + value + target
	 * Expanded: full controls (LFO, Slider, XY, Color)
	 */

	import { Accordion, Switch } from "bits-ui";
	import { ChevronDown, X } from "lucide-svelte";
	import LFOModule from "./controls/LFOModule.svelte";
	import XYPadModule from "./controls/XYPadModule.svelte";
	import SliderModule from "./controls/SliderModule.svelte";
	import ColorModule from "./controls/ColorModule.svelte";
	import type { RackControlModule as ControlModuleType } from "../rack/types";
	import type {
		ControlConfig,
		LFOConfig,
		SliderConfig,
		XYConfig,
		ColorConfig,
	} from "../rack/types";

	interface Props {
		module: ControlModuleType;
		onToggleEnabled: (id: string) => void;
		onRemove: (id: string) => void;
		onConfigChange: (id: string, config: ControlConfig) => void;
		onUniformChange: (name: string, value: number | number[] | boolean) => void;
	}

	let {
		module: mod,
		onToggleEnabled,
		onRemove,
		onConfigChange,
		onUniformChange,
	}: Props = $props();

	const ICONS: Record<string, string> = {
		lfo: "\u301C",
		slider: "\u2500",
		xy: "\u271B",
		color: "\u25C6",
	};

	// Mini-preview value for collapsed state
	const previewValue = $derived.by(() => {
		switch (mod.type) {
			case "lfo": {
				const c = mod.config as LFOConfig;
				return `${c.waveform.slice(0, 3).toUpperCase()} ${c.rate.toFixed(1)}Hz`;
			}
			case "slider": {
				const c = mod.config as SliderConfig;
				return c.value.toFixed(3);
			}
			case "xy": {
				const c = mod.config as XYConfig;
				return `${c.x.toFixed(2)}, ${c.y.toFixed(2)}`;
			}
			case "color": {
				const c = mod.config as ColorConfig;
				return c.hex;
			}
			default:
				return "";
		}
	});
</script>

<Accordion.Item
	value={mod.id}
	class="sp-rack-module sp-rack-control"
	data-bypassed={!mod.enabled}
	data-module-class="control"
>
	<Accordion.Header>
		<Accordion.Trigger class="sp-rack-header sp-ctrl-header">
			<!-- Icon -->
			<span class="sp-ctrl-icon">{ICONS[mod.type] ?? "\u25CF"}</span>

			<!-- Chevron -->
			<span class="sp-rack-chevron">
				<ChevronDown size={12} />
			</span>

			<!-- Title -->
			<span class="sp-ctrl-title">{mod.title}</span>

			<!-- Status LED -->
			<span
				class="sp-ctrl-led"
				data-status={mod.enabled ? "active" : "bypassed"}
			></span>

			<!-- Mini Preview (collapsed info) -->
			<span class="sp-ctrl-preview">{previewValue}</span>

			<!-- Target -->
			<span class="sp-ctrl-target">→ {mod.targetUniform}</span>

			<span class="sp-rack-spacer"></span>

			<!-- Bypass Switch -->
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<span
				class="sp-rack-switch-wrap"
				onclick={(e) => e.stopPropagation()}
				onkeydown={(e) => e.stopPropagation()}
			>
				<Switch.Root
					checked={mod.enabled}
					onCheckedChange={() => onToggleEnabled(mod.id)}
					class="sp-rack-switch"
				>
					<Switch.Thumb class="sp-rack-switch-thumb" />
				</Switch.Root>
			</span>

			<!-- Remove -->
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<span
				class="sp-ctrl-remove"
				onclick={(e) => {
					e.stopPropagation();
					onRemove(mod.id);
				}}
				onkeydown={(e) => e.stopPropagation()}
				title="Remove module"
			>
				<X size={11} />
			</span>
		</Accordion.Trigger>
	</Accordion.Header>

	<Accordion.Content class="sp-rack-body">
		<div class="sp-ctrl-body">
			{#if mod.type === "lfo"}
				<LFOModule
					config={mod.config}
					enabled={mod.enabled}
					targetUniform={mod.targetUniform}
					onConfigChange={(c) => onConfigChange(mod.id, c)}
					onUniformChange={onUniformChange}
				/>
			{:else if mod.type === "xy"}
				<XYPadModule
					config={mod.config}
					enabled={mod.enabled}
					targetUniform={mod.targetUniform}
					onConfigChange={(c) => onConfigChange(mod.id, c)}
					onUniformChange={onUniformChange}
				/>
			{:else if mod.type === "slider"}
				<SliderModule
					config={mod.config}
					enabled={mod.enabled}
					targetUniform={mod.targetUniform}
					onConfigChange={(c) => onConfigChange(mod.id, c)}
					onUniformChange={onUniformChange}
				/>
			{:else if mod.type === "color"}
				<ColorModule
					config={mod.config}
					enabled={mod.enabled}
					targetUniform={mod.targetUniform}
					onConfigChange={(c) => onConfigChange(mod.id, c)}
					onUniformChange={onUniformChange}
				/>
			{/if}
		</div>
	</Accordion.Content>
</Accordion.Item>

<style>
	/* Control module accent border */
	:global(.sp-rack-control) {
		border: 1px solid var(--accent-muted) !important;
	}

	:global(.sp-rack-control[data-bypassed="true"]) {
		opacity: 0.4;
		filter: saturate(0.3);
	}

	/* Compact header for control modules */
	:global(.sp-ctrl-header) {
		background: color-mix(in srgb, var(--surface) 90%, var(--accent-muted)) !important;
		gap: 5px !important;
		padding: 4px var(--space-xs) !important;
	}

	:global(.sp-ctrl-header:hover) {
		background: color-mix(in srgb, var(--surface) 80%, var(--accent-muted)) !important;
	}

	.sp-ctrl-icon {
		font-size: 0.75rem;
		flex-shrink: 0;
		color: var(--accent);
		width: 14px;
		text-align: center;
	}

	.sp-ctrl-title {
		font-size: 0.625rem;
		font-family: var(--font-mono);
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--text);
		flex-shrink: 0;
	}

	.sp-ctrl-led {
		width: 5px;
		height: 5px;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.sp-ctrl-led[data-status="active"] {
		background: var(--success);
		box-shadow: 0 0 3px var(--success);
	}

	.sp-ctrl-led[data-status="bypassed"] {
		background: var(--text-subtle);
		opacity: 0.3;
	}

	.sp-ctrl-preview {
		font-size: 0.5625rem;
		font-family: var(--font-mono);
		color: var(--text-muted);
		flex-shrink: 0;
		max-width: 120px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.sp-ctrl-target {
		font-size: 0.5rem;
		font-family: var(--font-mono);
		color: var(--accent);
		flex-shrink: 0;
		padding: 1px 4px;
		background: rgba(167, 139, 250, 0.08);
	}

	.sp-ctrl-remove {
		display: flex;
		align-items: center;
		color: var(--text-subtle);
		cursor: pointer;
		padding: 2px;
		flex-shrink: 0;
	}

	.sp-ctrl-remove:hover {
		color: var(--error);
	}

	.sp-ctrl-body {
		padding: var(--space-sm);
	}
</style>
