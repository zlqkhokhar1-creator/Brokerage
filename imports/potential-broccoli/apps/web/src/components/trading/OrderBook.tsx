"use client";

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type Level = { price: number; size: number; orders: number };

export default function OrderBook({
  bids = [
    { price: 175.41, size: 1200, orders: 12 },
    { price: 175.40, size: 980, orders: 9 },
    { price: 175.39, size: 1640, orders: 15 },
    { price: 175.38, size: 450, orders: 5 },
    { price: 175.37, size: 760, orders: 7 },
  ],
  asks = [
    { price: 175.42, size: 900, orders: 10 },
    { price: 175.43, size: 1100, orders: 11 },
    { price: 175.44, size: 750, orders: 8 },
    { price: 175.45, size: 1320, orders: 13 },
    { price: 175.46, size: 500, orders: 6 },
  ],
}: { bids?: Level[]; asks?: Level[] }) {
  const maxSize = useMemo(() => {
    return Math.max(
      ...bids.map(b => b.size),
      ...asks.map(a => a.size)
    );
  }, [bids, asks]);

  const format = (n: number) => new Intl.NumberFormat('en-US').format(n);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Order Book (Level II)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 text-sm">
          {/* Bids */}
          <div>
            <div className="flex items-center justify-between mb-2 text-muted-foreground">
              <span>Bid</span>
              <span>Size</span>
            </div>
            <div className="space-y-1">
              {bids.map((level, idx) => (
                <div key={`bid-${idx}`} className="relative overflow-hidden rounded-md">
                  <motion.div
                    className="absolute inset-y-0 right-0 bg-green-500/15"
                    initial={{ width: 0 }}
                    animate={{ width: `${(level.size / maxSize) * 100}%` }}
                    transition={{ duration: 0.2 }}
                    aria-hidden
                  />
                  <div className="relative z-10 grid grid-cols-2 px-2 py-1">
                    <span className="font-medium text-green-600">{level.price.toFixed(2)}</span>
                    <span className="text-right">{format(level.size)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Asks */}
          <div>
            <div className="flex items-center justify-between mb-2 text-muted-foreground">
              <span>Ask</span>
              <span>Size</span>
            </div>
            <div className="space-y-1">
              {asks.map((level, idx) => (
                <div key={`ask-${idx}`} className="relative overflow-hidden rounded-md">
                  <motion.div
                    className="absolute inset-y-0 left-0 bg-red-500/15"
                    initial={{ width: 0 }}
                    animate={{ width: `${(level.size / maxSize) * 100}%` }}
                    transition={{ duration: 0.2 }}
                    aria-hidden
                  />
                  <div className="relative z-10 grid grid-cols-2 px-2 py-1">
                    <span className="font-medium text-red-600">{level.price.toFixed(2)}</span>
                    <span className="text-right">{format(level.size)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

