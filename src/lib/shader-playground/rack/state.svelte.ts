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
import type { RackSlot } from "./types";
import { parseToSlots, slotsToGlsl } from "./parser";

// ── Public Interface ──

export interface RackState {
	readonly slots: RackSlot[];
	readonly slotErrors: Map<string, ShaderError[]>;

	updateSlotCode(slotId: string, code: string): void;
	toggleSlotEnabled(slotId: string): void;
	toggleSlotCollapsed(slotId: string): void;
	reparse(): void;
}

// ── Helpers ──

function preserveSlotState(
	newSlots: RackSlot[],
	oldSlots: RackSlot[],
): void {
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

// ── Factory ──

export function createRackState(pg: PlaygroundState): RackState {
	let slots = $state<RackSlot[]>(parseToSlots(pg.fragmentCode));
	let lastSyncedGlsl = pg.fragmentCode;

	const slotErrors = $derived.by(() =>
		computeSlotErrors(pg.errors, slots),
	);

	// Detect external changes (template/preset loaded, raw editor edit).
	// untrack lastSyncedGlsl + slots so the effect ONLY fires on pg.fragmentCode changes.
	$effect(() => {
		const current = pg.fragmentCode;
		const synced = untrack(() => lastSyncedGlsl);
		if (current !== synced) {
			const oldSlots = untrack(() => [...slots]);
			const newSlots = parseToSlots(current);
			preserveSlotState(newSlots, oldSlots);
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

		updateSlotCode(slotId: string, code: string): void {
			const slot = slots.find((s) => s.id === slotId);
			if (!slot || !slot.editable) return;
			slot.code = code;
			syncToPlayground();
		},

		toggleSlotEnabled(slotId: string): void {
			const slot = slots.find((s) => s.id === slotId);
			if (!slot || slot.type === "main") return; // SP19: main always active
			slot.enabled = !slot.enabled;
			syncToPlayground();
		},

		toggleSlotCollapsed(slotId: string): void {
			const slot = slots.find((s) => s.id === slotId);
			if (!slot) return;
			slot.collapsed = !slot.collapsed;
		},

		reparse(): void {
			const oldSlots = [...slots];
			const newSlots = parseToSlots(pg.fragmentCode);
			preserveSlotState(newSlots, oldSlots);
			slots = newSlots;
			lastSyncedGlsl = pg.fragmentCode;
		},
	};
}
