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
	} from "@codemirror/commands";
	import { cpp } from "@codemirror/lang-cpp";
	import type { ShaderError } from "../types";
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
		onchange: (fragment: string, vertex: string | null) => void;
	}

	let {
		fragmentCode = $bindable(),
		vertexCode = $bindable(),
		errors,
		onchange,
	}: Props = $props();

	let editorContainer: HTMLDivElement | undefined = $state();
	let view: EditorView | undefined = $state();
	let activeTab = $state<"fragment" | "vertex">("fragment");
	let debounceTimer: ReturnType<typeof setTimeout> | undefined;

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

	function createExtensions(): Extension[] {
		return [
			lineNumbers(),
			highlightActiveLine(),
			history(),
			keymap.of([...defaultKeymap, ...historyKeymap]),
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
			if (activeTab === "fragment") {
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

	// ── Tab Switching ──

	function switchTab(tab: "fragment" | "vertex"): void {
		if (tab === activeTab) return;

		// Save current code
		if (view) {
			const currentCode = view.state.doc.toString();
			if (activeTab === "fragment") {
				fragmentCode = currentCode;
			} else {
				vertexCode = currentCode;
			}
		}

		activeTab = tab;

		// Load new code
		if (view && editorContainer) {
			const newCode =
				tab === "fragment"
					? fragmentCode
					: (vertexCode ?? defaultVertexShader());
			view.dispatch({
				changes: {
					from: 0,
					to: view.state.doc.length,
					insert: newCode,
				},
			});
		}
	}

	function defaultVertexShader(): string {
		return `varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;
	}

	// ── Lifecycle ──

	onMount(() => {
		if (!editorContainer) return;
		view = createEditor(editorContainer, fragmentCode);
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
</script>

<div class="sp-shader-editor">
	<!-- Tabs -->
	<div class="sp-editor-tabs">
		<button
			class="sp-editor-tab"
			class:active={activeTab === "fragment"}
			onclick={() => switchTab("fragment")}
			type="button"
		>
			Fragment
		</button>
		<button
			class="sp-editor-tab"
			class:active={activeTab === "vertex"}
			onclick={() => switchTab("vertex")}
			type="button"
		>
			Vertex
		</button>
	</div>

	<!-- CodeMirror Container -->
	<div class="sp-editor-cm-wrap" bind:this={editorContainer}></div>
</div>
