import { describe, expect, it } from 'vitest';
import { formatPaise, parseAmount, toUpiAmount } from '../src/lib/money';

describe('parseAmount', () => {
  it('reads plain rupees', () => {
    expect(parseAmount('1999')).toBe(199900);
  });

  it('reads paise exactly, without float drift', () => {
    expect(parseAmount('0.10')).toBe(10);
    expect(parseAmount('0.20')).toBe(20);
    expect(parseAmount('4999.99')).toBe(499999);
    expect(parseAmount('8.07')).toBe(807);
  });

  it('tolerates rupee signs, commas and spaces', () => {
    expect(parseAmount(' ₹2,00,000 ')).toBe(20000000);
  });

  it('accepts a single leading dot', () => {
    expect(parseAmount('.5')).toBe(50);
  });

  it('rejects junk', () => {
    expect(parseAmount('')).toBeNull();
    expect(parseAmount('abc')).toBeNull();
    expect(parseAmount('12.345')).toBeNull();
    expect(parseAmount('-5')).toBeNull();
    expect(parseAmount('1.2.3')).toBeNull();
  });
});

describe('formatPaise', () => {
  it('groups in the Indian style', () => {
    expect(formatPaise(20000000)).toBe('₹2,00,000');
    expect(formatPaise(199900)).toBe('₹1,999');
    expect(formatPaise(99900)).toBe('₹999');
  });

  it('shows paise only when there are any', () => {
    expect(formatPaise(199950)).toBe('₹1,999.50');
    expect(formatPaise(199900, { alwaysPaise: true })).toBe('₹1,999.00');
    expect(formatPaise(199900, { symbol: false })).toBe('1,999');
  });
});

describe('toUpiAmount', () => {
  it('always uses two decimals and no grouping', () => {
    expect(toUpiAmount(199900)).toBe('1999.00');
    expect(toUpiAmount(20000000)).toBe('200000.00');
    expect(toUpiAmount(5)).toBe('0.05');
  });
});
