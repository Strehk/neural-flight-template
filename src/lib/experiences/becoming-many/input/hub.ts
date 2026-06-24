// ── Becoming Many — Input Hub ──────────────────────────────────
//
// Holds the registered control sources and merges them into a single resolved
// FlightIntent each frame. This is the *only* place merge semantics live, so
// changing how controls combine is a one-file edit.
//
// Merge policy (sources applied in ascending priority — higher wins):
//   - orientation axes: a source overrides only when it provides a non-null
//     value, so an idle/abstaining source never zeroes a lower-priority one.
//   - speed flags (accelerate / brake / boost): OR-combined unless a *higher*
//     priority source asserts them — i.e. the highest source that touches a
//     flag decides it. In practice sources rarely conflict here; OR is the
//     intuitive default (any source asking to boost → boost).
//   - actions: concatenated from all sources (edge events never conflict).

import { type FlightIntent, emptyIntent, type InputSource } from "./types";

export class InputHub {
	private sources: InputSource[] = [];

	/** Register a source (re-sorted by priority). Replaces any same-id source. */
	add(source: InputSource): this {
		this.remove(source.id);
		this.sources.push(source);
		this.sources.sort((a, b) => a.priority - b.priority);
		return this;
	}

	remove(id: string): void {
		const src = this.sources.find((s) => s.id === id);
		if (!src) return;
		src.dispose();
		this.sources = this.sources.filter((s) => s !== src);
	}

	get(id: string): InputSource | undefined {
		return this.sources.find((s) => s.id === id);
	}

	/** Poll every source and fold the results into one intent. */
	poll(dt: number): FlightIntent {
		const out = emptyIntent();
		// Ascending priority: later (higher) sources overwrite orientation axes.
		for (const src of this.sources) {
			const partial = src.poll(dt);
			if (!partial) continue;
			if (partial.pitch != null) out.pitch = partial.pitch;
			if (partial.roll != null) out.roll = partial.roll;
			if (partial.accelerate) out.accelerate = true;
			if (partial.brake) out.brake = true;
			if (partial.boost) out.boost = true;
			if (partial.actions?.length) out.actions.push(...partial.actions);
		}
		return out;
	}

	dispose(): void {
		for (const src of this.sources) src.dispose();
		this.sources = [];
	}
}
