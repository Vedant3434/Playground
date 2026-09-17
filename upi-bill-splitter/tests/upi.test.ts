import { describe, expect, it } from 'vitest';
import { buildUpiUri, isValidVpa, makeRef, sanitiseNote, UpiLinkError } from '../src/lib/upi';

describe('isValidVpa', () => {
  it('accepts real-looking handles', () => {
    expect(isValidVpa('someone@okhdfcbank')).toBe(true);
    expect(isValidVpa('first.last-1_2@ybl')).toBe(true);
    expect(isValidVpa('  Someone@OKAXIS ')).toBe(true);
  });

  it('rejects malformed ones', () => {
    expect(isValidVpa('someone')).toBe(false);
    expect(isValidVpa('@ybl')).toBe(false);
    expect(isValidVpa('someone@')).toBe(false);
    expect(isValidVpa('someone@@ybl')).toBe(false);
    expect(isValidVpa('.someone@ybl')).toBe(false);
    expect(isValidVpa('someone@1ybl')).toBe(false);
  });
});

describe('buildUpiUri', () => {
  it('builds a standard payment link', () => {
    const uri = buildUpiUri({
      vpa: 'Cafe@okicici',
      name: 'Blue Tokai',
      amountPaise: 199900,
      note: 'Dinner 1 of 3',
      ref: 'S2KABC01',
    });
    expect(uri).toBe(
      'upi://pay?pa=cafe%40okicici&pn=Blue%20Tokai&am=1999.00&cu=INR&tn=Dinner%201%20of%203&tr=S2KABC01',
    );
  });

  it('uses the chosen app scheme with the same query', () => {
    const uri = buildUpiUri({ vpa: 'cafe@okicici', amountPaise: 100 }, 'gpay');
    expect(uri.startsWith('tez://upi/pay?')).toBe(true);
    expect(uri).toContain('am=1.00');
  });

  it('falls back to the neutral scheme for an unknown app', () => {
    expect(buildUpiUri({ vpa: 'cafe@okicici' }, 'nope').startsWith('upi://pay?')).toBe(true);
  });

  it('omits the amount for open links', () => {
    expect(buildUpiUri({ vpa: 'cafe@okicici' })).toBe('upi://pay?pa=cafe%40okicici&cu=INR');
  });

  it('refuses a bad VPA or amount', () => {
    expect(() => buildUpiUri({ vpa: 'nope' })).toThrow(UpiLinkError);
    expect(() => buildUpiUri({ vpa: 'cafe@okicici', amountPaise: 0 })).toThrow(UpiLinkError);
    expect(() => buildUpiUri({ vpa: 'cafe@okicici', amountPaise: 10.5 })).toThrow(UpiLinkError);
  });

  it('strips characters UPI apps choke on', () => {
    const uri = buildUpiUri({ vpa: 'cafe@okicici', note: 'Table #7 — 50% off!' });
    expect(uri).toContain('tn=Table%207%2050%20off');
  });
});

describe('sanitiseNote', () => {
  it('collapses whitespace and truncates', () => {
    expect(sanitiseNote('  a   b  ')).toBe('a b');
    expect(sanitiseNote('x'.repeat(80)).length).toBe(48);
  });
});

describe('makeRef', () => {
  it('is alphanumeric, bounded, and unique per payment', () => {
    const refs = new Set(Array.from({ length: 20 }, (_, i) => makeRef(i)));
    for (const ref of refs) {
      expect(ref).toMatch(/^[A-Z0-9]+$/);
      expect(ref.length).toBeLessThanOrEqual(35);
    }
    expect(refs.size).toBe(20);
  });
});
