/**
 * Shader Rack — GLSL Parser
 *
 * Splits a monolithic GLSL string into semantic slots (header, uniforms,
 * varyings, defines, functions, main). Regex-based, line-by-line — no AST.
 *
 * Strategy:
 * 1. Extract leading header comments
 * 2. Bucket all uniform/varying/#define lines (with preceding comments)
 * 3. Brace-match each function body
 */

import { SYSTEM_UNIFORMS } from "../uniforms";
import type { RackSlot, RackSlotType, SlotTag } from "./types";
import { MODULE_CLASS } from "./types";

// ── Patterns ──

const GLSL_TYPE =
	"(?:void|float|int|vec[234]|mat[234]|ivec[234]|bvec[234]|bool|sampler2D|samplerCube)";
const FUNC_REGEX = new RegExp(`^(${GLSL_TYPE})\\s+(\\w+)\\s*\\(`);
const SECTION_HEADER_REGEX = /^\/\/\s*[═=]{3,}\s*[@\w]/;

// ── Helpers ──

function isPassive(trimmed: string): boolean {
	return trimmed === "" || trimmed.startsWith("//");
}

function isUniform(trimmed: string): boolean {
	return trimmed.startsWith("uniform ");
}

function isVarying(trimmed: string): boolean {
	return trimmed.startsWith("varying ");
}

function isDefine(trimmed: string): boolean {
	return trimmed.startsWith("#define ");
}

function countBraces(line: string): number {
	const commentIdx = line.indexOf("//");
	const code = commentIdx >= 0 ? line.substring(0, commentIdx) : line;
	let count = 0;
	for (const ch of code) {
		if (ch === "{") count++;
		if (ch === "}") count--;
	}
	return count;
}

function trimEmptyLines(arr: string[]): string[] {
	let start = 0;
	while (start < arr.length && arr[start].trim() === "") start++;
	let end = arr.length;
	while (end > start && arr[end - 1].trim() === "") end--;
	return arr.slice(start, end);
}

function generateUniformTags(code: string): SlotTag[] {
	const tags: SlotTag[] = [];
	for (const line of code.split("\n")) {
		const match = line.trim().match(/^uniform\s+\w+\s+(\w+)\s*;/);
		if (!match) continue;
		const name = match[1];

		if (SYSTEM_UNIFORMS.has(name)) {
			tags.push({ label: name, variant: "system" });
		} else if (line.includes("@endpoint")) {
			tags.push({ label: name, variant: "endpoint" });
		} else {
			tags.push({ label: name, variant: "custom" });
		}
	}
	return tags;
}

// ── Parser ──

export function parseToSlots(glsl: string): RackSlot[] {
	const lines = glsl.split("\n");
	const slots: RackSlot[] = [];
	let slotIndex = 0;
	let i = 0;

	function makeSlot(
		type: RackSlotType,
		title: string,
		codeLines: string[],
		lineOffset: number,
		overrides?: Partial<RackSlot>,
	): RackSlot {
		const moduleClass = MODULE_CLASS[type];
		return {
			id: `slot-${slotIndex++}`,
			type,
			moduleClass,
			title,
			code: trimEmptyLines(codeLines).join("\n"),
			enabled: true,
			collapsed: moduleClass === "fixed",
			editable: moduleClass === "focus",
			lineOffset,
			tags: [],
			...overrides,
		};
	}

	// ── Phase 1: Leading header ──

	let leadingEnd = 0;
	while (leadingEnd < lines.length && isPassive(lines[leadingEnd].trim())) {
		leadingEnd++;
	}

	if (
		leadingEnd > 0 &&
		lines.slice(0, leadingEnd).some((l) => l.trim().startsWith("//"))
	) {
		let splitAt = -1;
		for (let j = leadingEnd - 1; j >= 0; j--) {
			if (SECTION_HEADER_REGEX.test(lines[j].trim())) {
				splitAt = j;
				break;
			}
		}

		if (splitAt > 0) {
			const headerLines = lines.slice(0, splitAt);
			if (headerLines.some((l) => l.trim().startsWith("//"))) {
				slots.push(makeSlot("header", "HEADER", headerLines, 0));
			}
			i = splitAt;
		} else {
			slots.push(makeSlot("header", "HEADER", lines.slice(0, leadingEnd), 0));
			i = leadingEnd;
		}
	} else {
		i = leadingEnd;
	}

	// ── Phase 2: Line-by-line scan with declaration bucketing ──

	type Bucket = { lines: string[]; firstLine: number };
	const uniformBucket: Bucket = { lines: [], firstLine: -1 };
	const varyingBucket: Bucket = { lines: [], firstLine: -1 };
	const defineBucket: Bucket = { lines: [], firstLine: -1 };

	let pending: string[] = [];
	let pendingStart = i;

	function flushTo(bucket: Bucket, lineIdx: number): void {
		if (bucket.firstLine === -1) {
			bucket.firstLine = pending.length > 0 ? pendingStart : lineIdx;
		}
		bucket.lines.push(...pending);
		pending = [];
	}

	function emitDeclarationSlots(): void {
		if (uniformBucket.lines.length > 0) {
			const code = trimEmptyLines(uniformBucket.lines).join("\n");
			const tags = generateUniformTags(code);
			const hasUserUniforms = tags.some((t) => t.variant !== "system");
			slots.push({
				id: `slot-${slotIndex++}`,
				type: "uniforms",
				moduleClass: "fixed",
				title: "UNIFORMS",
				code,
				enabled: true,
				collapsed: true,
				editable: hasUserUniforms,
				lineOffset: uniformBucket.firstLine,
				tags,
			});
		}

		if (varyingBucket.lines.length > 0) {
			slots.push(
				makeSlot(
					"varyings",
					"VARYINGS",
					varyingBucket.lines,
					varyingBucket.firstLine,
				),
			);
		}

		if (defineBucket.lines.length > 0) {
			slots.push(
				makeSlot(
					"defines",
					"DEFINES",
					defineBucket.lines,
					defineBucket.firstLine,
				),
			);
		}
	}

	let declarationsEmitted = false;

	while (i < lines.length) {
		const trimmed = lines[i].trim();

		// Buffer comments and empty lines
		if (isPassive(trimmed)) {
			if (pending.length === 0) pendingStart = i;
			pending.push(lines[i]);
			i++;
			continue;
		}

		// Declaration-zone: bucket uniforms, varyings, defines
		if (!declarationsEmitted) {
			if (isUniform(trimmed)) {
				flushTo(uniformBucket, i);
				uniformBucket.lines.push(lines[i]);
				i++;
				continue;
			}

			if (isVarying(trimmed)) {
				flushTo(varyingBucket, i);
				varyingBucket.lines.push(lines[i]);
				i++;
				continue;
			}

			if (isDefine(trimmed)) {
				flushTo(defineBucket, i);
				defineBucket.lines.push(lines[i]);
				i++;
				continue;
			}
		}

		// Function or main
		const funcMatch = trimmed.match(FUNC_REGEX);
		if (funcMatch) {
			if (!declarationsEmitted) {
				emitDeclarationSlots();
				declarationsEmitted = true;
			}

			const funcName = funcMatch[2];
			const isMain = funcName === "main";
			const funcStart = pending.length > 0 ? pendingStart : i;
			const funcLines = [...pending];
			pending = [];

			// Brace-match the function body
			let braceCount = 0;
			let foundOpen = false;

			while (i < lines.length) {
				funcLines.push(lines[i]);
				braceCount += countBraces(lines[i]);
				if (braceCount > 0) foundOpen = true;
				i++;
				if (foundOpen && braceCount === 0) break;
			}

			if (isMain) {
				slots.push(
					makeSlot("main", "MAIN", funcLines, funcStart, {
						editable: true,
					}),
				);
			} else {
				slots.push(makeSlot("function", funcName, funcLines, funcStart));
			}
			continue;
		}

		// Anything else → custom slot
		if (!declarationsEmitted) {
			emitDeclarationSlots();
			declarationsEmitted = true;
		}

		const customStart = pending.length > 0 ? pendingStart : i;
		const customLines = [...pending, lines[i]];
		pending = [];
		i++;

		while (i < lines.length) {
			const t = lines[i].trim();
			if (isPassive(t) || FUNC_REGEX.test(t)) break;
			customLines.push(lines[i]);
			i++;
		}

		const code = trimEmptyLines(customLines).join("\n");
		if (code) {
			slots.push(makeSlot("custom", "CUSTOM", customLines, customStart));
		}
	}

	// Emit remaining declarations if no function was found
	if (!declarationsEmitted) {
		emitDeclarationSlots();
	}

	return slots;
}

// ── Reconstructor ──

export function slotsToGlsl(slots: RackSlot[]): string {
	return slots
		.map((slot) => {
			if (slot.enabled) return slot.code;
			// Bypassed: wrap as block comment to avoid compile errors
			return `/* BYPASSED: ${slot.title}\n${slot.code}\n*/`;
		})
		.join("\n\n");
}
