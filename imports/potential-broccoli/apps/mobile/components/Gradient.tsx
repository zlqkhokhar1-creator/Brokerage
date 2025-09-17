import React from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { ViewStyle } from 'react-native';

type Props = {
  style?: ViewStyle | ViewStyle[];
  children?: React.ReactNode;
  colors?: string[];
  start?: { x: number; y: number };
  end?: { x: number; y: number };
};

export function Gradient({ style, children, colors = ['#0EA5E9', '#2563EB', '#7C3AED'], start = { x: 0, y: 0 }, end = { x: 1, y: 1 } }: Props) {
  return (
    <LinearGradient style={style as any} colors={colors} start={start} end={end}>
      {children}
    </LinearGradient>
  );
}

export default Gradient;

