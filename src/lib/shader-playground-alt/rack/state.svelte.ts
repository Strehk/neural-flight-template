/**
 * Shader Rack — Reactive State
 *
 * Bidirectional sync between RackSlots and PlaygroundState:
 *   pg.fragmentCode → parseToSlots() → slots   (external change)
 *   slot edit → slotsToGlsl() → pg.fragmentCode (rack edit)
 *
 * Must be called within a Svelte 5 reactive context (component setup).
 */

import { untrack } from "svelte";
import type { PlaygroundState } from "../playground_state.svelte";
import type { ShaderError } from "../types";
import { parseToSlots, slotsToGlsl } from "./parser";
import type {
	ControlConfig,
	ControlModuleType,
	RackControlModule,
	RackSlot,
} from "./types";

// ── Public Interface ──

export interface RackState {
	readonly slots: RackSlot[];
	readonly slotErrors: Map<string, ShaderError[]>;
	readonly controlModules: RackControlModule[];

	updateSlotCode(slotId: string, code: string): void;
	toggleSlotEnabled(slotId: string): void;
	toggleSlotCollapsed(slotId: string): void;
	reorderSlots(reorderedFocusSlots: RackSlot[]): void;
	reparse(): void;

	addControlModule(type: ControlModuleType, targetUniform: string): void;
	removeControlModule(id: string): void;
	toggleControlEnabled(id: string): void;
	toggleControlCollapsed(id: string): void;
	updateControlConfig(id: string, config: ControlConfig): void;
}

// ── Helpers ──

function preserveSlotState(newSlots: RackSlot[], oldSlots: RackSlot[]): void {
	for (const newSlot of newSlots) {
		const match = oldSlots.find(
			(old) => old.type === newSlot.type && old.title === newSlot.title,
		);
		if (match) {
			newSlot.collapsed = match.collapsed;
			newSlot.enabled = match.enabled;
		}
	}
}

/** Enforce didaktik defaults: main expanded, fixed slots collapsed. */
function applyDidaktikDefaults(slots: RackSlot[]): void {
	for (const slot of slots) {
		if (slot.type === "main") {
			slot.collapsed = false;
		} else if (slot.moduleClass === "fixed") {
			slot.collapsed = true;
		}
	}
}

function computeSlotErrors(
	errors: ShaderError[],
	slots: RackSlot[],
): Map<string, ShaderError[]> {
	const result = new Map<string, ShaderError[]>();
	if (errors.length === 0) return result;

	// Build line ranges for enabled slots in the reconstructed GLSL.
	// slotsToGlsl joins with "\n\n" → 1 empty line between slots.
	const ranges: { id: string; start: number; end: number }[] = [];
	let line = 1;

	for (const slot of slots) {
		if (!slot.enabled) continue;
		const lineCount = slot.code.split("\n").length;
		ranges.push({ id: slot.id, start: line, end: line + lineCount - 1 });
		line += lineCount + 1; // +1 for \n\n separator empty line
	}

	for (const error of errors) {
		for (const range of ranges) {
			if (error.line >= range.start && error.line <= range.end) {
				if (!result.has(range.id)) result.set(range.id, []);
				result.get(range.id)!.push({
					...error,
					line: error.line - range.start + 1, // slot-local line number
				});
				break;
			}
		}
	}

	return result;
}

// ── Persistence ──

const CONTROLS_STORAGE_KEY = "shader-rack-controls";

function saveControls(modules: RackControlModule[]): void {
	try {
		localStorage.setItem(CONTROLS_STORAGE_KEY, JSON.stringify(modules));
	} catch {
		// Storage full or unavailable — silently skip
	}
}

function loadControls(): RackControlModule[] {
	try {
		const raw = localStorage.getItem(CONTROLS_STORAGE_KEY);
		if (!raw) return [];
		return JSON.parse(raw) as RackControlModule[];
	} catch {
		return [];
	}
}

// ── Factory ──

let controlIdCounter = 0;

const DEFAULT_CONFIGS: Record<ControlModuleType, () => ControlConfig> = {
	lfo: () => ({ waveform: "sine" as const, rate: 1, min: 0, max: 1 }),
	slider: () => ({ value: 0.5, min: 0, max: 1, step: 0.01 }),
	xy: () => ({ x: 0, y: 0, minX: -1, maxX: 1, minY: -1, maxY: 1 }),
	color: () => ({ hex: "#a78bfa" }),
};

const CONTROL_TITLES: Record<ControlModuleType, string> = {
	lfo: "LFO",
	slider: "SLIDER",
	xy: "XY PAD",
	color: "COLOR",
};

export function createRackState(pg: PlaygroundState): RackState {
	const initialSlots = parseToSlots(pg.fragmentCode);
	applyDidaktikDefaults(initialSlots);
	let slots = $state<RackSlot[]>(initialSlots);
	const restored = loadControls();
	let controlModules = $state<RackControlModule[]>(restored);
	let lastSyncedGlsl = pg.fragmentCode;

	// Ensure counter doesn't clash with restored IDs
	for (const mod of restored) {
		const match = mod.id.match(/^ctrl-(\d+)$/);
		if (match) {
			controlIdCounter = Math.max(controlIdCounter, Number(match[1]) + 1);
		}
	}

	const slotErrors = $derived.by(() => computeSlotErrors(pg.errors, slots));

	// Detect external changes (template/preset loaded, raw editor edit).
	// untrack lastSyncedGlsl + slots so the effect ONLY fires on pg.fragmentCode changes.
	$effect(() => {
		const current = pg.fragmentCode;
		const synced = untrack(() => lastSyncedGlsl);
		if (current !== synced) {
			const oldSlots = untrack(() => [...slots]);
			const newSlots = parseToSlots(current);
			preserveSlotState(newSlots, oldSlots);
			applyDidaktikDefaults(newSlots);
			slots = newSlots;
			lastSyncedGlsl = current;
		}
	});

	function syncToPlayground(): void {
		const glsl = slotsToGlsl(slots);
		lastSyncedGlsl = glsl;
		pg.fragmentCode = glsl;
		pg.compile();
	}

	return {
		get slots() {
			return slots;
		},
		get slotErrors() {
			return slotErrors;
		},
		get controlModules() {
			return controlModules;
		},

		updateSlotCode(slotId: string, code: string): void {
			const slot = slots.find((s) => s.id === slotId);
			if (!slot || !slot.editable) return;
			slot.code = code;
			syncToPlayground();
		},

		toggleSlotEnabled(slotId: string): void {
			const slot = slots.find((s) => s.id === slotId);
			if (!slot) return;
			// Only focus modules can be bypassed — fixed and main are always active
			if (slot.moduleClass === "fixed" || slot.moduleClass === "main") return;
			slot.enabled = !slot.enabled;
			syncToPlayground();
		},

		toggleSlotCollapsed(slotId: string): void {
			const slot = slots.find((s) => s.id === slotId);
			if (!slot) return;
			slot.collapsed = !slot.collapsed;
		},

		reorderSlots(reorderedFocusSlots: RackSlot[]): void {
			const fixedSlots = slots.filter((s) => s.moduleClass === "fixed");
			slots = [...fixedSlots, ...reorderedFocusSlots];
			syncToPlayground();
		},

		reparse(): void {
			const oldSlots = [...slots];
			const newSlots = parseToSlots(pg.fragmentCode);
			preserveSlotState(newSlots, oldSlots);
			applyDidaktikDefaults(newSlots);
			slots = newSlots;
			lastSyncedGlsl = pg.fragmentCode;
		},

		addControlModule(type: ControlModuleType, targetUniform: string): void {
			const id = `ctrl-${controlIdCounter++}`;
			controlModules = [
				...controlModules,
				{
					id,
					type,
					title: `${CONTROL_TITLES[type]}`,
					targetUniform,
					enabled: true,
					collapsed: false,
					config: DEFAULT_CONFIGS[type](),
				},
			];
			saveControls(controlModules);
		},

		removeControlModule(id: string): void {
			controlModules = controlModules.filter((m) => m.id !== id);
			saveControls(controlModules);
		},

		toggleControlEnabled(id: string): void {
			const mod = controlModules.find((m) => m.id === id);
			if (mod) mod.enabled = !mod.enabled;
			saveControls(controlModules);
		},

		toggleControlCollapsed(id: string): void {
			const mod = controlModules.find((m) => m.id === id);
			if (mod) mod.collapsed = !mod.collapsed;
			saveControls(controlModules);
		},

		updateControlConfig(id: string, config: ControlConfig): void {
			const mod = controlModules.find((m) => m.id === id);
			if (mod) mod.config = config;
			saveControls(controlModules);
		},
	};
}
