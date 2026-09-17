import React from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { Body, Button, Card, Pill, ProgressBar, SectionTitle } from '../components/ui';
import { formatPaise } from '../lib/money';
import { Plan } from '../lib/storage';
import { spacing, useTheme } from '../theme';

/** Past and part-finished splits. Tap one to carry on paying it off. */
export function PlansScreen({
  plans,
  onOpen,
  onDelete,
  onClearAll,
}: {
  plans: Plan[];
  onOpen: (plan: Plan) => void;
  onDelete: (id: string) => void;
  onClearAll: () => void;
}) {
  const theme = useTheme();

  if (plans.length === 0) {
    return (
      <Card>
        <SectionTitle>Nothing here yet</SectionTitle>
        <Body dim>Splits you create show up here, so you can pick up a half-paid bill later.</Body>
      </Card>
    );
  }

  return (
    <View style={{ gap: spacing.lg }}>
      {plans.map((plan) => {
        const paid = plan.payments.filter((p) => p.paid).length;
        const done = paid === plan.payments.length;
        return (
          <Pressable key={plan.id} onPress={() => onOpen(plan)} accessibilityRole="button">
            <Card>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.md }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.text, fontSize: 18, fontWeight: '800' }}>{plan.label}</Text>
                  <Body dim>
                    {formatPaise(plan.totalPaise, { alwaysPaise: true })} · {new Date(plan.createdAt).toLocaleDateString()}
                  </Body>
                </View>
                {done ? <Pill tone="good" text="Done" /> : <Pill text={`${paid}/${plan.payments.length} paid`} />}
              </View>
              <ProgressBar value={plan.payments.length === 0 ? 0 : paid / plan.payments.length} />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Body dim>{plan.payeeVpa || 'No UPI ID saved'}</Body>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Delete ${plan.label}`}
                  hitSlop={8}
                  onPress={() =>
                    Alert.alert('Delete this split?', plan.label, [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Delete', style: 'destructive', onPress: () => onDelete(plan.id) },
                    ])
                  }>
                  <Text style={{ color: theme.danger, fontWeight: '700', fontSize: 13 }}>Delete</Text>
                </Pressable>
              </View>
            </Card>
          </Pressable>
        );
      })}

      <Button
        title="Clear all splits"
        variant="danger"
        onPress={() =>
          Alert.alert('Clear every saved split?', 'This cannot be undone.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Clear', style: 'destructive', onPress: onClearAll },
          ])
        }
      />
    </View>
  );
}
