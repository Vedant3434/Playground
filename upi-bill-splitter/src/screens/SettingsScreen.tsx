import React, { useState } from 'react';
import { Switch, View } from 'react-native';
import { Body, Button, Card, Field, SectionTitle, Segmented } from '../components/ui';
import { DEFAULT_CAP_PAISE, formatPaise, MDR_THRESHOLD_PAISE, PAISE_PER_RUPEE, parseAmount, toUpiAmount } from '../lib/money';
import { SplitStrategy } from '../lib/split';
import { DEFAULT_SETTINGS, Settings } from '../lib/storage';
import { UPI_APPS } from '../lib/upi';
import { spacing, useTheme } from '../theme';

export function SettingsScreen({
  settings,
  onChange,
}: {
  settings: Settings;
  onChange: (settings: Settings) => void;
}) {
  const theme = useTheme();
  const [capText, setCapText] = useState(toUpiAmount(settings.capPaise));

  function commitCap(text: string) {
    setCapText(text);
    const paise = parseAmount(text);
    if (paise !== null && paise > 0) onChange({ ...settings, capPaise: paise });
  }

  return (
    <View style={{ gap: spacing.lg }}>
      <Card>
        <SectionTitle>Payment limit</SectionTitle>
        <Field
          label="Keep every payment at or below"
          value={capText}
          onChangeText={commitCap}
          keyboardType="decimal-pad"
          placeholder="1999"
          error={
            settings.capPaise >= MDR_THRESHOLD_PAISE
              ? 'At ₹2,000 or above, payments can still cross the threshold.'
              : null
          }
          hint={`Default is ${formatPaise(DEFAULT_CAP_PAISE)} — the most you can send and stay under ₹2,000.`}
        />
        <Button
          title="Reset to ₹1,999"
          variant="ghost"
          onPress={() => {
            setCapText(toUpiAmount(DEFAULT_CAP_PAISE));
            onChange({ ...settings, capPaise: DEFAULT_CAP_PAISE });
          }}
        />
      </Card>

      <Card>
        <SectionTitle>Defaults</SectionTitle>
        <Body dim>Layout used for new splits</Body>
        <Segmented
          options={[
            { value: 'fill' as SplitStrategy, label: 'Max fill' },
            { value: 'even' as SplitStrategy, label: 'Even' },
            { value: 'varied' as SplitStrategy, label: 'Varied' },
          ]}
          value={settings.strategy}
          onChange={(strategy) => onChange({ ...settings, strategy })}
        />

        <Body dim>Round payments to</Body>
        <Segmented
          options={[
            { value: 'paise', label: 'Exact paise' },
            { value: 'rupee', label: 'Whole ₹1' },
            { value: 'ten', label: 'Whole ₹10' },
          ]}
          value={settings.roundToPaise === 1 ? 'paise' : settings.roundToPaise === 10 * PAISE_PER_RUPEE ? 'ten' : 'rupee'}
          onChange={(value) =>
            onChange({
              ...settings,
              roundToPaise: value === 'paise' ? 1 : value === 'ten' ? 10 * PAISE_PER_RUPEE : PAISE_PER_RUPEE,
            })
          }
        />

        <Field
          label="Default UPI ID"
          value={settings.defaultVpa}
          onChangeText={(defaultVpa) => onChange({ ...settings, defaultVpa })}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="you@okaxis"
        />
        <Field
          label="Default payee name"
          value={settings.defaultPayeeName}
          onChangeText={(defaultPayeeName) => onChange({ ...settings, defaultPayeeName })}
          placeholder="Optional"
        />
      </Card>

      <Card>
        <SectionTitle>Open payments in</SectionTitle>
        <View style={{ gap: spacing.sm }}>
          {UPI_APPS.map((app) => (
            <Button
              key={app.id}
              title={app.label}
              variant={settings.preferredApp === app.id ? 'primary' : 'ghost'}
              onPress={() => onChange({ ...settings, preferredApp: app.id })}
            />
          ))}
        </View>
        <Body dim>
          If the chosen app is not installed, the payment falls back to whatever UPI apps you do have.
        </Body>
      </Card>

      <Card>
        <SectionTitle>Extras</SectionTitle>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Body>Vibrate on taps</Body>
          <Switch
            value={settings.haptics}
            onValueChange={(haptics) => onChange({ ...settings, haptics })}
            trackColor={{ true: theme.accent, false: theme.border }}
          />
        </View>
        <Field
          label="Charge rate used for estimates (%)"
          value={String(settings.surchargeRatePercent)}
          onChangeText={(text) => {
            const rate = Number(text.replace(/[^0-9.]/g, ''));
            if (Number.isFinite(rate)) onChange({ ...settings, surchargeRatePercent: rate });
          }}
          keyboardType="decimal-pad"
          hint="Only used for the rough “you avoided about ₹x” line."
        />
      </Card>

      <Card>
        <SectionTitle>Worth knowing</SectionTitle>
        <Body dim>
          Charges on UPI depend on how the payment is funded and on the merchant's own agreement with their bank.
          Splitting keeps each payment below the ₹2,000 mark; it does not change anything else about the payment, and
          the estimate shown is indicative only.
        </Body>
        <Body dim>
          Some merchants and UPI apps limit how many payments you can send to the same payee in quick succession.
          Each payment here carries its own reference so they are not mistaken for accidental duplicates.
        </Body>
      </Card>

      <Button title="Reset everything to defaults" variant="danger" onPress={() => {
        setCapText(toUpiAmount(DEFAULT_SETTINGS.capPaise));
        onChange(DEFAULT_SETTINGS);
      }} />
    </View>
  );
}
