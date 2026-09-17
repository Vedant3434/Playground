import { describe, expect, it } from 'vitest';
import { DEFAULT_CAP_PAISE, MDR_THRESHOLD_PAISE } from '../src/lib/money';
import {
  estimateSurcharge,
  minChunkCount,
  splitAmount,
  SplitError,
  SplitStrategy,
  VARIED_BAND_HIGH,
  VARIED_BAND_LOW,
} from '../src/lib/split';

const CAP = DEFAULT_CAP_PAISE; // ₹1,999
const STRATEGIES: SplitStrategy[] = ['fill', 'even', 'varied'];
const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);

describe('splitAmount — invariants that must hold for every strategy', () => {
  // A bill that doesn't add up, or a payment over the limit, defeats the
  // entire point of the app, so check the whole interesting range.
  const amounts = [
    1, 99, 100, 199900, 199901, 200000, 200001, 399800, 399900, 400000,
    499999, 500000, 1234567, 9999999, 100000000,
  ];

  for (const strategy of STRATEGIES) {
    for (const total of amounts) {
      it(`${strategy} keeps ${total} paise exact and under the cap`, () => {
        const { chunks } = splitAmount(total, { strategy });
        expect(sum(chunks)).toBe(total);
        expect(Math.max(...chunks)).toBeLessThanOrEqual(CAP);
        expect(Math.max(...chunks)).toBeLessThan(MDR_THRESHOLD_PAISE);
        expect(Math.min(...chunks)).toBeGreaterThan(0);
        expect(chunks.length).toBe(minChunkCount(total, CAP));
      });
    }
  }

  it('holds across a long sweep of amounts', () => {
    for (let total = 1; total <= 1_200_000; total += 997) {
      for (const strategy of STRATEGIES) {
        const { chunks } = splitAmount(total, { strategy });
        expect(sum(chunks)).toBe(total);
        expect(Math.max(...chunks)).toBeLessThanOrEqual(CAP);
      }
    }
  });
});

describe('fill', () => {
  it('leaves a bill that already fits alone', () => {
    expect(splitAmount(150000).chunks).toEqual([150000]);
    expect(splitAmount(CAP).chunks).toEqual([CAP]);
  });

  it('packs full payments then the remainder', () => {
    expect(splitAmount(500000).chunks).toEqual([199900, 199900, 100200]);
  });

  it('divides exactly when the bill is a multiple of the cap', () => {
    expect(splitAmount(CAP * 3).chunks).toEqual([CAP, CAP, CAP]);
  });

  it('tops up a dust remainder out of the first payment', () => {
    // ₹1,999.40 would otherwise end in a 40 paise payment.
    const { chunks } = splitAmount(CAP + 40);
    expect(chunks).toEqual([199840, 100]);
    expect(sum(chunks)).toBe(CAP + 40);
  });
});

describe('even', () => {
  it('spreads a bill across the fewest payments, in whole rupees', () => {
    expect(splitAmount(500000, { strategy: 'even' }).chunks).toEqual([166700, 166700, 166600]);
  });

  it('keeps sub-rupee paise on the last payment', () => {
    const { chunks } = splitAmount(500055, { strategy: 'even' });
    expect(chunks).toEqual([166700, 166700, 166655]);
    expect(sum(chunks)).toBe(500055);
  });

  it('never exceeds the cap even when the bill is an exact multiple of it', () => {
    const { chunks } = splitAmount(CAP * 4, { strategy: 'even' });
    expect(Math.max(...chunks)).toBeLessThanOrEqual(CAP);
    expect(sum(chunks)).toBe(CAP * 4);
  });
});

describe('varied', () => {
  it('is deterministic for a given seed', () => {
    const a = splitAmount(987654, { strategy: 'varied', seed: 42 }).chunks;
    const b = splitAmount(987654, { strategy: 'varied', seed: 42 }).chunks;
    expect(a).toEqual(b);
  });

  it('produces different amounts for different seeds', () => {
    const a = splitAmount(987654, { strategy: 'varied', seed: 1 }).chunks;
    const b = splitAmount(987654, { strategy: 'varied', seed: 9 }).chunks;
    expect(a).not.toEqual(b);
  });

  it('does not send the same amount several times over', () => {
    const { chunks } = splitAmount(1200000, { strategy: 'varied', seed: 7 });
    expect(new Set(chunks).size).toBeGreaterThan(1);
    expect(sum(chunks)).toBe(1200000);
  });

  it('keeps every payment within a band around an equal share', () => {
    for (let total = 200000; total < 3_000_000; total += 7919) {
      for (const seed of [1, 2, 3, 17]) {
        const { chunks } = splitAmount(total, { strategy: 'varied', seed });
        const even = total / chunks.length;
        for (const chunk of chunks) {
          expect(chunk).toBeGreaterThanOrEqual(Math.floor(even * VARIED_BAND_LOW));
          expect(chunk).toBeLessThanOrEqual(Math.min(CAP, Math.ceil(even * VARIED_BAND_HIGH)));
        }
      }
    }
  });

  it('keeps every payment in whole rupees bar the dust', () => {
    const { chunks } = splitAmount(1200033, { strategy: 'varied', seed: 3 });
    expect(chunks.filter((c) => c % 100 !== 0).length).toBeLessThanOrEqual(1);
  });
});

describe('options', () => {
  it('honours a custom cap', () => {
    const { chunks } = splitAmount(300000, { capPaise: 100000 });
    expect(chunks).toEqual([100000, 100000, 100000]);
  });

  it('warns when the cap would not actually avoid the charge', () => {
    const { warnings } = splitAmount(500000, { capPaise: 250000 });
    expect(warnings.join(' ')).toContain('₹2,000 or more');
  });

  it('returns nothing for a zero bill', () => {
    expect(splitAmount(0).chunks).toEqual([]);
  });

  it('rejects nonsense input', () => {
    expect(() => splitAmount(-1)).toThrow(SplitError);
    expect(() => splitAmount(10.5)).toThrow(SplitError);
    expect(() => splitAmount(100, { capPaise: 0 })).toThrow(SplitError);
  });
});

describe('estimateSurcharge', () => {
  it('is zero below the threshold', () => {
    expect(estimateSurcharge(199900, 1.1)).toBe(0);
  });

  it('applies the rate at and above the threshold', () => {
    expect(estimateSurcharge(200000, 1.1)).toBe(2200);
    expect(estimateSurcharge(500000, 1.1)).toBe(5500);
  });
});
