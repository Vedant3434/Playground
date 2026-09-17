import { describe, expect, it } from 'vitest';
import { makePerson, Person, splitAmongPeople } from '../src/lib/group';
import { SplitError } from '../src/lib/split';

function people(...names: string[]): Person[] {
  return names.map((name, i) => makePerson(name, `p${i}`));
}

const total = (shares: { sharePaise: number }[]) => shares.reduce((a, s) => a + s.sharePaise, 0);

describe('splitAmongPeople', () => {
  it('divides equally when everyone has the same weight', () => {
    const { shares } = splitAmongPeople(300000, people('A', 'B', 'C'));
    expect(shares.map((s) => s.sharePaise)).toEqual([100000, 100000, 100000]);
  });

  it('never loses a paisa to rounding', () => {
    const { shares } = splitAmongPeople(100, people('A', 'B', 'C'));
    expect(shares.map((s) => s.sharePaise)).toEqual([34, 33, 33]);
    expect(total(shares)).toBe(100);
  });

  it('adds up for awkward amounts and party sizes', () => {
    for (const amount of [1, 7, 999, 123457, 1000000, 9999999]) {
      for (const size of [1, 2, 3, 4, 7, 11]) {
        const names = Array.from({ length: size }, (_, i) => `P${i}`);
        const { shares } = splitAmongPeople(amount, people(...names));
        expect(total(shares)).toBe(amount);
      }
    }
  });

  it('respects weights', () => {
    const group = people('A', 'B');
    group[0].weight = 3;
    const { shares } = splitAmongPeople(400000, group);
    expect(shares.map((s) => s.sharePaise)).toEqual([300000, 100000]);
  });

  it('takes fixed amounts off the top and shares the rest', () => {
    const group = people('A', 'B', 'C');
    group[0].fixedPaise = 50000;
    const { shares } = splitAmongPeople(250000, group);
    expect(shares.map((s) => s.sharePaise)).toEqual([50000, 100000, 100000]);
  });

  it('splits each share into payments under the limit', () => {
    const { shares, paymentCount } = splitAmongPeople(1000000, people('A', 'B'));
    expect(shares[0].sharePaise).toBe(500000);
    expect(shares[0].chunks).toEqual([199900, 199900, 100200]);
    expect(paymentCount).toBe(6);
  });

  it('shares equally when every weight is zero', () => {
    const group = people('A', 'B');
    group.forEach((p) => (p.weight = 0));
    const { shares, warnings } = splitAmongPeople(200000, group);
    expect(shares.map((s) => s.sharePaise)).toEqual([100000, 100000]);
    expect(warnings.join(' ')).toContain('divided equally');
  });

  it('refuses impossible fixed amounts', () => {
    const group = people('A', 'B');
    group[0].fixedPaise = 300000;
    expect(() => splitAmongPeople(200000, group)).toThrow(SplitError);
  });

  it('refuses fixed amounts that leave money unaccounted for', () => {
    const group = people('A', 'B');
    group.forEach((p) => (p.fixedPaise = 50000));
    expect(() => splitAmongPeople(200000, group)).toThrow(SplitError);
  });

  it('refuses an empty group', () => {
    expect(() => splitAmongPeople(100, [])).toThrow(SplitError);
  });
});
