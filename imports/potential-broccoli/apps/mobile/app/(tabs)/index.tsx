import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import PressScale from '@/components/PressScale';
const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';
import Gradient from '@/components/Gradient';
import { Colors } from '@/constants/Colors';
import { Link } from 'expo-router';
import { usePortfolio } from '@/src/hooks/portfolio';
import { useWatchlistStore } from '@/src/store/watchlist';
import { useMarketSocket } from '@/src/providers/MarketSocketProvider';
import { FlashList } from '@shopify/flash-list';
import QuoteRow from '@/components/markets/QuoteRow';

export default function HomeScreen() {
  const { data: overview } = usePortfolio();
  const { items } = useWatchlistStore();
  const { quotes, setSymbols } = useMarketSocket();

  React.useEffect(() => {
    setSymbols(items.map((i) => i.symbol));
  }, [items]);

  return (
    <View style={styles.container}>
      <Gradient style={styles.hero}>
        <Animated.Text entering={FadeIn.duration(500)} style={styles.heroTitle}>InvestPro</Animated.Text>
        <Animated.Text entering={FadeInUp.delay(100).duration(600)} style={styles.heroValue}>${(overview?.totalValue || 0).toLocaleString()}</Animated.Text>
        <Animated.Text entering={FadeInUp.delay(200).duration(600)} style={styles.heroSub}>Total portfolio value</Animated.Text>
        <View style={styles.quickRow}>
          <Link href="/(tabs)/trade" asChild>
            <PressScale>
              <Animated.View style={styles.quickBtn} entering={FadeInDown.delay(150).duration(400)}><Text style={styles.quickText}>Trade</Text></Animated.View>
            </PressScale>
          </Link>
          <Link href="/(tabs)/markets" asChild>
            <PressScale>
              <Animated.View style={styles.quickBtn} entering={FadeInDown.delay(200).duration(400)}><Text style={styles.quickText}>Markets</Text></Animated.View>
            </PressScale>
          </Link>
          <Link href="/(tabs)/portfolio" asChild>
            <PressScale>
              <Animated.View style={styles.quickBtn} entering={FadeInDown.delay(250).duration(400)}><Text style={styles.quickText}>Portfolio</Text></Animated.View>
            </PressScale>
          </Link>
        </View>
      </Gradient>

      <Animated.View entering={FadeInUp.delay(150).duration(500)} style={styles.card}>
        <Text style={styles.cardTitle}>Watchlist</Text>
        <FlashList
          data={items.slice(0, 6)}
          estimatedItemSize={56}
          renderItem={({ item }) => (
            <QuoteRow
              symbol={item.symbol}
              name={item.displayName}
              price={quotes[item.symbol]?.price}
              changePercent={quotes[item.symbol]?.changePercent}
            />
          )}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
        />
      </Animated.View>

      <View style={styles.rowCards}>
        <Link href="/(tabs)/ai" asChild>
          <PressScale>
            <Animated.View entering={FadeInUp.delay(200).duration(500)} style={styles.tile}><Text style={styles.tileTitle}>AI Insights</Text><Text style={styles.tileSub}>Morning briefing</Text></Animated.View>
          </PressScale>
        </Link>
        <Link href="/(tabs)/trade" asChild>
          <PressScale>
            <Animated.View entering={FadeInUp.delay(250).duration(500)} style={styles.tile}><Text style={styles.tileTitle}>Quick Trade</Text><Text style={styles.tileSub}>Slide-to-execute</Text></Animated.View>
          </PressScale>
        </Link>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  hero: { padding: 24, paddingTop: 48, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  heroTitle: { color: '#e2e8f0', fontSize: 14, fontWeight: '600' },
  heroValue: { color: '#ffffff', fontSize: 32, fontWeight: '800', marginTop: 6 },
  heroSub: { color: '#cbd5e1', marginTop: 4 },
  quickRow: { flexDirection: 'row', gap: 12, marginTop: 16 },
  quickBtn: { backgroundColor: '#0b1220aa', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 9999 },
  quickText: { color: '#e2e8f0', fontWeight: '700' },
  card: { backgroundColor: '#ffffff', margin: 16, borderRadius: 16, padding: 12 },
  cardTitle: { fontWeight: '700', fontSize: 16, marginBottom: 8 },
  sep: { height: 1, backgroundColor: '#e5e7eb' },
  rowCards: { flexDirection: 'row', gap: 12, marginHorizontal: 16 },
  tile: { flex: 1, backgroundColor: '#0b1220', padding: 16, borderRadius: 16 },
  tileTitle: { color: '#e2e8f0', fontWeight: '700' },
  tileSub: { color: '#94a3b8', marginTop: 4 },
});
