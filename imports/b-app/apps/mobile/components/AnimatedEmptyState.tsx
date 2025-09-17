import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeIn, withRepeat, withSequence, useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';

type Props = {
  title?: string;
  subtitle?: string;
};

export default function AnimatedEmptyState({ title = 'Nothing here yet', subtitle = 'Pull to refresh or come back later.' }: Props) {
  const bob = useSharedValue(0);

  React.useEffect(() => {
    bob.value = withRepeat(withSequence(withTiming(-8, { duration: 600 }), withTiming(0, { duration: 600 }), withTiming(8, { duration: 600 }), withTiming(0, { duration: 600 })), -1, true);
  }, []);

  const iconStyle = useAnimatedStyle(() => ({ transform: [{ translateY: bob.value }] }));

  return (
    <View style={styles.container}>
      <Animated.View entering={FadeIn.duration(400)} style={[styles.iconWrap, iconStyle]}>
        <Text style={styles.icon}>✨</Text>
      </Animated.View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', padding: 24 },
  iconWrap: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  icon: { fontSize: 28 },
  title: { fontWeight: '700', fontSize: 16, color: '#0f172a' },
  subtitle: { color: '#64748b', marginTop: 4, textAlign: 'center' },
});

