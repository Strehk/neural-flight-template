<script lang="ts">
import {
	autocompletion,
	type CompletionContext,
	type CompletionResult,
} from "@codemirror/autocomplete";
import { EditorState, type Extension } from "@codemirror/state";
import { EditorView, keymap, type ViewUpdate } from "@codemirror/view";
import { onDestroy, onMount } from "svelte";
import { createBaseExtensions, setErrorLines } from "../editor_extensions";
import { DEFAULT_VERTEX } from "../engine/renderer";
import { getSnippetCompletions } from "../snippets";
import type { ShaderError } from "../types";

interface Props {
	fragmentCode: string;
	vertexCode: string | null;
	errors: ShaderError[];
	mode: "fragment" | "vertex";
	onchange: (fragment: string, vertex: string | null) => void;
	oncompile?: () => void;
}

let {
	fragmentCode = $bindable(),
	vertexCode = $bindable(),
	errors,
	mode,
	onchange,
	oncompile,
}: Props = $props();

let editorContainer: HTMLDivElement | undefined = $state();
let view: EditorView | undefined = $state();
let currentMode = $state<"fragment" | "vertex">("fragment");
let debounceTimer: ReturnType<typeof setTimeout> | undefined;
let suppressSync = false; // Prevent sync loop when user types

// ── Slash-Command Completion Source ──

function slashCompletionSource(
	context: CompletionContext,
): CompletionResult | null {
	const line = context.state.doc.lineAt(context.pos);
	const textBefore = line.text.slice(0, context.pos - line.from);
	const match = textBefore.match(/^\s*\/(\w*)$/);
	if (!match) return null;

	const completions = getSnippetCompletions();
	return {
		from: line.from + (match.index ?? 0),
		options: completions,
		filter: true,
	};
}

function createExtensions(): Extension[] {
	return [
		...createBaseExtensions(),
		keymap.of([
			{
				key: "Mod-Enter",
				run: () => {
					oncompile?.();
					return true;
				},
			},
		]),
		autocompletion({
			override: [slashCompletionSource],
			activateOnTyping: true,
		}),
		EditorView.updateListener.of((update: ViewUpdate) => {
			if (update.docChanged) {
				handleDocChange(update.state.doc.toString());
			}
		}),
	];
}

function handleDocChange(code: string): void {
	if (debounceTimer) clearTimeout(debounceTimer);
	debounceTimer = setTimeout(() => {
		suppressSync = true;
		if (currentMode === "fragment") {
			fragmentCode = code;
			onchange(code, vertexCode);
		} else {
			vertexCode = code;
			onchange(fragmentCode, code);
		}
	}, 300);
}

function createEditor(container: HTMLDivElement, doc: string): EditorView {
	const state = EditorState.create({
		doc,
		extensions: createExtensions(),
	});
	return new EditorView({ state, parent: container });
}

// ── Mode Switching (driven by parent via prop) ──

$effect(() => {
	if (mode === currentMode) return;
	if (!view) return;

	// Save current code
	const currentCode = view.state.doc.toString();
	if (currentMode === "fragment") {
		fragmentCode = currentCode;
	} else {
		vertexCode = currentCode;
	}

	currentMode = mode;

	// Load new code
	const newCode =
		mode === "fragment" ? fragmentCode : (vertexCode ?? DEFAULT_VERTEX);
	view.dispatch({
		changes: {
			from: 0,
			to: view.state.doc.length,
			insert: newCode,
		},
	});
});

// ── Sync external code changes into CodeMirror ──
// When fragmentCode/vertexCode change externally (template load, preset, etc.)
// we must push the new content into the imperative CodeMirror editor.

$effect(() => {
	const code =
		currentMode === "fragment" ? fragmentCode : (vertexCode ?? DEFAULT_VERTEX);
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

// ── Lifecycle ──

onMount(() => {
	if (!editorContainer) return;
	currentMode = mode;
	const initialCode =
		mode === "fragment" ? fragmentCode : (vertexCode ?? DEFAULT_VERTEX);
	view = createEditor(editorContainer, initialCode);
});

onDestroy(() => {
	if (debounceTimer) clearTimeout(debounceTimer);
	view?.destroy();
});

// ── Update error decorations when errors change ──

$effect(() => {
	if (!view) return;
	const lineNums = errors.filter((e) => e.line > 0).map((e) => e.line);
	view.dispatch({
		effects: setErrorLines.of(lineNums),
	});
});

/** Insert code at cursor position (used by snippet drawer) */
export function insertCode(code: string): void {
	if (!view) return;
	const cursor = view.state.selection.main.head;
	view.dispatch({
		changes: { from: cursor, insert: `\n${code}\n` },
	});
}

/** Scroll editor to a specific line and highlight it */
export function scrollToLine(line: number): void {
	if (!view) return;
	const doc = view.state.doc;
	if (line < 1 || line > doc.lines) return;
	const lineInfo = doc.line(line);
	view.dispatch({
		selection: { anchor: lineInfo.from },
		effects: EditorView.scrollIntoView(lineInfo.from, { y: "center" }),
	});
	view.focus();
}
</script>

<div class="sp-shader-editor">
	<div class="sp-editor-cm-wrap" bind:this={editorContainer}></div>
</div>

