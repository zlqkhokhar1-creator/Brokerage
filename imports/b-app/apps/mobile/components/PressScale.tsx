import React from 'react';
import { TouchableOpacity, TouchableOpacityProps } from 'react-native';
import Animated, { useSharedValue, withTiming, useAnimatedStyle } from 'react-native-reanimated';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export default function PressScale({ children, style, ...rest }: TouchableOpacityProps) {
  const scale = useSharedValue(1);
  const aStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <AnimatedTouchable
      style={[style, aStyle]}
      activeOpacity={0.8}
      onPressIn={(e) => {
        scale.value = withTiming(0.98, { duration: 80 });
        rest.onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.value = withTiming(1, { duration: 120 });
        rest.onPressOut?.(e);
      }}
      {...rest}
    >
      {children}
    </AnimatedTouchable>
  );
}

