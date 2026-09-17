import { splitAmount, SplitError, SplitOptions } from './split';

export interface Person {
  id: string;
  name: string;
  /** Relative share when the bill is divided proportionally. 1 = an equal share. */
  weight: number;
  /** A set amount this person owes, in paise. Takes priority over weight. */
  fixedPaise: number | null;
}

export interface PersonShare {
  person: Person;
  sharePaise: number;
  /** This person's share, broken into under-the-limit payments. */
  chunks: number[];
}

export interface GroupSplitResult {
  shares: PersonShare[];
  totalPaise: number;
  /** Total number of payments everyone has to make between them. */
  paymentCount: number;
  warnings: string[];
}

export function makePerson(name: string, id = String(Date.now() + Math.random())): Person {
  return { id, name, weight: 1, fixedPaise: null };
}

/**
 * Divide a bill between people, then break each person's share into payments
 * that stay under the limit.
 *
 * Fixed amounts come off the top; whatever is left is shared out in proportion
 * to each remaining person's weight. Paise that don't divide evenly go to the
 * largest remainders first, so the shares always add back up to the bill.
 */
export function splitAmongPeople(
  totalPaise: number,
  people: Person[],
  options: SplitOptions = {},
): GroupSplitResult {
  if (!Number.isInteger(totalPaise) || totalPaise < 0) {
    throw new SplitError('Amount must be a whole, non-negative number of paise.');
  }
  if (people.length === 0) throw new SplitError('Add at least one person.');

  const warnings: string[] = [];
  const fixedTotal = people.reduce((sum, p) => sum + (p.fixedPaise ?? 0), 0);
  if (fixedTotal > totalPaise) {
    throw new SplitError('The fixed amounts add up to more than the bill.');
  }

  const flexible = people.filter((p) => p.fixedPaise === null);
  const remainder = totalPaise - fixedTotal;

  if (flexible.length === 0 && remainder > 0) {
    throw new SplitError('The fixed amounts do not cover the bill. Let someone take the rest.');
  }

  const sharePaise = new Map<string, number>();
  for (const person of people) {
    if (person.fixedPaise !== null) sharePaise.set(person.id, person.fixedPaise);
  }

  if (flexible.length > 0) {
    const weights = flexible.map((p) => (p.weight > 0 ? p.weight : 0));
    let weightTotal = weights.reduce((a, b) => a + b, 0);
    let effective = weights;

    if (weightTotal === 0) {
      if (remainder > 0) warnings.push('Everyone had a zero share, so the rest was divided equally.');
      effective = flexible.map(() => 1);
      weightTotal = flexible.length;
    }

    const exact = effective.map((w) => (remainder * w) / weightTotal);
    const floors = exact.map((value) => Math.floor(value));
    let leftover = remainder - floors.reduce((a, b) => a + b, 0);

    const order = exact
      .map((value, index) => ({ index, frac: value - Math.floor(value) }))
      .sort((a, b) => b.frac - a.frac || a.index - b.index);

    for (let i = 0; leftover > 0; i = (i + 1) % order.length) {
      floors[order[i].index] += 1;
      leftover -= 1;
    }

    flexible.forEach((person, index) => sharePaise.set(person.id, floors[index]));
  }

  const shares: PersonShare[] = people.map((person) => {
    const amount = sharePaise.get(person.id) ?? 0;
    const result = splitAmount(amount, options);
    result.warnings.forEach((w) => {
      if (!warnings.includes(w)) warnings.push(w);
    });
    return { person, sharePaise: amount, chunks: result.chunks };
  });

  const assigned = shares.reduce((sum, s) => sum + s.sharePaise, 0);
  if (assigned !== totalPaise) {
    throw new SplitError(`Shares do not add up: ${assigned} vs ${totalPaise} paise.`);
  }

  return {
    shares,
    totalPaise,
    paymentCount: shares.reduce((sum, s) => sum + s.chunks.length, 0),
    warnings,
  };
}
