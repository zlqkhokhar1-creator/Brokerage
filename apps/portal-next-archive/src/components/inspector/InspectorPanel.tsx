"use client";

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const watchlist = [
  { symbol: 'AAPL', price: 225.12, change: +1.2 },
  { symbol: 'MSFT', price: 412.45, change: -0.4 },
  { symbol: 'NVDA', price: 126.77, change: +2.8 },
  { symbol: 'TSLA', price: 198.31, change: -1.0 },
];

const news = [
  { title: 'Fed signals hold; tech leads gains', time: '5m ago' },
  { title: 'Earnings preview: Mega-cap week ahead', time: '38m ago' },
  { title: 'Oil slips as supply concerns ease', time: '1h ago' },
];

export function InspectorPanel() {
  return (
    <div className="space-y-4">
      <Card className="elevated-card">
        <CardHeader className="pb-2"><CardTitle>Watchlist</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {watchlist.map((w) => (
            <div key={w.symbol} className="flex items-center justify-between text-sm">
              <div className="font-mono">{w.symbol}</div>
              <div className="font-mono">{w.price.toFixed(2)}</div>
              <div className={`font-mono ${w.change >= 0 ? 'text-success' : 'text-destructive'}`}>{w.change >= 0 ? '+' : ''}{w.change.toFixed(1)}%</div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="elevated-card">
        <CardHeader className="pb-2"><CardTitle>News</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {news.map((n, i) => (
            <div key={i} className="text-sm">
              <div className="font-medium leading-snug">{n.title}</div>
              <div className="text-muted-foreground text-xs">{n.time}</div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}


