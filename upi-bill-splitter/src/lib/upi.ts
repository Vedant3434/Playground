import { toUpiAmount } from './money';

/**
 * UPI deep links, per the NPCI "UPI Linking Specification" query format:
 *   upi://pay?pa=<vpa>&pn=<name>&am=<amount>&cu=INR&tn=<note>&tr=<ref>
 * Individual apps accept the same query string under their own scheme.
 */

export interface UpiApp {
  id: string;
  label: string;
  /** URL scheme to open this app's payment screen directly. */
  scheme: string;
  /** Android package, for intent-style links and store fallbacks. */
  androidPackage?: string;
}

export const UPI_APPS: UpiApp[] = [
  { id: 'any', label: 'Ask me each time', scheme: 'upi://pay' },
  { id: 'gpay', label: 'Google Pay', scheme: 'tez://upi/pay', androidPackage: 'com.google.android.apps.nbu.paisa.user' },
  { id: 'phonepe', label: 'PhonePe', scheme: 'phonepe://pay', androidPackage: 'com.phonepe.app' },
  { id: 'paytm', label: 'Paytm', scheme: 'paytmmp://pay', androidPackage: 'net.one97.paytm' },
  { id: 'bhim', label: 'BHIM', scheme: 'bhim://pay', androidPackage: 'in.org.npci.upiapp' },
];

export function findApp(id: string): UpiApp {
  return UPI_APPS.find((app) => app.id === id) ?? UPI_APPS[0];
}

/**
 * A VPA is <handle>@<psp>, e.g. someone@okhdfcbank. The handle allows letters,
 * digits, dots, hyphens and underscores; the PSP part is letters only.
 */
const VPA_PATTERN = /^[a-zA-Z0-9](?:[a-zA-Z0-9._-]{0,254}[a-zA-Z0-9])?@[a-zA-Z][a-zA-Z0-9]{1,63}$/;

export function normaliseVpa(vpa: string): string {
  return vpa.trim().toLowerCase();
}

export function isValidVpa(vpa: string): boolean {
  return VPA_PATTERN.test(normaliseVpa(vpa));
}

/** UPI notes are narrow: keep to safe characters and a sane length. */
export function sanitiseNote(note: string, maxLength = 48): string {
  return note
    .replace(/[^a-zA-Z0-9 .\-_/]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

/**
 * A distinct reference for every payment. Several payments of the same amount
 * to the same payee within a few minutes can otherwise be treated as an
 * accidental double-tap and blocked, so each one gets its own ref.
 */
export function makeRef(index: number, now: number = Date.now()): string {
  const stamp = now.toString(36).toUpperCase();
  const salt = Math.floor(Math.random() * 36 ** 3)
    .toString(36)
    .toUpperCase()
    .padStart(3, '0');
  return `S2K${stamp}${salt}${String(index + 1).padStart(2, '0')}`.slice(0, 35);
}

export interface UpiLinkParams {
  /** Payee VPA (pa). Required. */
  vpa: string;
  /** Payee name (pn). */
  name?: string;
  /** Amount in paise (am). Omit for an open-amount link. */
  amountPaise?: number;
  /** Note shown to the payer (tn). */
  note?: string;
  /** Transaction reference (tr). */
  ref?: string;
  /** Merchant category code (mc), when paying a registered merchant. */
  merchantCode?: string;
}

export class UpiLinkError extends Error {}

export function buildUpiUri(params: UpiLinkParams, appId = 'any'): string {
  const vpa = normaliseVpa(params.vpa);
  if (!isValidVpa(vpa)) throw new UpiLinkError('That UPI ID does not look right.');

  const query: Array<[string, string]> = [['pa', vpa]];
  if (params.name) query.push(['pn', sanitiseNote(params.name, 40) || 'Payee']);
  if (params.amountPaise !== undefined) {
    if (!Number.isInteger(params.amountPaise) || params.amountPaise <= 0) {
      throw new UpiLinkError('Amount must be a positive whole number of paise.');
    }
    query.push(['am', toUpiAmount(params.amountPaise)]);
  }
  query.push(['cu', 'INR']);
  if (params.merchantCode) query.push(['mc', params.merchantCode]);
  if (params.note) {
    const note = sanitiseNote(params.note);
    if (note) query.push(['tn', note]);
  }
  if (params.ref) query.push(['tr', sanitiseNote(params.ref, 35).replace(/[^a-zA-Z0-9]/g, '')]);

  const search = query.map(([key, value]) => `${key}=${encodeURIComponent(value)}`).join('&');
  return `${findApp(appId).scheme}?${search}`;
}

/**
 * The string that goes inside a QR code. QR payloads always use the neutral
 * `upi://pay` scheme so any app can scan them.
 */
export function buildUpiQrPayload(params: UpiLinkParams): string {
  return buildUpiUri(params, 'any');
}
