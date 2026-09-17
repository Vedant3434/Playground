/**
 * All money in this app is handled as an integer number of paise.
 * Never use floats for amounts: 0.1 + 0.2 problems turn into rupees that
 * don't add up, and a split whose parts don't sum to the bill is useless.
 */

export const PAISE_PER_RUPEE = 100;

/** ₹2,000 — the value at and above which the extra charge applies. */
export const MDR_THRESHOLD_PAISE = 2000 * PAISE_PER_RUPEE;

/** ₹1,999 — the largest whole-rupee amount that stays under the threshold. */
export const DEFAULT_CAP_PAISE = 1999 * PAISE_PER_RUPEE;

/**
 * Parse user input ("1999", "₹1,999.50", " 2,00,000 ") into paise.
 * Returns null for anything that isn't a well-formed non-negative amount.
 * Parsing is done on the digit string, not via parseFloat, so exact.
 */
export function parseAmount(input: string): number | null {
  if (typeof input !== 'string') return null;
  const cleaned = input.replace(/[₹,\s_]/g, '');
  if (cleaned === '') return null;
  if (!/^\d*(\.\d{0,2})?$/.test(cleaned)) return null;

  const [whole, frac = ''] = cleaned.split('.');
  if (whole === '' && frac === '') return null;

  const rupees = whole === '' ? 0 : Number(whole);
  if (!Number.isSafeInteger(rupees)) return null;
  const paise = Number(frac.padEnd(2, '0'));

  return rupees * PAISE_PER_RUPEE + paise;
}

/** Group digits the Indian way: 12,34,567 rather than 1,234,567. */
function groupIndian(digits: string): string {
  if (digits.length <= 3) return digits;
  const last3 = digits.slice(-3);
  const rest = digits.slice(0, -3);
  return rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + last3;
}

export interface FormatOptions {
  /** Prefix with ₹. Default true. */
  symbol?: boolean;
  /** Always show paise, even when .00. Default: only when non-zero. */
  alwaysPaise?: boolean;
}

export function formatPaise(paise: number, options: FormatOptions = {}): string {
  const { symbol = true, alwaysPaise = false } = options;
  const negative = paise < 0;
  const abs = Math.abs(Math.round(paise));
  const rupees = Math.floor(abs / PAISE_PER_RUPEE);
  const frac = abs % PAISE_PER_RUPEE;

  let out = groupIndian(String(rupees));
  if (frac !== 0 || alwaysPaise) out += '.' + String(frac).padStart(2, '0');
  if (symbol) out = '₹' + out;
  return (negative ? '-' : '') + out;
}

/** The plain "1999.00" form that UPI deep links require in `am`. */
export function toUpiAmount(paise: number): string {
  const abs = Math.abs(Math.round(paise));
  const rupees = Math.floor(abs / PAISE_PER_RUPEE);
  const frac = abs % PAISE_PER_RUPEE;
  return `${rupees}.${String(frac).padStart(2, '0')}`;
}
