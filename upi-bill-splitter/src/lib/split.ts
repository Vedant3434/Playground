import { DEFAULT_CAP_PAISE, MDR_THRESHOLD_PAISE, PAISE_PER_RUPEE } from './money';

export type SplitStrategy = 'fill' | 'even' | 'varied';

export interface SplitOptions {
  /** Largest allowed single payment, in paise. Default ₹1,999. */
  capPaise?: number;
  /** How to lay the chunks out. Default 'fill'. */
  strategy?: SplitStrategy;
  /** Chunks are kept to a multiple of this, in paise. Default 100 (whole rupees). */
  roundToPaise?: number;
  /** No chunk smaller than this (except when the whole bill is). Default 100 (₹1). */
  minChunkPaise?: number;
  /** Seed for 'varied', so the same bill always produces the same amounts. */
  seed?: number;
}

export interface SplitResult {
  /** Chunk amounts in paise. Always sums to exactly totalPaise. */
  chunks: number[];
  totalPaise: number;
  capPaise: number;
  strategy: SplitStrategy;
  /** Non-fatal notes to show the user. */
  warnings: string[];
}

export class SplitError extends Error {}

const DEFAULTS = {
  capPaise: DEFAULT_CAP_PAISE,
  strategy: 'fill' as SplitStrategy,
  roundToPaise: PAISE_PER_RUPEE,
  minChunkPaise: PAISE_PER_RUPEE,
  seed: 1,
};

/** Fewest payments that can carry `total` without any of them exceeding `cap`. */
export function minChunkCount(totalPaise: number, capPaise: number): number {
  if (totalPaise <= 0) return 0;
  return Math.ceil(totalPaise / capPaise);
}

export function splitAmount(totalPaise: number, options: SplitOptions = {}): SplitResult {
  const cap = options.capPaise ?? DEFAULTS.capPaise;
  const strategy = options.strategy ?? DEFAULTS.strategy;
  const round = options.roundToPaise ?? DEFAULTS.roundToPaise;
  const min = options.minChunkPaise ?? DEFAULTS.minChunkPaise;
  const seed = options.seed ?? DEFAULTS.seed;

  if (!Number.isInteger(totalPaise)) throw new SplitError('Amount must be a whole number of paise.');
  if (totalPaise < 0) throw new SplitError('Amount cannot be negative.');
  if (!Number.isInteger(cap) || cap <= 0) throw new SplitError('Limit must be a positive amount.');
  if (!Number.isInteger(round) || round <= 0) throw new SplitError('Rounding must be a positive amount.');

  const warnings: string[] = [];
  if (cap >= MDR_THRESHOLD_PAISE) {
    warnings.push('Your per-payment limit is ₹2,000 or more, so payments can still cross the threshold.');
  }
  if (totalPaise === 0) {
    return { chunks: [], totalPaise: 0, capPaise: cap, strategy, warnings };
  }

  let chunks: number[];
  if (totalPaise <= cap) {
    chunks = [totalPaise];
  } else {
    switch (strategy) {
      case 'even':
        chunks = distribute(totalPaise, minChunkCount(totalPaise, cap), round);
        break;
      case 'varied':
        chunks = varied(totalPaise, cap, round, min, seed);
        break;
      case 'fill':
      default:
        chunks = fill(totalPaise, cap, min);
        break;
    }
  }

  chunks = enforceCap(chunks, cap);
  assertExact(chunks, totalPaise, cap);

  if (chunks.length > 1 && Math.min(...chunks) < min) {
    warnings.push('One payment is very small — try the Even or Varied layout.');
  }

  return { chunks, totalPaise, capPaise: cap, strategy, warnings };
}

/** As many payments at the cap as possible, then whatever is left over. */
function fill(total: number, cap: number, min: number): number[] {
  const full = Math.floor(total / cap);
  const rest = total - full * cap;
  const chunks = new Array<number>(full).fill(cap);
  if (rest === 0) return chunks;

  // A ₹0.40 trailing payment is silly and some apps reject tiny amounts, so
  // top the remainder up out of the first chunk when there is room.
  if (rest < min && chunks.length > 0 && cap - (min - rest) >= min) {
    chunks[0] -= min - rest;
    chunks.push(min);
    return chunks;
  }
  chunks.push(rest);
  return chunks;
}

/** `count` payments of near-identical size, each a multiple of `round` bar the dust. */
function distribute(total: number, count: number, round: number): number[] {
  if (count <= 1) return [total];

  const units = Math.floor(total / round);
  const dust = total - units * round;

  if (units < count) {
    // Too small to give every chunk a whole unit — fall back to plain paise.
    const base = Math.floor(total / count);
    const extra = total - base * count;
    return Array.from({ length: count }, (_, i) => base + (i < extra ? 1 : 0));
  }

  const baseUnits = Math.floor(units / count);
  const extraUnits = units - baseUnits * count;
  const chunks = Array.from({ length: count }, (_, i) => (baseUnits + (i < extraUnits ? 1 : 0)) * round);
  chunks[chunks.length - 1] += dust;
  return chunks;
}

/**
 * Even split, then shuffled about a bit so you aren't sending three
 * identical amounts a minute apart. Deterministic for a given seed.
 */
function varied(total: number, cap: number, round: number, min: number, seed: number): number[] {
  const count = minChunkCount(total, cap);
  const chunks = distribute(total, count, round);
  if (count < 2) return chunks;

  const rand = lcg(seed);
  // Payments stay within a band around an equal share, so the result still
  // reads like a bill being paid off rather than a random scatter.
  const even = total / count;
  const lower = Math.max(min, Math.floor(even * VARIED_BAND_LOW));
  const upper = Math.min(cap, Math.ceil(even * VARIED_BAND_HIGH));

  for (let pass = 0; pass < count * 2; pass++) {
    const from = Math.floor(rand() * count);
    const to = Math.floor(rand() * count);
    if (from === to) continue;

    // Whole units only, so the moves never create sub-rupee amounts.
    const canGive = Math.floor((chunks[from] - lower) / round);
    const canTake = Math.floor((upper - chunks[to]) / round);
    const room = Math.min(canGive, canTake);
    if (room <= 0) continue;

    const move = (1 + Math.floor(rand() * room)) * round;
    chunks[from] -= move;
    chunks[to] += move;
  }
  return chunks;
}

/** How far a 'varied' payment may sit from an equal share. */
export const VARIED_BAND_LOW = 0.55;
export const VARIED_BAND_HIGH = 1.45;

/** Deterministic pseudo-random in [0, 1). Numerical Recipes LCG. */
function lcg(seed: number): () => number {
  let state = (Math.abs(Math.floor(seed)) % 2147483647) + 1;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

/**
 * Last line of defence: no chunk may exceed the cap. Overflow is pushed into
 * chunks that have headroom, and new chunks are opened if there isn't any.
 * The total is never changed.
 */
function enforceCap(chunks: number[], cap: number): number[] {
  const out = chunks.filter((value) => value > 0);

  for (let i = 0; i < out.length; i++) {
    if (out[i] <= cap) continue;

    let overflow = out[i] - cap;
    out[i] = cap;

    for (let j = 0; j < out.length && overflow > 0; j++) {
      if (j === i) continue;
      const room = cap - out[j];
      if (room <= 0) continue;
      const moved = Math.min(room, overflow);
      out[j] += moved;
      overflow -= moved;
    }

    while (overflow > 0) {
      const piece = Math.min(overflow, cap);
      out.push(piece);
      overflow -= piece;
    }
  }

  return out;
}

function assertExact(chunks: number[], total: number, cap: number): void {
  const sum = chunks.reduce((a, b) => a + b, 0);
  if (sum !== total) {
    throw new SplitError(`Split does not add up: ${sum} vs ${total} paise.`);
  }
  if (chunks.some((c) => c > cap)) {
    throw new SplitError('Split produced a payment above the limit.');
  }
  if (chunks.some((c) => c <= 0)) {
    throw new SplitError('Split produced an empty payment.');
  }
}

/**
 * Rough estimate of what the bill would cost in charges if it went through as
 * one payment above the threshold. Purely indicative — the real rate depends
 * on the instrument and the merchant's agreement with their bank.
 */
export function estimateSurcharge(totalPaise: number, ratePercent: number): number {
  if (totalPaise < MDR_THRESHOLD_PAISE) return 0;
  return Math.round((totalPaise * ratePercent) / 100);
}
