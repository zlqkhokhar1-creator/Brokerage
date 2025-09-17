import React, { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, Text, RefreshControl, ScrollView } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { QuoteRow } from '@/components/markets/QuoteRow';
import { useWatchlistStore } from '@/src/store/watchlist';
import { useMarketSocket } from '@/src/providers/MarketSocketProvider';
import * as Haptics from 'expo-haptics';
import AnimatedEmptyState from '@/components/AnimatedEmptyState';

export default function MarketsScreen() {
  const { items } = useWatchlistStore();
  const { quotes, setSymbols, isConnected } = useMarketSocket();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    setSymbols(items.map((i) => i.symbol));
  }, [items]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setSymbols(items.map((i) => i.symbol));
      await new Promise((r) => setTimeout(r, 600));
    } finally {
      setRefreshing(false);
    }
  }, [items]);

  return (
    <View style={styles.container}>
      {!isConnected && <Text style={styles.banner}>Connecting to market stream…</Text>}
      {items.length === 0 ? (
        <AnimatedEmptyState title="No symbols yet" subtitle="Add some symbols to your watchlist." />
      ) : (
        <FlashList
          data={items}
          estimatedItemSize={64}
          renderItem={({ item }) => (
            <QuoteRow
              symbol={item.symbol}
              name={item.displayName}
              price={quotes[item.symbol]?.price}
              changePercent={quotes[item.symbol]?.changePercent}
            />
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  separator: { height: 1, backgroundColor: '#e5e7eb' },
  banner: { textAlign: 'center', color: '#64748b', marginBottom: 8 },
});

