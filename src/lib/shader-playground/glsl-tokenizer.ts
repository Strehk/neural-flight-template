/**
 * GLSL Tokenizer — Lightweight regex-based tokenizer for syntax highlighting.
 *
 * 7 token types, ~60 lines. No external dependencies.
 * Produces spans with CSS classes for GlslSnippetView.
 */

export type GlslTokenType =
	| "keyword"
	| "type"
	| "builtin"
	| "uniform"
	| "number"
	| "comment"
	| "punct"
	| "text";

export interface GlslToken {
	type: GlslTokenType;
	value: string;
}

const TOKEN_RULES: [GlslTokenType, RegExp][] = [
	["comment", /\/\/.*/],
	["uniform", /u_[a-z0-9_]+|mod_[a-z0-9_]+/],
	["type", /\b(?:float|vec[234]|mat[234]|int|bool|void|sampler2D)\b/],
	[
		"keyword",
		/\b(?:uniform|varying|attribute|precision|highp|mediump|lowp|return|if|else|for|while|break|continue|struct|const|in|out|inout)\b/,
	],
	[
		"builtin",
		/\b(?:sin|cos|tan|asin|acos|atan|pow|exp|log|sqrt|abs|sign|floor|ceil|fract|mod|min|max|clamp|mix|step|smoothstep|length|distance|dot|cross|normalize|reflect|refract|texture2D|gl_FragColor|gl_Position|position|normal|uv|projectionMatrix|modelViewMatrix|normalMatrix)\b/,
	],
	["number", /\d+\.?\d*(?:e[+-]?\d+)?/],
	["punct", /[{}();\[\],=+\-*/<>!&|.?:]+/],
];

const COMBINED_REGEX = new RegExp(
	TOKEN_RULES.map(([, re]) => `(${re.source})`).join("|"),
	"g",
);

export function tokenizeGlsl(code: string): GlslToken[] {
	const tokens: GlslToken[] = [];
	let lastIndex = 0;

	for (const match of code.matchAll(COMBINED_REGEX)) {
		const matchStart = match.index;

		// Emit text between matches
		if (matchStart > lastIndex) {
			tokens.push({ type: "text", value: code.slice(lastIndex, matchStart) });
		}

		// Find which group matched
		let type: GlslTokenType = "text";
		for (let i = 0; i < TOKEN_RULES.length; i++) {
			if (match[i + 1] !== undefined) {
				type = TOKEN_RULES[i][0];
				break;
			}
		}

		tokens.push({ type, value: match[0] });
		lastIndex = matchStart + match[0].length;
	}

	// Emit trailing text
	if (lastIndex < code.length) {
		tokens.push({ type: "text", value: code.slice(lastIndex) });
	}

	return tokens;
}
