import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { formatPaise } from '../lib/money';
import { Payment } from '../lib/storage';
import { radius, spacing, useTheme } from '../theme';

/**
 * One payment in the plan: tick it off when it goes through, or fire it
 * straight into a UPI app.
 */
export function PaymentRow({
  payment,
  index,
  total,
  onTogglePaid,
  onPay,
  onCopy,
  onShowQr,
}: {
  payment: Payment;
  index: number;
  total: number;
  onTogglePaid: () => void;
  onPay: () => void;
  onCopy: () => void;
  onShowQr: () => void;
}) {
  const theme = useTheme();

  return (
    <View
      style={{
        backgroundColor: theme.surface,
        borderColor: payment.paid ? theme.success : theme.border,
        borderWidth: StyleSheet.hairlineWidth,
        borderRadius: radius.md,
        padding: spacing.md,
        gap: spacing.md,
        opacity: payment.paid ? 0.7 : 1,
      }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <Pressable
          accessibilityRole="checkbox"
          accessibilityLabel={`Mark payment ${index + 1} as ${payment.paid ? 'unpaid' : 'paid'}`}
          accessibilityState={{ checked: payment.paid }}
          onPress={onTogglePaid}
          hitSlop={8}
          style={{
            width: 28,
            height: 28,
            borderRadius: radius.sm,
            borderWidth: 2,
            borderColor: payment.paid ? theme.success : theme.border,
            backgroundColor: payment.paid ? theme.success : 'transparent',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          {payment.paid ? <Text style={{ color: theme.accentText, fontWeight: '900' }}>✓</Text> : null}
        </Pressable>

        <View style={{ flex: 1 }}>
          <Text
            style={{
              color: theme.text,
              fontSize: 20,
              fontWeight: '800',
              textDecorationLine: payment.paid ? 'line-through' : 'none',
            }}>
            {formatPaise(payment.amountPaise, { alwaysPaise: true })}
          </Text>
          <Text style={{ color: theme.textDim, fontSize: 12 }}>
            Payment {index + 1} of {total}
            {payment.owedBy ? ` · ${payment.owedBy}` : ''}
          </Text>
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <RowAction label="Pay" primary onPress={onPay} />
        <RowAction label="Copy" onPress={onCopy} />
        <RowAction label="QR" onPress={onShowQr} />
      </View>
    </View>
  );
}

function RowAction({ label, onPress, primary }: { label: string; onPress: () => void; primary?: boolean }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        alignItems: 'center',
        paddingVertical: spacing.sm + 2,
        borderRadius: radius.sm,
        backgroundColor: primary ? theme.accent : theme.surfaceAlt,
        opacity: pressed ? 0.75 : 1,
      })}>
      <Text style={{ color: primary ? theme.accentText : theme.text, fontWeight: '700', fontSize: 13 }}>{label}</Text>
    </Pressable>
  );
}
