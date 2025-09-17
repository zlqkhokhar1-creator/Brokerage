import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming } from 'react-native-reanimated';

export default function Shimmer({ style }: { style?: ViewStyle | ViewStyle[] }) {
  const progress = useSharedValue(0);
  React.useEffect(() => {
    progress.value = withRepeat(withTiming(1, { duration: 1200 }), -1, true);
  }, []);
  const aStyle = useAnimatedStyle(() => ({ opacity: 0.6 + 0.4 * progress.value }));
  return <Animated.View style={[styles.base, aStyle, style]} />;
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: '#e5e7eb',
    borderRadius: 8,
  },
});

