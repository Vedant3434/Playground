# Sub2K — split a bill into UPI payments under ₹2,000

An iOS and Android app that takes a bill and turns it into a list of UPI
payments, none of which crosses ₹2,000, then hands each one to your UPI app
with the amount already filled in.

₹5,000 becomes ₹1,999 + ₹1,999 + ₹1,002. Tap, pay, tick it off, move to the
next one.

<!-- Screenshots: run `npm run web` and grab your own, or build with EAS. -->

## Why ₹2,000

Charges on UPI are not uniform. The common case people run into is the
interchange on **prepaid-instrument (wallet) funded** UPI payments to
merchants, which applies above ₹2,000; bank-account-funded person-to-merchant
UPI is generally zero-MDR. Some merchants also add their own surcharge above
that mark. Whether a given payment attracts anything depends on how it is
funded and on the merchant's agreement with their bank.

So the app does not promise a saving. It does one narrow, verifiable thing:
**no single payment it generates crosses the ₹2,000 line.** The "you avoided
about ₹x" line is an estimate at a rate you set yourself, and it says so.

The limit is configurable, in case the threshold you care about is different.

## What it does

- **Three ways to split**
  - *Max fill* — as many ₹1,999 payments as possible, then the remainder.
  - *Even* — equal payments, so nothing sits right at the limit.
  - *Varied* — even, then nudged about, so you aren't sending three identical
    amounts in a row. Deterministic: the same bill always gives you the same
    amounts.
- **Split with people** — divide the bill first (equally, or with fixed
  amounts for some people), then break each person's share into payments under
  the limit.
- **Pay from the app** — every payment becomes a `upi://pay` deep link with the
  amount, note and its own transaction reference. Pick a preferred app (GPay,
  PhonePe, Paytm, BHIM) or let the system chooser handle it.
- **QR per payment** — for when the person paying isn't holding this phone.
- **Copy** — just the amount, for pasting into an app by hand.
- **Track progress** — tick payments off as they go through; half-finished
  splits are saved and can be picked up later.
- Dark and light themes, Indian digit grouping (₹2,00,000), no account, no
  network calls, nothing leaves the phone.

### Each payment gets its own reference

Several identical amounts to the same payee in quick succession can be treated
by a UPI app as an accidental double-tap and blocked. Every payment here
carries a distinct `tr` reference and a numbered note (`Dinner 2/3`), which
keeps them distinguishable.

## Running it

```bash
npm install
npm start          # then scan the QR with Expo Go, or press a/i
npm run android    # Android device or emulator
npm run ios        # iOS simulator (macOS only)
npm run web        # runs in a browser; deep links won't open native apps
npm test           # the split logic
npm run typecheck
```

Expo Go is enough for everything except the app-specific deep links (`tez://`,
`phonepe://`…), which need a development build:

```bash
npx eas build --profile development --platform android
```

### Shipping

```bash
npx eas build --platform android --profile production   # .aab for Play
npx eas build --platform ios --profile production       # .ipa for App Store
```

Both stores will want a privacy declaration. The honest one is short: the app
stores your splits and settings on the device and sends nothing anywhere.

### One Android caveat

Android 11+ hides other installed apps unless they are declared in the
manifest, so `Linking.canOpenURL` can report `false` for a UPI app that is
installed. The code therefore *attempts* the link rather than asking first, and
falls back to the neutral `upi://pay` chooser. If you want `canOpenURL` to work
properly, add a `<queries>` block for the UPI schemes via a config plugin
before building.

## How the splitting works

All amounts are integers in **paise** — never floats. A bill whose parts don't
add up is worse than useless, so the arithmetic is exact throughout, and every
result goes through a final check that asserts three things:

1. the parts sum to exactly the bill,
2. no part exceeds the limit,
3. no part is zero.

Rounding keeps payments to whole rupees by default; any sub-rupee remainder
rides on the last payment. A trailing dust payment (say ₹0.40) is topped up out
of an earlier one instead of being sent on its own.

Group shares use the largest-remainder method, so three people splitting ₹1
get 34p, 33p and 33p rather than losing a paisa to rounding.

## Layout

```
src/lib/money.ts     parsing, formatting, paise ↔ rupees
src/lib/split.ts     the split strategies and their guarantees
src/lib/group.ts     dividing a bill between people
src/lib/upi.ts       UPI deep links, VPA validation, per-payment references
src/lib/pay.ts       handing a payment to a UPI app
src/lib/storage.ts   settings, saved splits, recent payees (on-device)
src/components/      the UI kit and the payment row, people editor, QR sheet
src/screens/         Split, Saved, Settings
tests/               92 tests over the pure logic
```

The logic in `src/lib` has no React Native imports, which is why it can be
tested with plain Vitest and swept over thousands of amounts in under a second.

## What this app is not

It won't pay anything by itself — every payment goes through your own UPI app,
with you tapping confirm. It doesn't know what a given merchant charges. And
if a merchant's terms say not to split payments, that's between you and them.
