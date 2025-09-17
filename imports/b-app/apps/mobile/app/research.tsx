import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { getApi } from '@/src/lib/api';

export default function ResearchScreen() {
  const [workspaces, setWorkspaces] = React.useState<any[]>([]);

  React.useEffect(() => {
    (async () => {
      const api = await getApi();
      const ws = await api.get('/advanced/social-collaboration/research-workspaces');
      setWorkspaces(ws.data.data || []);
    })();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Research Workspaces</Text>
      {workspaces.map((w) => (
        <View key={w.id} style={styles.row}>
          <View>
            <Text style={styles.rowTitle}>{w.name}</Text>
            <Text style={styles.rowSub}>{w.documents?.length || 0} documents</Text>
          </View>
          <TouchableOpacity style={styles.cta}><Text style={styles.ctaText}>Open</Text></TouchableOpacity>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12 },
  title: { fontWeight: '800', fontSize: 20 },
  row: { backgroundColor: '#ffffff', borderRadius: 16, padding: 16, gap: 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowTitle: { fontWeight: '700', color: '#0f172a' },
  rowSub: { color: '#64748b' },
  cta: { backgroundColor: '#2563eb', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 9999 },
  ctaText: { color: '#fff', fontWeight: '700' },
});

