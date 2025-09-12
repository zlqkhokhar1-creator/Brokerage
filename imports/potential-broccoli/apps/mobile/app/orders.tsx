import React, { useCallback, useState } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, RefreshControl, ScrollView } from 'react-native';
import { useOrderHistory, useCancelOrder } from '@/src/hooks/trading';
import AnimatedEmptyState from '@/components/AnimatedEmptyState';

export default function OrdersScreen() {
  const { data, refetch } = useOrderHistory(50, 0);
  const { mutateAsync: cancel } = useCancelOrder();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <Text style={styles.title}>Orders</Text>
      {(!data || data.length === 0) && (
        <AnimatedEmptyState title="No orders yet" subtitle="Place an order to see it here." />
      )}
      {(data || []).map((o: any) => (
        <View key={o.orderId} style={styles.row}>
          <View style={styles.left}>
            <Text style={styles.sym}>{o.symbol}</Text>
            <Text style={styles.sub}>{o.side} • {o.quantity} @ {o.price || 'MKT'}</Text>
          </View>
          <View style={styles.right}>
            <Text style={[styles.status, statusStyle(o.status)]}>{o.status}</Text>
            {['PENDING','PENDING_EXECUTION','NEW'].includes(o.status) && (
              <TouchableOpacity style={styles.btn} onPress={() => cancel(o.orderId)}>
                <Text style={styles.btnText}>Cancel</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

function statusStyle(status: string) {
  if (status?.includes('FILLED')) return { color: '#16a34a' };
  if (status?.includes('CANCEL')) return { color: '#64748b' };
  if (status?.includes('REJECT')) return { color: '#dc2626' };
  return { color: '#2563eb' };
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12 },
  title: { fontWeight: '800', fontSize: 20 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  left: {},
  right: { alignItems: 'flex-end', gap: 6 },
  sym: { fontWeight: '800', color: '#0f172a' },
  sub: { color: '#64748b' },
  status: { fontWeight: '700' },
  btn: { backgroundColor: '#0b1220', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  btnText: { color: '#fff', fontWeight: '700' },
});

