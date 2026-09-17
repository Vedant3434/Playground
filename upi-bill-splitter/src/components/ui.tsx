import React from 'react';
import {
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { radius, spacing, useTheme } from '../theme';

export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const theme = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: theme.surface,
          borderColor: theme.border,
          borderWidth: StyleSheet.hairlineWidth,
          borderRadius: radius.lg,
          padding: spacing.lg,
          gap: spacing.md,
        },
        style,
      ]}>
      {children}
    </View>
  );
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <Text
      style={{
        color: theme.textDim,
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 1.1,
        textTransform: 'uppercase',
      }}>
      {children}
    </Text>
  );
}

export function Body({ children, dim, style }: { children: React.ReactNode; dim?: boolean; style?: StyleProp<TextStyle> }) {
  const theme = useTheme();
  return <Text style={[{ color: dim ? theme.textDim : theme.text, fontSize: 14, lineHeight: 20 }, style]}>{children}</Text>;
}

export function Field({
  label,
  hint,
  error,
  ...inputProps
}: TextInputProps & { label: string; hint?: string; error?: string | null }) {
  const theme = useTheme();
  return (
    <View style={{ gap: spacing.xs }}>
      <Text style={{ color: theme.textDim, fontSize: 13, fontWeight: '600' }}>{label}</Text>
      <TextInput
        placeholderTextColor={theme.textDim}
        {...inputProps}
        style={[
          {
            backgroundColor: theme.surfaceAlt,
            borderColor: error ? theme.danger : theme.border,
            borderWidth: StyleSheet.hairlineWidth,
            borderRadius: radius.md,
            color: theme.text,
            fontSize: 16,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.md,
          },
          inputProps.style,
        ]}
      />
      {error ? (
        <Text style={{ color: theme.danger, fontSize: 12 }}>{error}</Text>
      ) : hint ? (
        <Text style={{ color: theme.textDim, fontSize: 12 }}>{hint}</Text>
      ) : null}
    </View>
  );
}

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
}) {
  const theme = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: theme.surfaceAlt,
        borderRadius: radius.md,
        padding: 3,
        gap: 3,
      }}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            style={{
              flex: 1,
              alignItems: 'center',
              paddingVertical: spacing.sm + 1,
              borderRadius: radius.sm,
              backgroundColor: selected ? theme.accent : 'transparent',
            }}>
            <Text
              numberOfLines={1}
              style={{
                color: selected ? theme.accentText : theme.textDim,
                fontWeight: '700',
                fontSize: 13,
              }}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled,
  style,
}: {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'ghost' | 'danger';
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const background =
    variant === 'primary' ? theme.accent : variant === 'danger' ? 'transparent' : theme.surfaceAlt;
  const color =
    variant === 'primary' ? theme.accentText : variant === 'danger' ? theme.danger : theme.text;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        {
          backgroundColor: background,
          borderRadius: radius.md,
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.lg,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: variant === 'danger' ? StyleSheet.hairlineWidth : 0,
          borderColor: theme.danger,
          opacity: disabled ? 0.45 : pressed ? 0.8 : 1,
        },
        style,
      ]}>
      <Text style={{ color, fontWeight: '700', fontSize: 15 }}>{title}</Text>
    </Pressable>
  );
}

export function Pill({ text, tone = 'neutral' }: { text: string; tone?: 'neutral' | 'good' | 'warn' }) {
  const theme = useTheme();
  const color = tone === 'good' ? theme.success : tone === 'warn' ? theme.warning : theme.textDim;
  return (
    <View
      style={{
        alignSelf: 'flex-start',
        borderColor: color,
        borderWidth: StyleSheet.hairlineWidth,
        borderRadius: radius.pill,
        paddingHorizontal: spacing.md,
        paddingVertical: 4,
      }}>
      <Text style={{ color, fontSize: 12, fontWeight: '700' }}>{text}</Text>
    </View>
  );
}

export function ProgressBar({ value }: { value: number }) {
  const theme = useTheme();
  const clamped = Math.max(0, Math.min(1, value));
  return (
    <View
      accessibilityRole="progressbar"
      style={{ height: 8, borderRadius: radius.pill, backgroundColor: theme.surfaceAlt, overflow: 'hidden' }}>
      <View style={{ width: `${clamped * 100}%`, height: '100%', backgroundColor: theme.accent }} />
    </View>
  );
}
