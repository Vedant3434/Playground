import * as Haptics from 'expo-haptics';
import { Linking, Platform } from 'react-native';
import { buildUpiUri, UpiLinkParams } from './upi';

export class NoUpiAppError extends Error {
  constructor() {
    super('No UPI app could be opened. Install one, or scan the QR code from another phone.');
  }
}

/**
 * Hand a payment to a UPI app.
 *
 * Preferred-app links are tried first, then the neutral `upi://pay` link, which
 * on Android brings up the system chooser. Android 11+ hides other apps from
 * `canOpenURL` unless they are declared in the manifest, so we simply attempt
 * the link and treat a throw as "not installed".
 */
export async function openPayment(params: UpiLinkParams, appId: string): Promise<void> {
  const candidates = appId === 'any' ? [buildUpiUri(params, 'any')] : [buildUpiUri(params, appId), buildUpiUri(params, 'any')];

  for (const uri of candidates) {
    try {
      // iOS reports honestly for schemes declared in LSApplicationQueriesSchemes.
      if (Platform.OS === 'ios' && !(await Linking.canOpenURL(uri))) continue;
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
