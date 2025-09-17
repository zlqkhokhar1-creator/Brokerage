import React, { useMemo, useState } from 'react';
import { View, StyleSheet, TextInput, Text } from 'react-native';
import { Button, SegmentedButtons } from 'react-native-paper';
import SlideToExecute from '@/components/trade/SlideToExecute';
import { useSlidePrepare, useSlideExecute, OrderInput } from '@/src/hooks/trading';
import { FeatureGate } from '@/src/components/FeatureGate';

export default function TradeScreen() {
  const [symbol, setSymbol] = useState('AAPL');
  const [side, setSide] = useState<'BUY' | 'SELL'>('BUY');
  const [qty, setQty] = useState('100');
  const [price, setPrice] = useState('');
  const [orderType, setOrderType] = useState<'MARKET' | 'LIMIT'>('MARKET');

  const { mutateAsync: prepare } = useSlidePrepare();
  const { mutateAsync: execute } = useSlideExecute();

  const onConfirm = async () => {
    const order: OrderInput = {
      symbol: symbol.toUpperCase(),
      side,
      quantity: parseInt(qty || '0'),
      orderType,
      ...(orderType === 'LIMIT' ? { price: parseFloat(price) } : {}),
    };
    const prep = await prepare({ orderData: order, options: { biometricRequired: false } });
    await execute({ slideToken: prep.slideToken, slideData: { distance: 1, duration: 1, velocity: 1, path: [], velocityPoints: [], startTime: Date.now(), endTime: Date.now() } });
  };

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text style={styles.label}>Symbol</Text>
        <TextInput style={styles.input} value={symbol} onChangeText={(t) => setSymbol(t.toUpperCase())} />
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Side</Text>
        <SegmentedButtons
          value={side}
          onValueChange={(v) => setSide(v as 'BUY' | 'SELL')}
          buttons={[{ value: 'BUY', label: 'Buy' }, { value: 'SELL', label: 'Sell' }]}
        />
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Qty</Text>
        <TextInput style={styles.input} value={qty} onChangeText={setQty} keyboardType="numeric" />
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Type</Text>
        <SegmentedButtons
          value={orderType}
          onValueChange={(v) => setOrderType(v as 'MARKET' | 'LIMIT')}
          buttons={[{ value: 'MARKET', label: 'Market' }, { value: 'LIMIT', label: 'Limit' }]}
        />
      </View>
      {orderType === 'LIMIT' && (
        <View style={styles.row}>
          <Text style={styles.label}>Price</Text>
          <TextInput style={styles.input} value={price} onChangeText={setPrice} keyboardType="decimal-pad" />
        </View>
      )}

      <FeatureGate feature="advanced_orders">
        <View style={styles.sliderWrap}>
          <SlideToExecute onConfirm={onConfirm} />
        </View>
      </FeatureGate>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 16 },
  row: { gap: 8 },
  label: { fontWeight: '600', color: '#0f172a' },
  input: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 12 },
  sliderWrap: { alignItems: 'center', marginTop: 24 },
});

