import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, { useSharedValue, withTiming, useAnimatedStyle, runOnJS } from 'react-native-reanimated';
import { Colors } from '@/constants/Colors';

type Props = {
  symbol: string;
  name?: string;
  price?: number;
  changePercent?: number;
  onPress?: () => void;
};

export function QuoteRow({ symbol, name, price, changePercent, onPress }: Props) {
  const changeColor = changePercent === undefined ? '#64748b' : changePercent >= 0 ? Colors.light.success : Colors.light.error;
  const formattedChange = changePercent === undefined ? '--' : `${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(2)}%`;
  const [flashColor, setFlashColor] = useState<string | null>(null);
  const prevPrice = useRef<number | undefined>(price);
  const highlight = useSharedValue(0);

  useEffect(() => {
    if (prevPrice.current !== undefined && price !== undefined && price !== prevPrice.current) {
      const isUp = price > prevPrice.current;
      setFlashColor(isUp ? 'rgba(22, 163, 74, 0.15)' : 'rgba(220, 38, 38, 0.15)');
      highlight.value = 1;
      highlight.value = withTiming(0, { duration: 600 }, () => {
        runOnJS(setFlashColor)(null);
      });
    }
    prevPrice.current = price;
  }, [price]);

  const rowStyle = useAnimatedStyle(() => ({
    backgroundColor: highlight.value > 0 ? (flashColor as any) : 'transparent',
  }));

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <Animated.View style={[styles.row, rowStyle]}>
        <View style={styles.left}>
          <Text style={styles.symbol}>{symbol}</Text>
          {name ? <Text style={styles.name}>{name}</Text> : null}
        </View>
        <View style={styles.right}>
          <Text style={styles.price}>{price ? price.toFixed(2) : '--'}</Text>
          <Text style={[styles.change, { color: changeColor }]}>{formattedChange}</Text>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  left: {
    gap: 2,
  },
  right: {
    alignItems: 'flex-end',
  },
  symbol: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  name: {
    fontSize: 12,
    color: '#64748b',
  },
  price: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  change: {
    fontSize: 12,
  },
});

export default QuoteRow;

