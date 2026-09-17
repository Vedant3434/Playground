import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  DEFAULT_SETTINGS,
  loadPayees,
  loadPlans,
  loadSettings,
  Plan,
  savePayees,
  savePlans,
  saveSettings,
  Settings,
} from './src/lib/storage';
import { PlansScreen } from './src/screens/PlansScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { SplitScreen } from './src/screens/SplitScreen';
import { spacing, useTheme } from './src/theme';

type Tab = 'split' | 'plans' | 'settings';

const TABS: { id: Tab; label: string }[] = [
  { id: 'split', label: 'Split' },
  { id: 'plans', label: 'Saved' },
  { id: 'settings', label: 'Settings' },
];

export default function App() {
  return (
    <SafeAreaProvider>
      <Root />
    </SafeAreaProvider>
  );
}

function Root() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<Tab>('split');
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [payees, setPayees] = useState<string[]>([]);
  const [activePlanId, setActivePlanId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [storedSettings, storedPlans, storedPayees] = await Promise.all([loadSettings(), loadPlans(), loadPayees()]);
      if (cancelled) return;
      setSettings(storedSettings);
      setPlans(storedPlans);
      setPayees(storedPayees);
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const updateSettings = useCallback((next: Settings) => {
    setSettings(next);
    void saveSettings(next);
  }, []);

  const persistPlans = useCallback((next: Plan[]) => {
    setPlans(next);
    void savePlans(next);
  }, []);

  const activePlan = plans.find((plan) => plan.id === activePlanId) ?? null;

  const createPlan = useCallback(
    (plan: Plan) => {
      persistPlans([plan, ...plans]);
      setActivePlanId(plan.id);
    },
    [plans, persistPlans],
  );

  const updatePlan = useCallback(
    (plan: Plan) => persistPlans(plans.map((existing) => (existing.id === plan.id ? plan : existing))),
    [plans, persistPlans],
  );

  const rememberPayee = useCallback(
    (vpa: string) => {
      const next = [vpa, ...payees.filter((existing) => existing !== vpa)].slice(0, 6);
      setPayees(next);
      void savePayees(next);
    },
    [payees],
  );

  if (!ready) {
    return <View style={{ flex: 1, backgroundColor: theme.bg }} />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg, paddingTop: insets.top }}>
      <StatusBar style={theme.dark ? 'light' : 'dark'} />

      <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.md }}>
        <Text style={{ color: theme.text, fontSize: 26, fontWeight: '900', letterSpacing: -0.5 }}>Sub2K</Text>
        <Text style={{ color: theme.textDim, fontSize: 13 }}>Bills, paid in pieces under ₹2,000</Text>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={{ padding: spacing.lg, paddingTop: 0, paddingBottom: spacing.xxl, gap: spacing.lg }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag">
          {tab === 'split' ? (
            <SplitScreen
              settings={settings}
              plan={activePlan}
              payees={payees}
              onCreatePlan={createPlan}
              onUpdatePlan={updatePlan}
              onClearPlan={() => setActivePlanId(null)}
              onRememberPayee={rememberPayee}
            />
          ) : null}

          {tab === 'plans' ? (
            <PlansScreen
              plans={plans}
              onOpen={(plan) => {
                setActivePlanId(plan.id);
                setTab('split');
              }}
              onDelete={(id) => {
                if (activePlanId === id) setActivePlanId(null);
                persistPlans(plans.filter((plan) => plan.id !== id));
              }}
              onClearAll={() => {
                setActivePlanId(null);
                persistPlans([]);
              }}
            />
          ) : null}

          {tab === 'settings' ? <SettingsScreen settings={settings} onChange={updateSettings} /> : null}
        </ScrollView>
      </KeyboardAvoidingView>

      <View
        style={{
          flexDirection: 'row',
          borderTopWidth: 1,
          borderTopColor: theme.border,
          backgroundColor: theme.surface,
          paddingBottom: insets.bottom,
        }}>
        {TABS.map((item) => {
          const selected = item.id === tab;
          return (
            <Pressable
              key={item.id}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              onPress={() => setTab(item.id)}
              style={{ flex: 1, alignItems: 'center', paddingVertical: spacing.md }}>
              <Text style={{ color: selected ? theme.accent : theme.textDim, fontWeight: '700', fontSize: 14 }}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
