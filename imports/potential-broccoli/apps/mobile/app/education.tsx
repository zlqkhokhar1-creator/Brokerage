import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity, ScrollView } from 'react-native';
import { getApi } from '@/src/lib/api';

export default function EducationScreen() {
  const [tutorials, setTutorials] = React.useState<any[]>([]);
  const [webinars, setWebinars] = React.useState<any[]>([]);

  React.useEffect(() => {
    (async () => {
      const api = await getApi();
      const t = await api.get('/advanced/education/tutorials');
      const w = await api.get('/advanced/education/webinars', { params: { upcoming: true } });
      setTutorials(t.data.data || []);
      setWebinars(w.data.data || []);
    })();
  }, []);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Education</Text>
      <Text style={styles.subtitle}>Interactive Tutorials</Text>
      {tutorials.map((it) => (
        <View key={it.id} style={styles.row}>
          <View>
            <Text style={styles.rowTitle}>{it.title}</Text>
            <Text style={styles.rowSub}>{it.level} • {it.duration}</Text>
          </View>
          <TouchableOpacity style={styles.cta}><Text style={styles.ctaText}>Start</Text></TouchableOpacity>
        </View>
      ))}
      <Text style={styles.subtitle}>Webinars</Text>
      {webinars.map((wb) => (
        <View key={wb.id} style={styles.row}>
          <View>
            <Text style={styles.rowTitle}>{wb.title}</Text>
            <Text style={styles.rowSub}>{new Date(wb.date).toLocaleString()}</Text>
          </View>
          <TouchableOpacity style={styles.cta}><Text style={styles.ctaText}>Register</Text></TouchableOpacity>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12 },
  title: { fontWeight: '800', fontSize: 20 },
  subtitle: { fontWeight: '700', fontSize: 16, marginTop: 8 },
  row: { backgroundColor: '#ffffff', borderRadius: 16, padding: 16, gap: 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowTitle: { fontWeight: '700', color: '#0f172a' },
  rowSub: { color: '#64748b' },
  cta: { backgroundColor: '#2563eb', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 9999 },
  ctaText: { color: '#fff', fontWeight: '700' },
});

