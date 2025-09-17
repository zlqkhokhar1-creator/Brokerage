import React, { useCallback, useState } from 'react';
import { View, StyleSheet, Text, TextInput, TouchableOpacity, ScrollView, RefreshControl } from 'react-native';
import { useNotificationsHistory, useUpdateNotificationPreferences } from '@/src/hooks/notifications';
import { useNotifications } from '@/src/providers/NotificationsProvider';
import AnimatedEmptyState from '@/components/AnimatedEmptyState';

export default function AlertsScreen() {
  const { data, refetch } = useNotificationsHistory(50, 0, 'PRICE_ALERT', 'high');
  const { createPriceAlert } = useNotifications();
  const { mutateAsync: updatePrefs } = useUpdateNotificationPreferences();
  const [symbol, setSymbol] = useState('AAPL');
  const [target, setTarget] = useState('150');
  const [condition, setCondition] = useState<'above' | 'below'>('above');
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  const onCreate = async () => {
    await createPriceAlert({ symbol, condition, targetPrice: parseFloat(target), options: { priority: 'high' } });
  };

  return (
    <ScrollView contentContainerStyle={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <Text style={styles.title}>Price Alerts</Text>
      <View style={styles.row}>
        <TextInput placeholder="Symbol" style={styles.input} value={symbol} onChangeText={(t) => setSymbol(t.toUpperCase())} />
        <TextInput placeholder="Target" style={styles.input} value={target} onChangeText={setTarget} keyboardType="decimal-pad" />
      </View>
      <View style={styles.row}>
        <TouchableOpacity style={[styles.pill, condition === 'above' && styles.pillActive]} onPress={() => setCondition('above')}><Text style={[styles.pillText, condition === 'above' && styles.pillTextActive]}>Above</Text></TouchableOpacity>
        <TouchableOpacity style={[styles.pill, condition === 'below' && styles.pillActive]} onPress={() => setCondition('below')}><Text style={[styles.pillText, condition === 'below' && styles.pillTextActive]}>Below</Text></TouchableOpacity>
        <TouchableOpacity style={styles.create} onPress={onCreate}><Text style={styles.createText}>Create</Text></TouchableOpacity>
      </View>
      <Text style={styles.subtitle}>Recent Alerts</Text>
      {(!data || data.length === 0) && (
        <AnimatedEmptyState title="No alerts" subtitle="Create a price alert to get started." />
      )}
      {(data || []).map((n: any, idx: number) => (
        <View key={idx} style={styles.alertRow}>
          <Text style={styles.alertTitle}>{n.title || n.type}</Text>
          <Text style={styles.alertBody}>{n.message || n.details?.message}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12 },
  title: { fontWeight: '800', fontSize: 20 },
  subtitle: { fontWeight: '700', fontSize: 16, marginTop: 8 },
  row: { flexDirection: 'row', gap: 8 },
  input: { flex: 1, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 12 },
  pill: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 9999, borderWidth: 1, borderColor: '#cbd5e1' },
  pillActive: { backgroundColor: '#0b1220' },
  pillText: { color: '#334155' },
  pillTextActive: { color: '#ffffff' },
  create: { marginLeft: 'auto', backgroundColor: '#2563eb', paddingHorizontal: 16, borderRadius: 9999, justifyContent: 'center' },
  createText: { color: '#fff', fontWeight: '700' },
  alertRow: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  alertTitle: { fontWeight: '700', color: '#0f172a' },
  alertBody: { color: '#475569' },
});

