"use client";

import { useEffect, useState } from 'react';

type Ticker = { symbol: string; price: number; change: number };

export function TickerTape() {
  const [ticks, setTicks] = useState<Ticker[]>([
    { symbol: 'AAPL', price: 225.12, change: +1.23 },
    { symbol: 'MSFT', price: 412.45, change: -0.42 },
    { symbol: 'NVDA', price: 126.77, change: +2.87 },
    { symbol: 'TSLA', price: 198.31, change: -1.04 },
    { symbol: 'AMZN', price: 181.22, change: +0.56 },
  ]);

  useEffect(() => {
    const id = setInterval(() => {
      setTicks((prev) =>
        prev.map((t) => {
          const delta = (Math.random() - 0.5) * 0.5;
          const price = Math.max(0, Number((t.price + delta).toFixed(2)));
          const change = Number((delta / (t.price || 1)) * 100).toFixed(2);
          return { ...t, price, change: Number(change) };
        })
      );
    }, 2000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="relative overflow-hidden">
      <div className="animate-[ticker_40s_linear_infinite] flex gap-8 py-1">
        {[...ticks, ...ticks].map((t, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span className="font-mono text-muted-foreground">{t.symbol}</span>
            <span className="font-mono">{t.price.toFixed(2)}</span>
            <span className={`font-mono ${t.change >= 0 ? 'text-green-500' : 'text-red-500'}`}>{t.change >= 0 ? '+' : ''}{t.change.toFixed(2)}%</span>
          </div>
        ))}
      </div>
      <style jsx>{`
        @keyframes ticker { from { transform: translateX(0); } to { transform: translateX(-50%); } }
      `}</style>
    </div>
  );
}


