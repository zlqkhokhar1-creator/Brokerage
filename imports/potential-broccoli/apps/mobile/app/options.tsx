import React, { useState } from 'react';
import { View, StyleSheet, Text, TextInput } from 'react-native';
import { useOptionsChain } from '@/src/hooks/market';

export default function OptionsScreen() {
  const [symbol, setSymbol] = useState('AAPL');
  const [expiration, setExpiration] = useState('2025-12-19');
  const { data } = useOptionsChain(symbol, expiration);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Options</Text>
      <View style={styles.row}>
        <TextInput style={styles.input} value={symbol} onChangeText={(t) => setSymbol(t.toUpperCase())} />
        <TextInput style={styles.input} value={expiration} onChangeText={setExpiration} />
      </View>
      {(data || []).slice(0, 20).map((c: any, i: number) => (
        <View key={i} style={styles.rowItem}>
          <Text style={styles.sym}>{c.type.toUpperCase()} {c.strike}</Text>
          <Text style={styles.greeks}>Δ {c.delta} Γ {c.gamma} Θ {c.theta} ν {c.vega}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12 },
  title: { fontWeight: '800', fontSize: 20 },
  row: { flexDirection: 'row', gap: 8 },
  input: { flex: 1, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 12 },
  rowItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  sym: { fontWeight: '700', color: '#0f172a' },
  greeks: { color: '#475569' },
});

