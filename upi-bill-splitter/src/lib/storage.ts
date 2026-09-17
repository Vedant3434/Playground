import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_CAP_PAISE, PAISE_PER_RUPEE } from './money';
import { SplitStrategy } from './split';

const KEY_SETTINGS = 'sub2k.settings.v1';
const KEY_PLANS = 'sub2k.plans.v1';
const KEY_PAYEES = 'sub2k.payees.v1';

export interface Settings {
  capPaise: number;
  strategy: SplitStrategy;
  roundToPaise: number;
  /** Which UPI app to hand payments to; 'any' shows the system chooser. */
  preferredApp: string;
  defaultVpa: string;
  defaultPayeeName: string;
  /** Used only for the "you avoided about ₹x" estimate. */
  surchargeRatePercent: number;
  haptics: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  capPaise: DEFAULT_CAP_PAISE,
  strategy: 'fill',
  roundToPaise: PAISE_PER_RUPEE,
  preferredApp: 'any',
  defaultVpa: '',
  defaultPayeeName: '',
  surchargeRatePercent: 1.1,
  haptics: true,
};

export interface Payment {
  id: string;
  amountPaise: number;
  ref: string;
  paid: boolean;
  /** Name of whoever owes this payment, in a group split. */
  owedBy: string | null;
}

export interface Plan {
  id: string;
  createdAt: number;
  label: string;
  totalPaise: number;
  capPaise: number;
  strategy: SplitStrategy;
  payeeVpa: string;
  payeeName: string;
  payments: Payment[];
}

async function readJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return fallback;
    return { ...fallback, ...(JSON.parse(raw) as object) } as T;
  } catch {
    return fallback;
  }
}

export async function loadSettings(): Promise<Settings> {
  return readJson<Settings>(KEY_SETTINGS, DEFAULT_SETTINGS);
}

export async function saveSettings(settings: Settings): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY_SETTINGS, JSON.stringify(settings));
  } catch {
    // Storage being unavailable shouldn't stop anyone paying a bill.
  }
}

export async function loadPlans(): Promise<Plan[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY_PLANS);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as Plan[]) : [];
  } catch {
    return [];
  }
}

export async function savePlans(plans: Plan[]): Promise<void> {
  try {
    // Keep the list from growing without bound.
    await AsyncStorage.setItem(KEY_PLANS, JSON.stringify(plans.slice(0, 50)));
  } catch {
    // ignored
  }
}

export async function loadPayees(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY_PAYEES);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    return [];
  }
}

export async function savePayees(payees: string[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY_PAYEES, JSON.stringify(payees.slice(0, 12)));
  } catch {
    // ignored
  }
}
