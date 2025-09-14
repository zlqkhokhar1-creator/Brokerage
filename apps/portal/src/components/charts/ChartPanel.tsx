"use client";

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { InteractiveLineChart } from '@/components/charts/InteractiveLineChart';

const sample = Array.from({ length: 60 }).map((_, i) => ({ name: `${i}`, value: 100 + Math.sin(i / 6) * 8 + Math.random() * 2 }));

export function ChartPanel() {
  return (
    <Card className="elevated-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Portfolio Value</CardTitle>
        <div className="flex gap-1">
          <button className="px-2 py-1 text-xs rounded border border-border hover:bg-accent/20">1D</button>
          <button className="px-2 py-1 text-xs rounded border border-border hover:bg-accent/20">1W</button>
          <button className="px-2 py-1 text-xs rounded border border-border bg-accent/20">1M</button>
          <button className="px-2 py-1 text-xs rounded border border-border hover:bg-accent/20">1Y</button>
        </div>
      </CardHeader>
      <CardContent>
        <InteractiveLineChart data={sample} height={300} />
      </CardContent>
    </Card>
  );
}


