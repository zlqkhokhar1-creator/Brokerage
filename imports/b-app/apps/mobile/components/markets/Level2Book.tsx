import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';

type BookRow = { price: number; size: number; mpid?: string };

export function Level2Book({ bids = [], asks = [] }: { bids?: BookRow[]; asks?: BookRow[] }) {
  const renderRow = (item: BookRow, side: 'bid' | 'ask') => (
    <View style={styles.row}>
      <Text style={[styles.price, side === 'bid' ? styles.bid : styles.ask]}>{item.price.toFixed(2)}</Text>
      <Text style={styles.size}>{item.size}</Text>
      <Text style={styles.mpid}>{item.mpid || ''}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.col}>
        <Text style={styles.header}>Bids</Text>
        {bids.slice(0, 10).map((b, i) => (
          <React.Fragment key={`b${i}`}>{renderRow(b, 'bid')}</React.Fragment>
        ))}
      </View>
      <View style={styles.divider} />
      <View style={styles.col}>
        <Text style={styles.header}>Asks</Text>
        {asks.slice(0, 10).map((a, i) => (
          <React.Fragment key={`a${i}`}>{renderRow(a, 'ask')}</React.Fragment>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 8,
  },
  col: {
    flex: 1,
  },
  divider: {
    width: 1,
    backgroundColor: '#e5e7eb',
  },
  header: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  price: {
    fontVariant: ['tabular-nums'],
  },
  size: {
    fontVariant: ['tabular-nums'],
    color: '#475569',
  },
  mpid: {
    color: '#94a3b8',
  },
  bid: { color: '#16a34a' },
  ask: { color: '#dc2626' },
});

export default Level2Book;

