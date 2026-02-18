<script lang="ts">
	import { onMount, onDestroy } from "svelte";
	import { EditorState, type Extension } from "@codemirror/state";
	import {
		EditorView,
		keymap,
		lineNumbers,
		highlightActiveLine,
		type ViewUpdate,
	} from "@codemirror/view";
	import {
		defaultKeymap,
		history,
		historyKeymap,
		indentWithTab,
	} from "@codemirror/commands";
	import { foldGutter, foldKeymap, bracketMatching, indentOnInput } from "@codemirror/language";
	import { autocompletion, type CompletionContext, type CompletionResult } from "@codemirror/autocomplete";
	import { cpp } from "@codemirror/lang-cpp";
	import type { ShaderError } from "../types";
	import { DEFAULT_VERTEX } from "../engine/renderer";
	import { getSnippetCompletions } from "../snippets";
	import {
		StateField,
		StateEffect,
		type Range,
	} from "@codemirror/state";
	import { Decoration, type DecorationSet } from "@codemirror/view";

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

	// ── Dark Theme ──

	const darkTheme = EditorView.theme(
		{
			"&": {
				backgroundColor: "#1a1a2e",
				color: "#e0e0e0",
				fontSize: "0.8rem",
				height: "100%",
			},
			".cm-content": {
				caretColor: "#7766cc",
				fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
			},
			"&.cm-focused .cm-cursor": {
				borderLeftColor: "#7766cc",
			},
			"&.cm-focused .cm-selectionBackground, .cm-selectionBackground":
				{
					backgroundColor: "#2a2a4e",
				},
			".cm-gutters": {
				backgroundColor: "#141420",
				color: "#555",
				border: "none",
			},
			".cm-activeLineGutter": {
				backgroundColor: "#1e1e34",
			},
			".cm-activeLine": {
				backgroundColor: "#1e1e30",
			},
			".cm-line-error": {
				backgroundColor: "#3a1111",
			},
		},
		{ dark: true },
	);

	// ── Error Line Decorations ──

	const setErrorLines = StateEffect.define<number[]>();

	const errorLineField = StateField.define<DecorationSet>({
		create() {
			return Decoration.none;
		},
		update(decos, tr) {
			for (const effect of tr.effects) {
				if (effect.is(setErrorLines)) {
					const decorations: Range<Decoration>[] = [];
					const doc = tr.state.doc;
					for (const lineNum of effect.value) {
						if (lineNum >= 1 && lineNum <= doc.lines) {
							const line = doc.line(lineNum);
							decorations.push(
								Decoration.line({
									class: "cm-line-error",
								}).range(line.from),
							);
						}
					}
					return Decoration.set(
						decorations.sort((a, b) => a.from - b.from),
					);
				}
			}
			return decos;
		},
		provide: (f) => EditorView.decorations.from(f),
	});

	// ── Editor Setup ──

	// ── Slash-Command Completion Source ──

	function slashCompletionSource(context: CompletionContext): CompletionResult | null {
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
			lineNumbers(),
			highlightActiveLine(),
			history(),
			foldGutter(),
			bracketMatching(),
			indentOnInput(),
			keymap.of([
				...defaultKeymap,
				...historyKeymap,
				...foldKeymap,
				indentWithTab,
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
			cpp(),
			darkTheme,
			errorLineField,
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
			mode === "fragment"
				? fragmentCode
				: (vertexCode ?? DEFAULT_VERTEX);
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
		const code = currentMode === "fragment" ? fragmentCode : (vertexCode ?? DEFAULT_VERTEX);
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
			mode === "fragment"
				? fragmentCode
				: (vertexCode ?? DEFAULT_VERTEX);
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

<style>
	.sp-shader-editor {
		display: flex;
		flex-direction: column;
		height: 100%;
		background: var(--surface);
	}

	.sp-editor-cm-wrap {
		flex: 1;
		overflow: hidden;
	}

	.sp-editor-cm-wrap :global(.cm-editor) {
		height: 100%;
	}

	.sp-editor-cm-wrap :global(.cm-scroller) {
		overflow: auto;
	}
</style>
