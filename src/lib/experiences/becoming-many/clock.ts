// ── Becoming Many — Experience Clock + Timeline ────────────────
//
// The single resettable time spine for the experience. Everything visual and
// auditive reads from it: sense transitions, the auto-orbit, the TSL time
// uniform, and the audio cues are all advanced by — and scheduled against —
// this one clock, so pausing / scaling / resetting affects them together.
//
// It is experience-local: the /vr route still owns the real THREE.Clock and
// hands us a real frame delta in tick(); we turn that into a controllable
// *virtual* time (pause / resume / seek / timeScale) and fire timeline events
// as the virtual clock crosses their scheduled time. Firing is frame-accurate
// (not sample-accurate) — the correct trade-off, since a virtual clock with
// transport controls can't be pre-scheduled on AudioContext time.

export interface TimelineHandle {
	readonly id: string;
	cancel(): void;
}

export interface ScheduleOpts {
	/** Explicit id (else auto-generated); also used to cancel/replace. */
	id?: string;
	/** Seconds added to the scheduled time (negative = earlier). */
	offset?: number;
	/** Repeat interval in seconds; omit for a one-shot. */
	every?: number;
	/** Max number of fires when `every` is set; default Infinity. */
	repeat?: number;
}

interface TimelineEvent {
	id: string;
	/** Effective first-fire time (at + offset). */
	base: number;
	every: number; // 0 = one-shot
	/** Original max fire count (re-applied on reset/seek). */
	repeatCap: number;
	remaining: number; // fires left
	next: number; // next virtual time this should fire at
	action: () => void;
}

export class ExperienceClock {
	/** 1 = realtime, 0.5 = slow-mo, 2 = fast-forward. */
	timeScale = 1;

	private t = 0;
	private lastDelta = 0;
	private playing = true;
	private seq = 0;
	private events: TimelineEvent[] = [];

	/** Current virtual elapsed time, in seconds — the spine. */
	get now(): number {
		return this.t;
	}
	/** Virtual delta applied on the last advance() (already timeScale-scaled). */
	get delta(): number {
		return this.lastDelta;
	}
	get running(): boolean {
		return this.playing;
	}

	/** Advance the virtual clock by one real frame and fire any due events. */
	advance(realDelta: number): void {
		if (!this.playing) {
			this.lastDelta = 0;
			return;
		}
		const vd = realDelta * this.timeScale;
		this.lastDelta = vd;
		const prev = this.t;
		this.t += vd;
		this.fireDue(prev, this.t);
	}

	pause(): void {
		this.playing = false;
	}
	resume(): void {
		this.playing = true;
	}
	toggle(): void {
		this.playing = !this.playing;
	}

	/** Restart the timeline at 0, re-arming every event. Running state is kept. */
	reset(): void {
		this.t = 0;
		this.lastDelta = 0;
		for (const e of this.events) this.armFrom(e, 0);
	}

	/** Jump to `target`; re-arm future one-shots, mark passed ones as fired (no burst). */
	seek(target: number): void {
		this.t = target;
		this.lastDelta = 0;
		for (const e of this.events) this.armFrom(e, target);
	}

	schedule(
		at: number,
		action: () => void,
		opts: ScheduleOpts = {},
	): TimelineHandle {
		const id = opts.id ?? `evt:${this.seq++}`;
		// Replace any existing event sharing this id (idempotent registration).
		this.cancel(id);
		const every = opts.every && opts.every > 0 ? opts.every : 0;
		const event: TimelineEvent = {
			id,
			base: at + (opts.offset ?? 0),
			every,
			repeatCap: every ? (opts.repeat ?? Number.POSITIVE_INFINITY) : 1,
			remaining: 0,
			next: 0,
			action,
		};
		this.armFrom(event, this.t);
		this.events.push(event);
		return { id, cancel: () => this.cancel(id) };
	}

	/** Sugar: fire every `interval` seconds, first fire at `interval`. */
	every(
		interval: number,
		action: () => void,
		opts: ScheduleOpts = {},
	): TimelineHandle {
		return this.schedule(interval, action, { ...opts, every: interval });
	}

	cancel(idOrHandle: string | TimelineHandle): void {
		const id = typeof idOrHandle === "string" ? idOrHandle : idOrHandle.id;
		this.events = this.events.filter((e) => e.id !== id);
	}

	clear(): void {
		this.events = [];
	}

	// Re-arm an event relative to a virtual time `from`: compute how many fires
	// have already passed and where the next one lands strictly after `from`.
	private armFrom(e: TimelineEvent, from: number): void {
		// At/after `from` → armed (fires going forward); strictly before → consumed.
		// `<=` at the boundary is what lets an `at:0` cue fire on the first frame.
		if (!e.every) {
			e.next = e.base;
			e.remaining = e.base >= from ? 1 : 0;
			return;
		}
		const passed = e.base >= from ? 0 : Math.floor((from - e.base) / e.every) + 1;
		e.next = e.base + passed * e.every;
		e.remaining = Math.max(0, e.repeatCap - passed);
	}

	private fireDue(_prev: number, current: number): void {
		let guard = 0;
		for (const e of this.events) {
			// `next` is always the smallest unfired time at/after the arm point, so
			// `next <= current` is the crossing test; bumping next prevents refires.
			while (e.remaining > 0 && e.next <= current && guard++ < 4096) {
				e.action();
				e.remaining -= 1;
				if (e.every) e.next += e.every;
				else e.next = Number.POSITIVE_INFINITY;
			}
		}
	}
}
