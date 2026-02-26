/**
 * Shared CodeMirror 6 Extensions — used by ShaderEditor (raw) and SlotCodeEditor (rack).
 *
 * SP16: No duplication of editor config between raw and rack mode.
 */

import {
	defaultKeymap,
	history,
	historyKeymap,
	indentWithTab,
} from "@codemirror/commands";
import { cpp } from "@codemirror/lang-cpp";
import {
	bracketMatching,
	foldGutter,
	foldKeymap,
	HighlightStyle,
	indentOnInput,
	syntaxHighlighting,
} from "@codemirror/language";
import {
	type Extension,
	type Range,
	StateEffect,
	StateField,
} from "@codemirror/state";
import {
	Decoration,
	type DecorationSet,
	EditorView,
	highlightActiveLine,
	keymap,
	lineNumbers,
} from "@codemirror/view";
import { tags } from "@lezer/highlight";

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

// ── GLSL Syntax Highlighting (via cpp() parser tokens) ──

const glslHighlightStyle = HighlightStyle.define([
	// Keywords: uniform, void, return, if, for, etc.
	{ tag: tags.keyword, color: "#a78bfa" },
	{ tag: tags.controlKeyword, color: "#a78bfa" },
	{ tag: tags.modifier, color: "#a78bfa" },
	// Types: float, vec3, mat4, int, bool, sampler2D
	{ tag: tags.typeName, color: "#fbbf24" },
	{ tag: tags.standard(tags.typeName), color: "#fbbf24" },
	// Numbers: 0.5, 3.14, 1
	{ tag: tags.number, color: "#fb923c" },
	{ tag: tags.integer, color: "#fb923c" },
	{ tag: tags.float, color: "#fb923c" },
	// Comments
	{ tag: tags.comment, color: "#71717a", fontStyle: "italic" },
	{ tag: tags.lineComment, color: "#71717a", fontStyle: "italic" },
	{ tag: tags.blockComment, color: "#71717a", fontStyle: "italic" },
	// Strings
	{ tag: tags.string, color: "#4ade80" },
	// Function names / calls (sin, normalize, texture, etc.)
	{ tag: tags.function(tags.variableName), color: "#67e8f9" },
	// Preprocessor directives (#define, #ifdef)
	{ tag: tags.processingInstruction, color: "#f87171" },
	{ tag: tags.meta, color: "#f87171" },
	// Operators
	{ tag: tags.operator, color: "#e0e0e0" },
	// Punctuation
	{ tag: tags.paren, color: "#a1a1aa" },
	{ tag: tags.brace, color: "#a1a1aa" },
	{ tag: tags.bracket, color: "#a1a1aa" },
	// Variable names
	{ tag: tags.variableName, color: "#e0e0e0" },
	{ tag: tags.definition(tags.variableName), color: "#c4b5fd" },
]);

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
				return Decoration.set(decorations.sort((a, b) => a.from - b.from));
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
		syntaxHighlighting(glslHighlightStyle),
		glslDarkTheme,
		errorLineField,
	];
}
