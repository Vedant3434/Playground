import * as Haptics from 'expo-haptics';
import { Linking } from 'react-native';
import { buildUpiUri, UpiLinkParams } from './upi';

export class NoUpiAppError extends Error {
  constructor() {
    super('No UPI app could be opened. Install one, or scan the QR code from another phone.');
  }
}

/**
 * Hand a payment to a UPI app.
 *
 * The preferred app is tried first, then the neutral `upi://pay` link, which
 * brings up the system chooser.
 *
 * `canOpenURL` is only a hint here, never a veto. On Android 11+ other apps are
 * hidden from it unless they are declared in `<queries>`, and on iOS it needs
 * the scheme in `LSApplicationQueriesSchemes` — which a real build has but Expo
 * Go does not. Neither restriction applies to `openURL` itself, so a link that
 * `canOpenURL` denies is still attempted rather than written off.
 */
export async function openPayment(params: UpiLinkParams, appId: string): Promise<void> {
  const candidates =
    appId === 'any' ? [buildUpiUri(params, 'any')] : [buildUpiUri(params, appId), buildUpiUri(params, 'any')];

  // Prefer a link the system confirms it can handle.
  for (const uri of candidates) {
    try {
      if (await Linking.canOpenURL(uri)) {
        await Linking.openURL(uri);
        return;
      }
    } catch {
      // Fall through to the second pass.
    }
  }

  // Nothing confirmed: try them anyway. This is the path that works in Expo Go.
  for (const uri of candidates) {
    try {
      await Linking.openURL(uri);
      return;
    } catch {
      // Try the next candidate.
    }
  }

  throw new NoUpiAppError();
}

export async function tap(enabled: boolean): Promise<void> {
  if (!enabled) return;
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch {
    // Haptics are a nicety; never let them break a flow.
  }
}

export async function confirmTap(enabled: boolean): Promise<void> {
  if (!enabled) return;
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch {
    // ignored
  }
}
