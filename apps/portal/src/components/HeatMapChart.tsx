'use client';

import React from 'react';
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts';

interface HeatMapData {
  x: string;
  y: string;
  z: number; // Correlation value between -1 and 1
}

const mockCorrelationData: HeatMapData[] = [
  { x: 'AAPL', y: 'AAPL', z: 1.0 },
  { x: 'AAPL', y: 'GOOG', z: 0.75 },
  { x: 'AAPL', y: 'MSFT', z: 0.65 },
  { x: 'AAPL', y: 'TSLA', z: 0.45 },
  { x: 'GOOG', y: 'AAPL', z: 0.75 },
  { x: 'GOOG', y: 'GOOG', z: 1.0 },
  { x: 'GOOG', y: 'MSFT', z: 0.80 },
  { x: 'GOOG', y: 'TSLA', z: 0.55 },
  { x: 'MSFT', y: 'AAPL', z: 0.65 },
  { x: 'MSFT', y: 'GOOG', z: 0.80 },
  { x: 'MSFT', y: 'MSFT', z: 1.0 },
  { x: 'MSFT', y: 'TSLA', z: 0.60 },
  { x: 'TSLA', y: 'AAPL', z: 0.45 },
  { x: 'TSLA', y: 'GOOG', z: 0.55 },
  { x: 'TSLA', y: 'MSFT', z: 0.60 },
  { x: 'TSLA', y: 'TSLA', z: 1.0 },
];

const assets = ['AAPL', 'GOOG', 'MSFT', 'TSLA'];

const getColor = (value: number) => {
  const hue = (1 - value) * 120; // Red (0) to Green (120) on HSL
  return `hsl(${hue}, 70%, 50%)`;
};

export function HeatMapChart() {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <ScatterChart
        margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          type="category"
          dataKey="x"
          name="Assets"
          tick={{ fontSize: 12 }}
          ticks={assets}
        />
        <YAxis
          type="category"
          dataKey="y"
          name="Assets"
          tick={{ fontSize: 12 }}
          ticks={assets}
        />
        <ZAxis type="number" range={[10, 50]} />
        <Tooltip
          formatter={(value: number, name: string, props: any) => [
            `${value.toFixed(2)}`,
            `${props.payload?.x} - ${props.payload?.y}`,
          ]}
          labelFormatter={(label: string) => `Correlation: ${label}`}
        />
        <Scatter name="Correlation" data={mockCorrelationData}>
          {mockCorrelationData.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={getColor(entry.z)}
              opacity={0.8}
            />
          ))}
        </Scatter>
      </ScatterChart>
    </ResponsiveContainer>
  );
}