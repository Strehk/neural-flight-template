/**
 * Shared CodeMirror 6 Extensions — used by ShaderEditor (raw) and SlotCodeEditor (rack).
 *
 * SP16: No duplication of editor config between raw and rack mode.
 */

import {
	StateField,
	StateEffect,
	type Extension,
	type Range,
} from "@codemirror/state";
import {
	EditorView,
	keymap,
	lineNumbers,
	highlightActiveLine,
	Decoration,
	type DecorationSet,
} from "@codemirror/view";
import {
	defaultKeymap,
	history,
	historyKeymap,
	indentWithTab,
} from "@codemirror/commands";
import {
	foldGutter,
	foldKeymap,
	bracketMatching,
	indentOnInput,
} from "@codemirror/language";
import { cpp } from "@codemirror/lang-cpp";

// ── Dark Theme ──

export const glslDarkTheme = EditorView.theme(
	{
		"&": {
			backgroundColor: "#1a1a2e",
			color: "#e0e0e0",
			fontSize: "0.8rem",
		},
		".cm-content": {
			caretColor: "#7766cc",
			fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
		},
		"&.cm-focused .cm-cursor": {
			borderLeftColor: "#7766cc",
		},
		"&.cm-focused .cm-selectionBackground, .cm-selectionBackground": {
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

export const setErrorLines = StateEffect.define<number[]>();

export const errorLineField = StateField.define<DecorationSet>({
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
							Decoration.line({ class: "cm-line-error" }).range(line.from),
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

// ── Base Extensions ──

export function createBaseExtensions(): Extension[] {
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
		]),
		cpp(),
		glslDarkTheme,
		errorLineField,
	];
}
