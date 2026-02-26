<script lang="ts">
/**
 * SlotCodeEditor — Mini CodeMirror for a single Rack slot.
 *
 * Uses shared extensions from editor_extensions.ts (SP16).
 * Auto-heights to content with max-height scroll.
 */

import { EditorState } from "@codemirror/state";
import { EditorView, type ViewUpdate } from "@codemirror/view";
import { onDestroy, onMount } from "svelte";
import { createBaseExtensions, setErrorLines } from "../editor_extensions";
import {
	inlineBadges,
	updateControlSources,
	updateLiveValues,
} from "../lab/inline_badges";
import type { ShaderError } from "../types";

interface Props {
	code: string;
	errors?: ShaderError[];
	editable?: boolean;
	liveValues?: Map<string, number | number[]>;
	controlSources?: Map<string, string>;
	onchange?: (code: string) => void;
}

let {
	code,
	errors = [],
	editable = true,
	liveValues,
	controlSources,
	onchange,
}: Props = $props();

let container: HTMLDivElement | undefined = $state();
let view: EditorView | undefined = $state();
let debounceTimer: ReturnType<typeof setTimeout> | undefined;
let suppressSync = false;

function handleDocChange(newCode: string): void {
	if (debounceTimer) clearTimeout(debounceTimer);
	debounceTimer = setTimeout(() => {
		suppressSync = true;
		onchange?.(newCode);
	}, 300);
}

function createEditor(parent: HTMLDivElement): EditorView {
	return new EditorView({
		state: EditorState.create({
			doc: code,
			extensions: [
				...createBaseExtensions(),
				inlineBadges(),
				EditorState.readOnly.of(!editable),
				EditorView.updateListener.of((update: ViewUpdate) => {
					if (update.docChanged && onchange) {
						handleDocChange(update.state.doc.toString());
					}
				}),
			],
		}),
		parent,
	});
}

// Sync external code changes into CodeMirror
$effect(() => {
	if (!view) return;
	if (suppressSync) {
		suppressSync = false;
		return;
	}
	const current = view.state.doc.toString();
	if (code !== current) {
		view.dispatch({
			changes: { from: 0, to: view.state.doc.length, insert: code },
		});
	}
});

// Sync error decorations
$effect(() => {
	if (!view) return;
	const lineNums = errors.filter((e) => e.line > 0).map((e) => e.line);
	view.dispatch({ effects: setErrorLines.of(lineNums) });
});

// Sync live uniform values into badges
$effect(() => {
	if (!view || !liveValues) return;
	view.dispatch({ effects: updateLiveValues.of(liveValues) });
});

// Sync control source mapping into badges
$effect(() => {
	if (!view || !controlSources) return;
	view.dispatch({ effects: updateControlSources.of(controlSources) });
});

onMount(() => {
	if (container) view = createEditor(container);
});

onDestroy(() => {
	if (debounceTimer) clearTimeout(debounceTimer);
	view?.destroy();
});
</script>

<div class="sp-slot-editor" bind:this={container}></div>

