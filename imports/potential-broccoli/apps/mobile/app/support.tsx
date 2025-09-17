import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';

export default function SupportScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Support</Text>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>FAQ</Text>
        <Text style={styles.item}>• How to place an order?</Text>
        <Text style={styles.item}>• How to upgrade membership?</Text>
        <Text style={styles.item}>• How to enable 2FA?</Text>
      </View>
      <TouchableOpacity style={styles.cta}><Text style={styles.ctaText}>Contact Support</Text></TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12 },
  title: { fontWeight: '800', fontSize: 20 },
  card: { backgroundColor: '#ffffff', borderRadius: 16, padding: 16, gap: 6 },
  cardTitle: { fontWeight: '700' },
  item: { color: '#475569' },
  cta: { backgroundColor: '#2563eb', padding: 14, borderRadius: 8, alignItems: 'center' },
  ctaText: { color: '#fff', fontWeight: '700' },
});

