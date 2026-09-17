import React from 'react';
import { Modal, Pressable, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { formatPaise } from '../lib/money';
import { radius, spacing, useTheme } from '../theme';
import { Body, Button, SectionTitle } from './ui';

/**
 * Shows one payment as a scannable UPI QR. Handy when the person paying isn't
 * the person holding this phone — they scan, their app fills in the amount.
 */
export function QrModal({
  visible,
  payload,
  amountPaise,
  caption,
  onClose,
}: {
  visible: boolean;
  payload: string | null;
  amountPaise: number;
  caption: string;
  onClose: () => void;
}) {
  const theme = useTheme();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        onPress={onClose}
        style={{ flex: 1, backgroundColor: '#000000B0', alignItems: 'center', justifyContent: 'center', padding: spacing.xl }}>
        <Pressable
          onPress={(event) => event.stopPropagation()}
          style={{
            backgroundColor: theme.surface,
            borderRadius: radius.lg,
            padding: spacing.xl,
            gap: spacing.lg,
            alignItems: 'center',
            width: '100%',
            maxWidth: 360,
          }}>
          <SectionTitle>Scan to pay</SectionTitle>
          <Body style={{ fontSize: 28, fontWeight: '800' }}>{formatPaise(amountPaise, { alwaysPaise: true })}</Body>
          <View style={{ backgroundColor: '#FFFFFF', padding: spacing.md, borderRadius: radius.md }}>
            {payload ? <QRCode value={payload} size={220} /> : null}
          </View>
          <Body dim style={{ textAlign: 'center' }}>
            {caption}
          </Body>
          <Button title="Done" onPress={onClose} style={{ alignSelf: 'stretch' }} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}
