'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Activity } from 'lucide-react';

interface OrderBookProps {
  symbol: string;
}

interface OrderBookEntry {
  price: number;
  size: number;
  orders: number;
}

interface OrderBookData {
  bids: OrderBookEntry[];
  asks: OrderBookEntry[];
  spread: number;
  lastPrice: number;
}

export function OrderBook({ symbol }: OrderBookProps) {
  const [orderBookData, setOrderBookData] = useState<OrderBookData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    // Only generate data on client side to prevent hydration mismatch
    if (!mounted) return;

    const generateMockOrderBook = () => {
      const lastPrice = 175.43;
      const spread = 0.01;

      const bids: OrderBookEntry[] = [];
      const asks: OrderBookEntry[] = [];

      // Generate bid orders (below last price)
      for (let i = 0; i < 10; i++) {
        const price = lastPrice - (i + 1) * 0.01;
        const size = Math.floor(Math.random() * 10000) + 1000;
        const orders = Math.floor(Math.random() * 20) + 1;

        bids.push({ price, size, orders });
      }

      // Generate ask orders (above last price)
      for (let i = 0; i < 10; i++) {
        const price = lastPrice + (i + 1) * 0.01;
        const size = Math.floor(Math.random() * 10000) + 1000;
        const orders = Math.floor(Math.random() * 20) + 1;

        asks.push({ price, size, orders });
      }

      setOrderBookData({
        bids: bids.sort((a, b) => b.price - a.price),
        asks: asks.sort((a, b) => a.price - b.price),
        spread,
        lastPrice
      });
      setIsLoading(false);
    };

    generateMockOrderBook();

    // Update every 2 seconds
    const interval = setInterval(generateMockOrderBook, 2000);
    return () => clearInterval(interval);
  }, [symbol, mounted]);

  // Show loading state until mounted
  if (!mounted || isLoading) {
    return (
      <Card className="card-professional">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Order Book - {symbol}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="animate-pulse text-muted-foreground">Loading order book...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Order Book
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!orderBookData) return null;

  const maxSize = Math.max(
    ...orderBookData.bids.map(b => b.size),
    ...orderBookData.asks.map(a => a.size)
  );

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Order Book - {symbol}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Spread Information */}
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div className="text-center">
              <div className="text-sm text-muted-foreground">Spread</div>
              <div className="text-lg font-bold">${orderBookData.spread.toFixed(2)}</div>
            </div>
            <div className="text-center">
              <div className="text-sm text-muted-foreground">Last Price</div>
              <div className="text-lg font-bold">${orderBookData.lastPrice.toFixed(2)}</div>
            </div>
          </div>

          {/* Order Book Table */}
          <div className="space-y-2">
            {/* Header */}
            <div className="grid grid-cols-4 gap-4 text-xs font-medium text-muted-foreground border-b pb-2">
              <div className="text-right">Price</div>
              <div className="text-right">Size</div>
              <div className="text-right">Orders</div>
              <div className="text-right">Total</div>
            </div>

            {/* Asks (Sell Orders) */}
            <div className="space-y-1">
              {orderBookData.asks.map((ask, index) => {
                const total = orderBookData.asks.slice(0, index + 1).reduce((sum, a) => sum + a.size, 0);
                const barWidth = (ask.size / maxSize) * 100;
                
                return (
                  <div key={index} className="grid grid-cols-4 gap-4 text-sm hover:bg-muted/50 rounded px-2 py-1">
                    <div className="text-right text-red-500 font-mono">${ask.price.toFixed(2)}</div>
                    <div className="text-right font-mono">{ask.size.toLocaleString()}</div>
                    <div className="text-right text-muted-foreground">{ask.orders}</div>
                    <div className="text-right text-muted-foreground">{total.toLocaleString()}</div>
                    <div 
                      className="absolute right-0 top-0 h-full bg-red-500/10 rounded"
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                );
              })}
            </div>

            {/* Spread Line */}
            <div className="border-t border-dashed border-muted-foreground/30 my-2"></div>

            {/* Bids (Buy Orders) */}
            <div className="space-y-1">
              {orderBookData.bids.map((bid, index) => {
                const total = orderBookData.bids.slice(0, index + 1).reduce((sum, b) => sum + b.size, 0);
                const barWidth = (bid.size / maxSize) * 100;
                
                return (
                  <div key={index} className="grid grid-cols-4 gap-4 text-sm hover:bg-muted/50 rounded px-2 py-1">
                    <div className="text-right text-green-500 font-mono">${bid.price.toFixed(2)}</div>
                    <div className="text-right font-mono">{bid.size.toLocaleString()}</div>
                    <div className="text-right text-muted-foreground">{bid.orders}</div>
                    <div className="text-right text-muted-foreground">{total.toLocaleString()}</div>
                    <div 
                      className="absolute right-0 top-0 h-full bg-green-500/10 rounded"
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Market Depth Visualization */}
          <div className="mt-4">
            <div className="text-sm font-medium mb-2">Market Depth</div>
            <div className="h-20 bg-muted/50 rounded-lg relative overflow-hidden">
              <div className="absolute inset-0 flex">
                {/* Ask side (red) */}
                <div className="flex-1 flex items-end">
                  {orderBookData.asks.map((ask, index) => {
                    const height = (ask.size / maxSize) * 100;
                    return (
                      <div
                        key={index}
                        className="bg-red-500/20 border-r border-red-500/40"
                        style={{ height: `${height}%`, width: `${100 / orderBookData.asks.length}%` }}
                      />
                    );
                  })}
                </div>
                {/* Bid side (green) */}
                <div className="flex-1 flex items-end">
                  {orderBookData.bids.map((bid, index) => {
                    const height = (bid.size / maxSize) * 100;
                    return (
                      <div
                        key={index}
                        className="bg-green-500/20 border-l border-green-500/40"
                        style={{ height: `${height}%`, width: `${100 / orderBookData.bids.length}%` }}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
