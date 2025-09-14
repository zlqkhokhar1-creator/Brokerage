"use client";

import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';

export function InteractiveLineChart({
  data,
  height = 240,
  color = '#00E6B8',
}: {
  data: Array<{ name: string; value: number }>;
  height?: number;
  color?: string;
}) {
  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.6} />
              <stop offset="95%" stopColor={color} stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <XAxis dataKey="name" stroke="var(--color-muted-foreground)" tickLine={false} axisLine={false} />
          <YAxis stroke="var(--color-muted-foreground)" tickLine={false} axisLine={false} />
          <Tooltip contentStyle={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 8 }} />
          <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2} fill="url(#chartFill)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}


