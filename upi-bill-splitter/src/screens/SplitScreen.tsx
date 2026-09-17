import * as Clipboard from 'expo-clipboard';
import React, { useMemo, useState } from 'react';
import { Alert, Share, Text, View } from 'react-native';
import { PaymentRow } from '../components/PaymentRow';
import { PeopleEditor } from '../components/PeopleEditor';
import { QrModal } from '../components/QrModal';
import { Body, Button, Card, Field, Pill, ProgressBar, SectionTitle, Segmented } from '../components/ui';
import { makePerson, Person, splitAmongPeople } from '../lib/group';
import { formatPaise, MDR_THRESHOLD_PAISE, parseAmount, toUpiAmount } from '../lib/money';
import { confirmTap, openPayment, tap } from '../lib/pay';
import { estimateSurcharge, splitAmount, SplitStrategy } from '../lib/split';
import { Payment, Plan, Settings } from '../lib/storage';
import { buildUpiQrPayload, isValidVpa, makeRef } from '../lib/upi';
import { spacing, useTheme } from '../theme';

type Mode = 'solo' | 'group';

const STRATEGY_OPTIONS: { value: SplitStrategy; label: string }[] = [
  { value: 'fill', label: 'Max fill' },
  { value: 'even', label: 'Even' },
  { value: 'varied', label: 'Varied' },
];

const STRATEGY_BLURB: Record<SplitStrategy, string> = {
  fill: 'As many payments at the limit as possible, then the remainder.',
  even: 'Equal-sized payments — fewest payments, nothing near the limit.',
  varied: 'Even, then nudged about so you are not sending identical amounts.',
};

export function SplitScreen({
  settings,
  plan,
  onCreatePlan,
  onUpdatePlan,
  onClearPlan,
  onRememberPayee,
  payees,
}: {
  settings: Settings;
  plan: Plan | null;
  onCreatePlan: (plan: Plan) => void;
  onUpdatePlan: (plan: Plan) => void;
  onClearPlan: () => void;
  onRememberPayee: (vpa: string) => void;
  payees: string[];
}) {
  const theme = useTheme();

  const [amountText, setAmountText] = useState('');
  const [label, setLabel] = useState('');
  const [vpa, setVpa] = useState(settings.defaultVpa);
  const [payeeName, setPayeeName] = useState(settings.defaultPayeeName);
  const [mode, setMode] = useState<Mode>('solo');
  const [strategy, setStrategy] = useState<SplitStrategy>(settings.strategy);
  const [people, setPeople] = useState<Person[]>([makePerson('You', 'p1'), makePerson('Person 2', 'p2')]);
  const [qrFor, setQrFor] = useState<Payment | null>(null);

  const totalPaise = parseAmount(amountText);

  const preview = useMemo(() => {
    if (totalPaise === null || totalPaise <= 0) return null;
    const splitOptions = {
      capPaise: settings.capPaise,
      strategy,
      roundToPaise: settings.roundToPaise,
      // Seeding off the amount keeps 'varied' stable while you look at it.
      seed: totalPaise % 9973,
    };
    try {
      if (mode === 'solo') {
        const result = splitAmount(totalPaise, splitOptions);
        return {
          payments: result.chunks.map((amountPaise) => ({ amountPaise, owedBy: null as string | null })),
          warnings: result.warnings,
          error: null as string | null,
        };
      }
      const result = splitAmongPeople(totalPaise, people, splitOptions);
      return {
        payments: result.shares.flatMap((share) =>
          share.chunks.map((amountPaise) => ({ amountPaise, owedBy: share.person.name || 'Someone' })),
        ),
        warnings: result.warnings,
        error: null as string | null,
      };
    } catch (error) {
      return { payments: [], warnings: [], error: (error as Error).message };
    }
  }, [totalPaise, mode, strategy, people, settings.capPaise, settings.roundToPaise]);

  if (plan) {
    return (
      <ActivePlan
        plan={plan}
        settings={settings}
        onUpdatePlan={onUpdatePlan}
        onClearPlan={onClearPlan}
        qrFor={qrFor}
        setQrFor={setQrFor}
      />
    );
  }

  const vpaError = vpa.trim() !== '' && !isValidVpa(vpa) ? 'That UPI ID does not look right.' : null;
  const canSplit = totalPaise !== null && totalPaise > 0 && !preview?.error && !vpaError;
  const avoided = totalPaise ? estimateSurcharge(totalPaise, settings.surchargeRatePercent) : 0;

  function createPlan() {
    if (totalPaise === null || !preview || preview.payments.length === 0) return;
    const now = Date.now();
    const payments: Payment[] = preview.payments.map((payment, index) => ({
      id: `${now}-${index}`,
      amountPaise: payment.amountPaise,
      ref: makeRef(index, now),
      paid: false,
      owedBy: payment.owedBy,
    }));

    if (vpa.trim() !== '') onRememberPayee(vpa.trim().toLowerCase());

    onCreatePlan({
      id: String(now),
      createdAt: now,
      label: label.trim() || 'Bill',
      totalPaise,
      capPaise: settings.capPaise,
      strategy,
      payeeVpa: vpa.trim().toLowerCase(),
      payeeName: payeeName.trim(),
      payments,
    });
    void confirmTap(settings.haptics);
  }

  return (
    <View style={{ gap: spacing.lg }}>
      <Card>
        <SectionTitle>The bill</SectionTitle>
        <Field
          label="Total amount"
          value={amountText}
          onChangeText={setAmountText}
          placeholder="0"
          keyboardType="decimal-pad"
          style={{ fontSize: 34, fontWeight: '800', paddingVertical: spacing.md }}
          error={amountText.trim() !== '' && totalPaise === null ? 'Enter an amount like 4999 or 4999.50' : null}
        />
        <Field label="What for (optional)" value={label} onChangeText={setLabel} placeholder="Dinner at Blue Tokai" />

        {totalPaise !== null && totalPaise > 0 ? (
          <View style={{ gap: spacing.sm }}>
            {totalPaise < MDR_THRESHOLD_PAISE ? (
              <Pill tone="good" text={`${formatPaise(totalPaise)} is already under ₹2,000`} />
            ) : (
              <Pill tone="warn" text={`${formatPaise(totalPaise)} would cross ₹2,000 in one go`} />
            )}
            {avoided > 0 ? (
              <Body dim>
                Roughly {formatPaise(avoided)} in charges at {settings.surchargeRatePercent}% — an estimate, not a quote.
              </Body>
            ) : null}
          </View>
        ) : null}
      </Card>

      <Card>
        <SectionTitle>How to split it</SectionTitle>
        <Segmented
          options={[
            { value: 'solo' as Mode, label: 'Just me' },
            { value: 'group' as Mode, label: 'Split with people' },
          ]}
          value={mode}
          onChange={setMode}
        />
        {mode === 'group' ? <PeopleEditor people={people} onChange={setPeople} /> : null}

        <Segmented options={STRATEGY_OPTIONS} value={strategy} onChange={setStrategy} />
        <Body dim>{STRATEGY_BLURB[strategy]}</Body>

        {preview?.error ? <Body style={{ color: theme.danger }}>{preview.error}</Body> : null}
        {preview?.warnings.map((warning) => (
          <Body key={warning} style={{ color: theme.warning }}>
            {warning}
          </Body>
        ))}

        {preview && !preview.error && preview.payments.length > 0 ? (
          <View style={{ gap: spacing.xs }}>
            <Text style={{ color: theme.text, fontWeight: '700', fontSize: 16 }}>
              {preview.payments.length} payment{preview.payments.length === 1 ? '' : 's'}, largest{' '}
              {formatPaise(Math.max(...preview.payments.map((p) => p.amountPaise)))}
            </Text>
            <Body dim>{preview.payments.map((p) => formatPaise(p.amountPaise)).join('  +  ')}</Body>
          </View>
        ) : null}
      </Card>

      <Card>
        <SectionTitle>Pay to</SectionTitle>
        <Field
          label="UPI ID"
          value={vpa}
          onChangeText={setVpa}
          placeholder="merchant@okhdfcbank"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          error={vpaError}
          hint="Leave blank to just work out the amounts."
        />
        {payees.length > 0 ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {payees.map((saved) => (
              <Button key={saved} title={saved} variant="ghost" onPress={() => setVpa(saved)} style={{ paddingVertical: spacing.sm }} />
            ))}
          </View>
        ) : null}
        <Field label="Payee name (optional)" value={payeeName} onChangeText={setPayeeName} placeholder="Blue Tokai" />
      </Card>

      <Button title={canSplit ? `Split into ${preview?.payments.length ?? 0} payments` : 'Enter an amount'} onPress={createPlan} disabled={!canSplit} />
    </View>
  );
}

function ActivePlan({
  plan,
  settings,
  onUpdatePlan,
  onClearPlan,
  qrFor,
  setQrFor,
}: {
  plan: Plan;
  settings: Settings;
  onUpdatePlan: (plan: Plan) => void;
  onClearPlan: () => void;
  qrFor: Payment | null;
  setQrFor: (payment: Payment | null) => void;
}) {
  const theme = useTheme();
  const paidCount = plan.payments.filter((p) => p.paid).length;
  const paidPaise = plan.payments.filter((p) => p.paid).reduce((sum, p) => sum + p.amountPaise, 0);
  const done = paidCount === plan.payments.length;

  function togglePaid(payment: Payment) {
    void tap(settings.haptics);
    onUpdatePlan({
      ...plan,
      payments: plan.payments.map((p) => (p.id === payment.id ? { ...p, paid: !p.paid } : p)),
    });
  }

  function noteFor(payment: Payment, index: number): string {
    return `${plan.label} ${index + 1}/${plan.payments.length}`;
  }

  async function pay(payment: Payment, index: number) {
    if (!plan.payeeVpa) {
      Alert.alert('No UPI ID', 'Add a UPI ID to this split to pay from the app. You can still copy the amounts.');
      return;
    }
    try {
      await tap(settings.haptics);
      await openPayment(
        {
          vpa: plan.payeeVpa,
          name: plan.payeeName || undefined,
          amountPaise: payment.amountPaise,
          note: noteFor(payment, index),
          ref: payment.ref,
        },
        settings.preferredApp,
      );
    } catch (error) {
      Alert.alert('Could not open a UPI app', (error as Error).message);
    }
  }

  async function copyAmount(payment: Payment) {
    await Clipboard.setStringAsync(toUpiAmount(payment.amountPaise));
    void tap(settings.haptics);
  }

  function showQr(payment: Payment) {
    if (!plan.payeeVpa) {
      Alert.alert('No UPI ID', 'A QR code needs a UPI ID to pay into.');
      return;
    }
    setQrFor(payment);
  }

  async function sharePlan() {
    const lines = plan.payments.map(
      (payment, index) =>
        `${index + 1}. ${formatPaise(payment.amountPaise, { alwaysPaise: true })}${payment.owedBy ? ` — ${payment.owedBy}` : ''}`,
    );
    await Share.share({
      message: [
        `${plan.label} — ${formatPaise(plan.totalPaise, { alwaysPaise: true })}`,
        plan.payeeVpa ? `Pay to ${plan.payeeVpa}` : '',
        '',
        ...lines,
        '',
        `Every payment is ${formatPaise(plan.capPaise)} or less.`,
      ]
        .filter(Boolean)
        .join('\n'),
    });
  }

  const qrIndex = qrFor ? plan.payments.findIndex((p) => p.id === qrFor.id) : -1;

  return (
    <View style={{ gap: spacing.lg }}>
      <Card>
        <SectionTitle>{plan.label}</SectionTitle>
        <Text style={{ color: theme.text, fontSize: 34, fontWeight: '800' }}>
          {formatPaise(plan.totalPaise, { alwaysPaise: true })}
        </Text>
        <Body dim>
          {plan.payments.length} payments{plan.payeeVpa ? ` to ${plan.payeeVpa}` : ''} · none above{' '}
          {formatPaise(plan.capPaise)}
        </Body>
        <ProgressBar value={plan.payments.length === 0 ? 0 : paidCount / plan.payments.length} />
        <Body dim>
          {formatPaise(paidPaise)} of {formatPaise(plan.totalPaise)} marked paid
        </Body>
        {done ? <Pill tone="good" text="All payments done" /> : null}
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <Button title="Share list" variant="ghost" onPress={sharePlan} style={{ flex: 1 }} />
          <Button title="New split" onPress={onClearPlan} style={{ flex: 1 }} />
        </View>
      </Card>

      {plan.payments.map((payment, index) => (
        <PaymentRow
          key={payment.id}
          payment={payment}
          index={index}
          total={plan.payments.length}
          onTogglePaid={() => togglePaid(payment)}
          onPay={() => void pay(payment, index)}
          onCopy={() => void copyAmount(payment)}
          onShowQr={() => showQr(payment)}
        />
      ))}

      <QrModal
        visible={qrFor !== null}
        amountPaise={qrFor?.amountPaise ?? 0}
        caption={`${plan.label} · payment ${qrIndex + 1} of ${plan.payments.length}`}
        payload={
          qrFor && plan.payeeVpa
            ? buildUpiQrPayload({
                vpa: plan.payeeVpa,
                name: plan.payeeName || undefined,
                amountPaise: qrFor.amountPaise,
                note: noteFor(qrFor, qrIndex),
                ref: qrFor.ref,
              })
            : null
        }
        onClose={() => setQrFor(null)}
      />
    </View>
  );
}
