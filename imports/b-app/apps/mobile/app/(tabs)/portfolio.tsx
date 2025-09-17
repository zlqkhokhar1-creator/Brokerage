import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { usePortfolio, usePositions, usePerformance } from '@/src/hooks/portfolio';
import { VictoryArea, VictoryAxis, VictoryChart, VictoryClipContainer } from 'victory-native';
import { Colors } from '@/constants/Colors';

export default function PortfolioScreen() {
  const { data: overview } = usePortfolio();
  const { data: positions } = usePositions();
  const { data: perf } = usePerformance('1y');

  const perfData = (perf?.history || []).map((p: any) => ({ x: new Date(p.timestamp), y: p.value }));

  return (
    <View style={styles.container}>
      <View style={styles.headerCard}>
        <Text style={styles.value}>${(overview?.totalValue || 0).toLocaleString()}</Text>
        <Text style={styles.sub}>Buying Power: ${(overview?.buyingPower || 0).toLocaleString()}</Text>
      </View>
      {perfData.length > 0 && (
        <View style={styles.chartCard}>
          <VictoryChart padding={{ top: 8, left: 40, right: 16, bottom: 24 }}>
            <VictoryAxis dependentAxis tickFormat={(t) => `$${(t/1000).toFixed(0)}k`} style={{ tickLabels: { fontSize: 10 } }} />
            <VictoryAxis tickFormat={(t) => `${new Date(t).getMonth()+1}/${new Date(t).getFullYear()%100}`} style={{ tickLabels: { fontSize: 10 } }} />
            <VictoryArea
              data={perfData}
              interpolation="monotoneX"
              style={{ data: { fill: Colors.light.primary + '33', stroke: Colors.light.primary, strokeWidth: 2 } }}
              groupComponent={<VictoryClipContainer clipPadding={{ top: 5, right: 10 }} />}
            />
          </VictoryChart>
        </View>
      )}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Positions</Text>
        {(positions || []).slice(0, 10).map((pos: any) => (
          <View key={pos.symbol} style={styles.row}>
            <Text style={styles.sym}>{pos.symbol}</Text>
            <Text style={styles.right}>Qty {pos.quantity} • PnL {pos.unrealizedPnLPercent?.toFixed(2)}%</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 16 },
  header: { fontSize: 12, color: '#64748b' },
  headerCard: { backgroundColor: '#0b1220', padding: 20, borderRadius: 16 },
  value: { color: '#e2e8f0', fontSize: 28, fontWeight: '800' },
  sub: { color: '#94a3b8', marginTop: 4 },
  chartCard: { backgroundColor: '#ffffff', borderRadius: 16, padding: 8 },
  section: { backgroundColor: '#ffffff', borderRadius: 16, padding: 16, gap: 8 },
  sectionTitle: { fontWeight: '700', fontSize: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  sym: { fontWeight: '700', color: '#0f172a' },
  right: { color: '#475569' },
});

