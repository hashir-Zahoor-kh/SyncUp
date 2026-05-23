import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface Props {
  password: string;
}

interface StrengthResult {
  score: number;
  label: string;
  color: string;
}

function getStrength(password: string): StrengthResult {
  if (password.length === 0) return { score: 0, label: '', color: '#EEE' };
  let score = 0;
  if (password.length >= 10) score++;
  if (password.length >= 14) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  if (score <= 1) return { score, label: 'Weak', color: '#FF6B6B' };
  if (score <= 2) return { score, label: 'Fair', color: '#FFB347' };
  if (score <= 3) return { score, label: 'Good', color: '#43BF8E' };
  return { score, label: 'Strong', color: '#6C63FF' };
}

export function PasswordStrengthMeter({ password }: Props): React.JSX.Element | null {
  if (password.length === 0) return null;
  const { score, label, color } = getStrength(password);

  return (
    <View style={styles.container} accessibilityLabel={`Password strength: ${label}`}>
      <View style={styles.bars}>
        {[1, 2, 3, 4].map((i) => (
          <View key={i} style={[styles.bar, { backgroundColor: i <= score ? color : '#EEE' }]} />
        ))}
      </View>
      {label ? <Text style={[styles.label, { color }]}>{label}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', marginTop: 6, marginBottom: 4 },
  bars: { flexDirection: 'row', gap: 4, flex: 1 },
  bar: { flex: 1, height: 4, borderRadius: 2 },
  label: { marginLeft: 8, fontSize: 12, fontWeight: '600', minWidth: 44 },
});
