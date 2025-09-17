'use client';

import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, ReferenceLine } from 'recharts';
import { generateEnhancedChartData } from '@/lib/chartData';
import { getTradingStatusColor } from '@/lib/colors';

interface PerformanceChartProps {
  currentPrice?: number;
  days?: number;
  height?: number;
}

export function PerformanceChart({ currentPrice = 100, days = 90, height = 400 }: PerformanceChartProps) {
  const data = generateEnhancedChartData(currentPrice, days);

  const lineColor = getTradingStatusColor(data[data.length - 1].close > data[0].close ? 'bullish' : 'bearish');

  return (
    <div className="w-full h-[400px] bg-card rounded-lg shadow-sm border">
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis 
            dataKey="date" 
            stroke="hsl(var(--muted-foreground))" 
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis 
            stroke="hsl(var(--muted-foreground))" 
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value: number) => `$${value.toFixed(2)}`}
          />
          <Tooltip 
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: 'var(--radius)',
            }}
            formatter={(value: number) => [`$${value.toFixed(2)}`, 'Price']}
          />
          <Legend />
          <ReferenceLine y={currentPrice} label="Current Price" stroke="hsl(var(--accent))" strokeDasharray="3 3" />
          <Line type="monotone" dataKey="close" stroke={lineColor} strokeWidth={2} dot={false} name="Close Price" />
          <Area type="monotone" dataKey="close" stackId="1" stroke={lineColor} fill={lineColor + '20'} fillOpacity={0.2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}