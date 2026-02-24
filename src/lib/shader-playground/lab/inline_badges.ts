/**
 * Inline Uniform Badges — CM6 ViewPlugin
 *
 * Adds visual decorations to GLSL code:
 * 1. Declaration badges: After `uniform float u_lfo_1;` → widget with source + value
 * 2. Reference marks: `u_scale` in code body → colored background
 * 3. System badges: `u_time` → live value display
 *
 * Uses Decoration.widget() for end-of-line badges and
 * Decoration.mark() for inline reference highlighting.
 */

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
	ViewPlugin,
	type ViewUpdate,
	WidgetType,
} from "@codemirror/view";
import { SYSTEM_UNIFORMS } from "../uniforms";

// ── Types ──

interface UniformInfo {
	name: string;
	type: string;
	isSystem: boolean;
	source?: string;
}

// ── State Effect for external value updates ──

export const updateLiveValues = StateEffect.define<
	Map<string, number | number[]>
>();

// ── Live Values StateField ──

const liveValuesField = StateField.define<Map<string, number | number[]>>({
	create() {
		return new Map();
	},
	update(values, tr) {
		for (const effect of tr.effects) {
			if (effect.is(updateLiveValues)) return effect.value;
		}
		return values;
	},
});

// ── Control Sources StateField (which uniform is controlled by what) ──

export const updateControlSources = StateEffect.define<
	Map<string, string>
>();

const controlSourcesField = StateField.define<Map<string, string>>({
	create() {
		return new Map();
	},
	update(sources, tr) {
		for (const effect of tr.effects) {
			if (effect.is(updateControlSources)) return effect.value;
		}
		return sources;
	},
});

// ── Badge Widget ──

class UniformBadgeWidget extends WidgetType {
	constructor(
		readonly info: UniformInfo,
		readonly value: string,
	) {
		super();
	}

	toDOM(): HTMLElement {
		const badge = document.createElement("span");
		badge.className = "cm-uniform-badge";

		if (this.info.isSystem) {
			badge.classList.add("cm-badge-system");
			badge.textContent = `\u27FF ${this.value}`;
		} else if (this.info.source) {
			badge.classList.add("cm-badge-linked");
			badge.textContent = `${this.info.source} ${this.value}`;
		} else {
			badge.classList.add("cm-badge-endpoint");
			badge.textContent = this.value;
		}

		badge.title = `${this.info.name}: ${this.value}`;
		return badge;
	}

	eq(other: UniformBadgeWidget): boolean {
		return (
			this.info.name === other.info.name && this.value === other.value
		);
	}
}

// ── Helpers ──

const UNIFORM_DECL_RE = /^uniform\s+(\w+)\s+(\w+)\s*;/;
const SYSTEM_DISPLAY = new Set(["uTime", "uResolution", "uMouse"]);

function formatValue(v: number | number[] | undefined): string {
	if (v === undefined) return "\u2014";
	if (typeof v === "number") return v.toFixed(2);
	return v.map((n) => n.toFixed(2)).join(", ");
}

function isSystemUniform(name: string): boolean {
	return SYSTEM_UNIFORMS.has(name) || SYSTEM_DISPLAY.has(name);
}

// ── ViewPlugin: scans doc + builds decorations ──

function buildDecorations(view: EditorView): DecorationSet {
	const liveValues = view.state.field(liveValuesField);
	const controlSources = view.state.field(controlSourcesField);
	const decorations: Range<Decoration>[] = [];

	// Collect all uniform names declared in the document
	const declaredUniforms = new Map<string, UniformInfo>();

	for (let i = 1; i <= view.state.doc.lines; i++) {
		const line = view.state.doc.line(i);
		const match = line.text.match(UNIFORM_DECL_RE);
		if (!match) continue;

		const [, type, name] = match;
		const isSys = isSystemUniform(name);
		const source = controlSources.get(name);

		declaredUniforms.set(name, { name, type, isSystem: isSys, source });

		// Add end-of-line badge widget
		const value = liveValues.get(name);
		const displayValue = formatValue(value);

		const widget = Decoration.widget({
			widget: new UniformBadgeWidget(
				{ name, type, isSystem: isSys, source },
				displayValue,
			),
			side: 1,
		});
		decorations.push(widget.range(line.to));
	}

	// Mark references to uniforms in code body
	const uniformNames = [...declaredUniforms.keys()];
	if (uniformNames.length > 0) {
		const refPattern = new RegExp(
			`\\b(${uniformNames.map(escapeRegex).join("|")})\\b`,
			"g",
		);

		for (let i = 1; i <= view.state.doc.lines; i++) {
			const line = view.state.doc.line(i);
			// Skip declaration lines
			if (UNIFORM_DECL_RE.test(line.text)) continue;

			let m: RegExpExecArray | null;
			refPattern.lastIndex = 0;
			while ((m = refPattern.exec(line.text)) !== null) {
				const name = m[1];
				const info = declaredUniforms.get(name);
				if (!info) continue;

				const from = line.from + m.index;
				const to = from + name.length;

				const cssClass = info.isSystem
					? "cm-uniform-ref-system"
					: info.source
						? "cm-uniform-ref-linked"
						: "cm-uniform-ref-endpoint";

				decorations.push(
					Decoration.mark({ class: cssClass }).range(from, to),
				);
			}
		}
	}

	return Decoration.set(
		decorations.sort((a, b) => a.from - b.from),
	);
}

function escapeRegex(s: string): string {
	return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const badgePlugin = ViewPlugin.fromClass(
	class {
		decorations: DecorationSet;

		constructor(view: EditorView) {
			this.decorations = buildDecorations(view);
		}

		update(update: ViewUpdate): void {
			if (
				update.docChanged ||
				update.transactions.some((t) =>
					t.effects.some(
						(e) =>
							e.is(updateLiveValues) ||
							e.is(updateControlSources),
					),
				)
			) {
				this.decorations = buildDecorations(update.view);
			}
		}
	},
	{ decorations: (v) => v.decorations },
);

// ── Theme ──

const badgeTheme = EditorView.theme({
	".cm-uniform-badge": {
		display: "inline-block",
		marginLeft: "8px",
		padding: "0 5px",
		fontSize: "0.625rem",
		fontFamily: "var(--font-mono, monospace)",
		borderRadius: "2px",
		lineHeight: "1.6",
		verticalAlign: "middle",
		whiteSpace: "nowrap",
	},
	".cm-badge-system": {
		background: "#27272a",
		color: "#71717a",
	},
	".cm-badge-endpoint": {
		background: "rgba(250, 204, 21, 0.15)",
		color: "#facc15",
	},
	".cm-badge-linked": {
		background: "rgba(99, 102, 241, 0.15)",
		color: "#818cf8",
	},
	".cm-uniform-ref-system": {
		background: "rgba(113, 113, 122, 0.1)",
		borderBottom: "1px dotted #71717a",
	},
	".cm-uniform-ref-endpoint": {
		background: "rgba(250, 204, 21, 0.08)",
		borderBottom: "1px solid rgba(250, 204, 21, 0.3)",
	},
	".cm-uniform-ref-linked": {
		background: "rgba(99, 102, 241, 0.08)",
		borderBottom: "1px solid rgba(99, 102, 241, 0.3)",
	},
});

// ── Public Extension ──

export function inlineBadges(): Extension {
	return [liveValuesField, controlSourcesField, badgePlugin, badgeTheme];
}
