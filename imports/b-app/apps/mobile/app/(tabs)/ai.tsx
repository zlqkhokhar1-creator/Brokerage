import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { useMorningBriefing, usePersonalizedNews, useWeeklyInsights } from '@/src/hooks/ai';

export default function AIScreen() {
  const { data: briefing } = useMorningBriefing();
  const { data: insights } = useWeeklyInsights();
  const { data: news } = usePersonalizedNews(10);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>AI Morning Briefing</Text>
      <Text style={styles.block}>{JSON.stringify(briefing?.data || {}, null, 2)}</Text>
      <Text style={styles.title}>Weekly Insights</Text>
      <Text style={styles.block}>{JSON.stringify(insights?.data || {}, null, 2)}</Text>
      <Text style={styles.title}>Personalized News</Text>
      <Text style={styles.block}>{JSON.stringify(news?.data || {}, null, 2)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12 },
  title: { fontWeight: '700', fontSize: 16 },
  block: { fontFamily: 'monospace', fontSize: 12, color: '#334155' },
});

