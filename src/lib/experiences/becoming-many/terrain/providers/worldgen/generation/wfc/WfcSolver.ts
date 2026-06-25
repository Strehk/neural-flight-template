/**
 * Macro Wave Function Collapse solver.
 *
 * Domains are bitmasks over the ≤32 macro tiles (Uint32). Standard loop:
 * min-entropy pick → weighted collapse → constraint propagation. Border cells
 * can be pre-pinned (single tile) so adjacent regions agree at the seam. On a
 * contradiction it restarts with the next RNG draws; if every restart fails it
 * falls back to the per-cell argmax prior so a plan is always produced.
 */
import { MACRO_TILE_COUNT } from '../mapTypes';
import { COMPAT_MASK, FULL_DOMAIN } from './constraints';

export interface WfcInput {
  w: number;
  h: number;
  /** length w*h*T, per-cell prior weight for each tile. */
  priors: Float32Array;
  /** length w*h, tile id to pin, or -1 for free. */
  pinned: Int16Array;
  rng: () => number;
  maxRestarts?: number;
}

const T = MACRO_TILE_COUNT;

function popcount(x: number): number {
  x = x - ((x >> 1) & 0x55555555);
  x = (x & 0x33333333) + ((x >> 2) & 0x33333333);
  x = (x + (x >> 4)) & 0x0f0f0f0f;
  return (Math.imul(x, 0x01010101) >> 24) & 0x3f;
}

export class WfcSolver {
  solve(input: WfcInput): Uint8Array {
    const { w, h, priors, pinned, rng } = input;
    const maxRestarts = input.maxRestarts ?? 12;
    const n = w * h;

    for (let attempt = 0; attempt < maxRestarts; attempt++) {
      const domain = new Uint32Array(n);
      const stack: number[] = [];
      for (let i = 0; i < n; i++) {
        if (pinned[i] >= 0) {
          domain[i] = 1 << pinned[i];
          stack.push(i);
        } else {
          domain[i] = FULL_DOMAIN;
        }
      }
      if (!this.propagate(domain, stack, w, h)) continue;

      let ok = true;
      for (;;) {
        const cell = this.pickMinEntropy(domain, n, rng);
        if (cell < 0) break; // all collapsed
        this.collapse(domain, priors, cell, rng);
        if (!this.propagate(domain, [cell], w, h)) {
          ok = false;
          break;
        }
      }
      if (ok) return this.extract(domain, n);
    }

    console.warn(`[WFC] all ${maxRestarts} attempts hit a contradiction — using argmax fallback`);
    return this.fallback(priors, n);
  }

  private unionMask(d: number): number {
    let u = 0;
    for (let t = 0; t < T; t++) if (d & (1 << t)) u |= COMPAT_MASK[t];
    return u;
  }

  private propagate(domain: Uint32Array, stack: number[], w: number, h: number): boolean {
    while (stack.length > 0) {
      const i = stack.pop()!;
      const allowed = this.unionMask(domain[i]);
      const x = i % w;
      const y = (i / w) | 0;
      const neighbors = [
        x > 0 ? i - 1 : -1,
        x < w - 1 ? i + 1 : -1,
        y > 0 ? i - w : -1,
        y < h - 1 ? i + w : -1,
      ];
      for (const nb of neighbors) {
        if (nb < 0) continue;
        const next = domain[nb] & allowed;
        if (next === 0) return false;
        if (next !== domain[nb]) {
          domain[nb] = next;
          stack.push(nb);
        }
      }
    }
    return true;
  }

  private pickMinEntropy(domain: Uint32Array, n: number, rng: () => number): number {
    let best = -1;
    let bestScore = Infinity;
    for (let i = 0; i < n; i++) {
      const c = popcount(domain[i]);
      if (c <= 1) continue;
      const score = c + rng() * 0.5; // tiny noise to break ties deterministically
      if (score < bestScore) {
        bestScore = score;
        best = i;
      }
    }
    return best;
  }

  private collapse(domain: Uint32Array, priors: Float32Array, cell: number, rng: () => number): void {
    const d = domain[cell];
    const base = cell * T;
    let total = 0;
    for (let t = 0; t < T; t++) if (d & (1 << t)) total += priors[base + t];
    let r = rng() * total;
    let chosen = -1;
    for (let t = 0; t < T; t++) {
      if (!(d & (1 << t))) continue;
      r -= priors[base + t];
      if (r <= 0) {
        chosen = t;
        break;
      }
    }
    if (chosen < 0) {
      // numerical fallthrough: pick the highest set bit
      for (let t = T - 1; t >= 0; t--) if (d & (1 << t)) {
        chosen = t;
        break;
      }
    }
    domain[cell] = 1 << chosen;
  }

  private extract(domain: Uint32Array, n: number): Uint8Array {
    const out = new Uint8Array(n);
    for (let i = 0; i < n; i++) out[i] = 31 - Math.clz32(domain[i]);
    return out;
  }

  private fallback(priors: Float32Array, n: number): Uint8Array {
    const out = new Uint8Array(n);
    for (let i = 0; i < n; i++) {
      const base = i * T;
      let best = 0;
      for (let t = 1; t < T; t++) if (priors[base + t] > priors[base + best]) best = t;
      out[i] = best;
    }
    return out;
  }
}
