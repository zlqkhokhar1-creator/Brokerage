"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function SimpleTrading() {
  const [orderType, setOrderType] = useState<'market' | 'limit' | 'stop'>('limit');
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [activeSymbol, setActiveSymbol] = useState('AAPL');

  const watchlist = ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'NVDA'];

  return (
    <div className="min-h-screen bg-background p-4 lg:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Professional Trading</h1>
          <p className="text-muted-foreground">
            Execute trades with real-time market data
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline">📊 Live Data</Badge>
          <Badge className="bg-gradient-to-r from-purple-500 to-pink-500">🤖 AI Enhanced</Badge>
        </div>
      </div>

      {/* Symbol Selector */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <span>🔍</span>
              <Select value={activeSymbol} onValueChange={setActiveSymbol}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {watchlist.map((symbol) => (
                    <SelectItem key={symbol} value={symbol}>
                      {symbol}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 p-4 bg-gradient-to-r from-card to-card/80 border rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-lg">{activeSymbol}</div>
                  <div className="text-xs text-muted-foreground">Last updated: {new Date().toLocaleTimeString()}</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-mono font-bold">$175.25</div>
                  <div className="flex items-center text-sm text-green-500">
                    ↗️ +1.24%
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="text-center">
                    <div className="text-muted-foreground">Bid</div>
                    <div className="font-mono font-bold text-red-500">$175.20</div>
                  </div>
                  <div className="text-center">
                    <div className="text-muted-foreground">Ask</div>
                    <div className="font-mono font-bold text-green-500">$175.30</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Trading Interface */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Order Entry */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <span>🎯 Order Entry</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Order Type */}
              <div className="grid grid-cols-3 gap-2">
                {(['market', 'limit', 'stop'] as const).map((type) => (
                  <Button
                    key={type}
                    variant={orderType === type ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setOrderType(type)}
                    className="capitalize"
                  >
                    {type}
                  </Button>
                ))}
              </div>

              {/* Buy/Sell */}
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={side === 'buy' ? 'default' : 'outline'}
                  size="lg"
                  onClick={() => setSide('buy')}
                  className="bg-green-600 hover:bg-green-700 text-white border-green-600"
                >
                  BUY
                </Button>
                <Button
                  variant={side === 'sell' ? 'default' : 'outline'}
                  size="lg"
                  onClick={() => setSide('sell')}
                  className="bg-red-600 hover:bg-red-700 text-white border-red-600"
                >
                  SELL
                </Button>
              </div>

              {/* Quantity */}
              <div>
                <label className="text-sm font-medium text-muted-foreground block mb-2">
                  Quantity
                </label>
                <Input
                  type="number"
                  placeholder="Enter quantity"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="font-mono"
                />
              </div>

              {/* Price */}
              {orderType !== 'market' && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground block mb-2">
                    {orderType === 'limit' ? 'Limit Price' : 'Stop Price'}
                  </label>
                  <Input
                    type="number"
                    placeholder="Enter price"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="font-mono"
                  />
                </div>
              )}

              {/* Order Summary */}
              <div className="p-3 bg-muted/30 rounded-lg space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Order Value:</span>
                  <span className="font-mono">
                    ${quantity && price ? (parseFloat(quantity) * parseFloat(price)).toLocaleString() : '—'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Commission:</span>
                  <span className="font-mono">$0.00</span>
                </div>
              </div>

              {/* AI Recommendation */}
              <Alert>
                <div>✨</div>
                <AlertDescription>
                  <div className="flex items-center justify-between">
                    <span>AI suggests: <strong>BUY</strong> at $175.25</span>
                    <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                      87% confidence
                    </Badge>
                  </div>
                </AlertDescription>
              </Alert>

              {/* Submit */}
              <Button
                size="lg"
                className="w-full"
                disabled={!quantity || (orderType !== 'market' && !price)}
              >
                Place {side.toUpperCase()} Order
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Order Book */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>📊 Order Book</span>
              <Button variant="ghost" size="sm">🔄</Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="grid grid-cols-3 gap-0 text-xs font-medium text-muted-foreground border-b px-4 py-2">
              <div>Price</div>
              <div className="text-right">Size</div>
              <div className="text-right">Orders</div>
            </div>
            
            {/* Asks */}
            <div className="space-y-0">
              {Array.from({ length: 5 }, (_, i) => (
                <div key={`ask-${i}`} className="grid grid-cols-3 gap-0 px-4 py-1 hover:bg-red-50 dark:hover:bg-red-900/20 text-sm">
                  <div className="font-mono text-red-500">${(175.30 + i * 0.05).toFixed(2)}</div>
                  <div className="text-right font-mono">{(Math.random() * 1000 + 100).toFixed(0)}</div>
                  <div className="text-right text-muted-foreground">{Math.floor(Math.random() * 10) + 1}</div>
                </div>
              ))}
            </div>
            
            <div className="px-4 py-2 bg-muted/50 text-center text-sm font-medium border-y">
              Spread: $0.10 (0.06%)
            </div>
            
            {/* Bids */}
            <div className="space-y-0">
              {Array.from({ length: 5 }, (_, i) => (
                <div key={`bid-${i}`} className="grid grid-cols-3 gap-0 px-4 py-1 hover:bg-green-50 dark:hover:bg-green-900/20 text-sm">
                  <div className="font-mono text-green-500">${(175.20 - i * 0.05).toFixed(2)}</div>
                  <div className="text-right font-mono">{(Math.random() * 1000 + 100).toFixed(0)}</div>
                  <div className="text-right text-muted-foreground">{Math.floor(Math.random() * 10) + 1}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* AI Insights & Activity */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>✨ AI Trading Signals</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 border rounded-lg bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-green-800 dark:text-green-200">📈 BUY Signal</span>
                  <Badge className="bg-green-600">92% confidence</Badge>
                </div>
                <p className="text-sm text-green-700 dark:text-green-300">
                  Technical momentum + positive earnings sentiment
                </p>
                <div className="mt-2 text-xs text-green-600 dark:text-green-400">
                  Target: $180.00 | Stop: $170.00
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>📈 Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-2 border rounded">
                  <div>
                    <div className="font-medium text-sm">AAPL BUY</div>
                    <div className="text-xs text-muted-foreground">100 shares @ $175.25</div>
                  </div>
                  <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                    Filled
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-2 border rounded">
                  <div>
                    <div className="font-medium text-sm">TSLA SELL</div>
                    <div className="text-xs text-muted-foreground">50 shares @ $245.80</div>
                  </div>
                  <Badge variant="secondary">Pending</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}