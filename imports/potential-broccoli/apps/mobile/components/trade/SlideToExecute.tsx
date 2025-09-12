import React, { useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Animated, { useAnimatedGestureHandler, useAnimatedStyle, useSharedValue, withSpring, runOnJS } from 'react-native-reanimated';
import { PanGestureHandler } from 'react-native-gesture-handler';
import { Colors } from '@/constants/Colors';
import * as Haptics from 'expo-haptics';

type Props = {
  onConfirm: () => Promise<void> | void;
  label?: string;
};

const { width } = Dimensions.get('window');
const SLIDER_WIDTH = Math.min(width - 32, 420);
const KNOB_SIZE = 54;

export function SlideToExecute({ onConfirm, label = 'Slide to Execute' }: Props) {
  const [confirmed, setConfirmed] = useState(false);
  const translateX = useSharedValue(0);
  const maxX = SLIDER_WIDTH - KNOB_SIZE - 4;

  const onConfirmJS = useRef(async () => {
    try {
      await onConfirm();
      setConfirmed(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (_err) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      translateX.value = withSpring(0);
    }
  }).current;

  const gestureHandler = useAnimatedGestureHandler({
    onStart: () => {},
    onActive: (event) => {
      translateX.value = Math.max(0, Math.min(maxX, event.translationX));
    },
    onEnd: () => {
      if (translateX.value > maxX * 0.92) {
        translateX.value = withSpring(maxX);
        runOnJS(onConfirmJS)();
      } else {
        translateX.value = withSpring(0);
      }
    },
  });

  const knobStyle = useAnimatedStyle(() => ({ transform: [{ translateX: translateX.value }] }));
  const fillStyle = useAnimatedStyle(() => ({ width: translateX.value + KNOB_SIZE }));

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.fill, fillStyle]} />
      <Text style={styles.label}>{confirmed ? 'Executed' : label}</Text>
      <PanGestureHandler onGestureEvent={gestureHandler}>
        <Animated.View style={[styles.knob, knobStyle]}>
          <Text style={styles.knobText}>{'›'}</Text>
        </Animated.View>
      </PanGestureHandler>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: SLIDER_WIDTH,
    height: KNOB_SIZE + 8,
    borderRadius: KNOB_SIZE,
    backgroundColor: '#111827',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: Colors.light.primary,
  },
  label: {
    position: 'absolute',
    alignSelf: 'center',
    color: '#e5e7eb',
    fontWeight: '600',
  },
  knob: {
    width: KNOB_SIZE,
    height: KNOB_SIZE,
    borderRadius: KNOB_SIZE / 2,
    backgroundColor: '#ffffff',
    margin: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  knobText: {
    fontSize: 32,
    color: '#111827',
  },
});

export default SlideToExecute;

