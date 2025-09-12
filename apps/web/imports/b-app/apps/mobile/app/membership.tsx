import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useCurrentMembership, useTiers, useUsage } from '@/src/hooks/membership';

export default function MembershipScreen() {
  const { data: membership } = useCurrentMembership();
  const { data: tiers } = useTiers();
  const { data: usage } = useUsage();

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Membership</Text>
      {membership && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Current Plan</Text>
          <Text style={styles.plan}>{membership.tier_display_name}</Text>
          <Text style={styles.meta}>Renews: {new Date(membership.expires_at).toDateString()}</Text>
        </View>
      )}
      {usage && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Usage</Text>
          {Object.keys(usage.usage || {}).map((k) => (
            <View key={k} style={styles.usageRow}>
              <Text style={styles.usageKey}>{k.replace('_',' ')}</Text>
              <Text style={styles.usageVal}>{usage.usage[k].current}/{usage.usage[k].limit === -1 ? '∞' : usage.usage[k].limit}</Text>
            </View>
          ))}
        </View>
      )}
      <Text style={styles.subtitle}>Plans</Text>
      {(tiers || []).map((t: any) => (
        <View key={t.id} style={styles.planRow}>
          <View>
            <Text style={styles.planName}>{t.display_name}</Text>
            <Text style={styles.planDesc}>{t.description}</Text>
          </View>
          <TouchableOpacity style={styles.cta}><Text style={styles.ctaText}>Choose</Text></TouchableOpacity>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12 },
  title: { fontWeight: '800', fontSize: 20 },
  subtitle: { fontWeight: '700', fontSize: 16, marginTop: 8 },
  card: { backgroundColor: '#ffffff', borderRadius: 16, padding: 16, gap: 6 },
  cardTitle: { fontWeight: '700' },
  plan: { fontWeight: '800', fontSize: 18 },
  meta: { color: '#64748b' },
  usageRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  usageKey: { color: '#334155' },
  usageVal: { color: '#0f172a', fontWeight: '700' },
  planRow: { backgroundColor: '#0b1220', borderRadius: 16, padding: 16, gap: 4, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  planName: { color: '#e2e8f0', fontWeight: '700' },
  planDesc: { color: '#94a3b8' },
  cta: { backgroundColor: '#2563eb', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 9999 },
  ctaText: { color: '#fff', fontWeight: '700' },
});

