import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { makePerson, Person } from '../lib/group';
import { parseAmount, toUpiAmount } from '../lib/money';
import { radius, spacing, useTheme } from '../theme';
import { Body } from './ui';

/**
 * Who is chipping in. Leave someone's amount blank and they take an equal
 * share of whatever is left after the fixed amounts.
 */
export function PeopleEditor({ people, onChange }: { people: Person[]; onChange: (people: Person[]) => void }) {
  const theme = useTheme();

  function update(id: string, patch: Partial<Person>) {
    onChange(people.map((person) => (person.id === id ? { ...person, ...patch } : person)));
  }

  return (
    <View style={{ gap: spacing.sm }}>
      {people.map((person, index) => (
        <View key={person.id} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          {/* The inputs are wrapped so they shrink with the row instead of
              holding on to their intrinsic text-field width. */}
          <View style={{ flex: 2, minWidth: 0 }}>
            <TextInput
              value={person.name}
              onChangeText={(name) => update(person.id, { name })}
              placeholder={`Person ${index + 1}`}
              placeholderTextColor={theme.textDim}
              style={[styles.input, { backgroundColor: theme.surfaceAlt, borderColor: theme.border, color: theme.text }]}
            />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <TextInput
              value={person.fixedPaise === null ? '' : toUpiAmount(person.fixedPaise)}
              onChangeText={(text) => {
                const trimmed = text.trim();
                update(person.id, { fixedPaise: trimmed === '' ? null : parseAmount(trimmed) });
              }}
              placeholder="equal"
              placeholderTextColor={theme.textDim}
              keyboardType="decimal-pad"
              style={[styles.input, { backgroundColor: theme.surfaceAlt, borderColor: theme.border, color: theme.text, textAlign: 'right' }]}
            />
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Remove ${person.name || `person ${index + 1}`}`}
            hitSlop={8}
            disabled={people.length <= 1}
            onPress={() => onChange(people.filter((p) => p.id !== person.id))}>
            <Text style={{ color: people.length <= 1 ? theme.border : theme.danger, fontSize: 20, fontWeight: '700' }}>×</Text>
          </Pressable>
        </View>
      ))}

      <Pressable
        accessibilityRole="button"
        onPress={() => onChange([...people, makePerson(`Person ${people.length + 1}`)])}
        style={{ paddingVertical: spacing.sm }}>
        <Body style={{ color: theme.accent, fontWeight: '700' }}>+ Add someone</Body>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    width: '100%',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    fontSize: 15,
  },
});
