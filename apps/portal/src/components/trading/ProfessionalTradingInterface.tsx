"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from '@/components/MotionWrappers';
import { marketDataService } from '@/lib/api/market-data';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  TrendingUp, TrendingDown, Zap, Target, Brain, Clock,
  ArrowUpRight, ArrowDownRight, DollarSign, Volume2,
  BarChart3, LineChart, Activity, AlertTriangle, Info,
  Play, Pause, Square, ChevronUp, ChevronDown, Sparkles,
  Eye, EyeOff, MoreHorizontal, Filter, Search, RefreshCw
} from 'lucide-react';

// Types for trading interface
interface Quote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  bid: number;
  ask: number;
  volume: number;
  high: number;
  low: number;
  timestamp: number;
}

interface OrderBookLevel {
  price: number;
  size: number;
  orders: number;
}

interface Trade {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  price: number;
  timestamp: Date;
  status: 'filled' | 'pending' | 'cancelled';
}

interface AISignal {
  symbol: string;
  action: 'buy' | 'sell' | 'hold';
  confidence: number;
  reason: string;
  targetPrice?: number;
  stopLoss?: number;
}

// Real-time quote component
const RealTimeQuote = ({ symbol }: { symbol: string }) => {
  const [quote, setQuote] = useState<Quote | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchQuote = async () => {
      try {
        const data = await marketDataService.getStockQuote(symbol);
        setQuote({
          ...data,
          bid: data.price - 0.05,
          ask: data.price + 0.05,
        } as Quote);
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching quote:', error);
        setIsLoading(false);
      }
    };

    fetchQuote();
    const interval = setInterval(fetchQuote, 5000);
    return () => clearInterval(interval);
  }, [symbol]);

  if (isLoading || !quote) {
    return (
      <div className="flex items-center space-x-4 p-4 bg-card rounded-lg animate-pulse">
        <div className="w-16 h-6 bg-muted rounded"></div>
        <div className="w-20 h-8 bg-muted rounded"></div>
        <div className="w-16 h-6 bg-muted rounded"></div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex items-center justify-between p-4 bg-gradient-to-r from-card to-card/80 border border-border rounded-lg hover:shadow-lg transition-all"
    >
      <div className="flex items-center space-x-4">
        <div>
          <div className="font-bold text-lg">{quote.symbol}</div>
          <div className="text-xs text-muted-foreground">
            Last updated: {new Date(quote.timestamp).toLocaleTimeString()}
          </div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-mono font-bold">
            ${quote.price.toFixed(2)}
          </div>
          <div className={`flex items-center text-sm ${
            quote.change >= 0 ? 'text-green-500' : 'text-red-500'
          }`}>
            {quote.change >= 0 ? (
              <ArrowUpRight className="h-4 w-4 mr-1" />
            ) : (
              <ArrowDownRight className="h-4 w-4 mr-1" />
            )}
            {quote.changePercent.toFixed(2)}%
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div className="text-center">
          <div className="text-muted-foreground">Bid</div>
          <div className="font-mono font-bold text-red-500">${quote.bid.toFixed(2)}</div>
        </div>
        <div className="text-center">
          <div className="text-muted-foreground">Ask</div>
          <div className="font-mono font-bold text-green-500">${quote.ask.toFixed(2)}</div>
        </div>
        <div className="text-center">
          <div className="text-muted-foreground">Volume</div>
          <div className="font-mono">{(quote.volume / 1000000).toFixed(1)}M</div>
        </div>
        <div className="text-center">
          <div className="text-muted-foreground">Range</div>
          <div className="font-mono text-xs">
            ${quote.low.toFixed(2)} - ${quote.high.toFixed(2)}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// Order entry component
const OrderEntry = ({ symbol }: { symbol: string }) => {
  const [orderType, setOrderType] = useState<'market' | 'limit' | 'stop'>('limit');
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [stopPrice, setStopPrice] = useState('');

  const handleSubmitOrder = () => {
    // TODO: Implement order submission
    console.log('Submitting order:', { symbol, orderType, side, quantity, price, stopPrice });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center space-x-2 text-lg">
          <Target className="h-5 w-5 text-teal-500" />
          <span>Order Entry</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Order Type Selection */}
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

        {/* Buy/Sell Selection */}
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

        {/* Quantity Input */}
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

        {/* Price Input (for limit orders) */}
        {orderType !== 'market' && (
          <div>
            <label className="text-sm font-medium text-muted-foreground block mb-2">
              {orderType === 'limit' ? 'Limit Price' : 'Stop Price'}
            </label>
            <Input
              type="number"
              placeholder="Enter price"
              value={orderType === 'stop' ? stopPrice : price}
              onChange={(e) => orderType === 'stop' ? setStopPrice(e.target.value) : setPrice(e.target.value)}
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
          <Separator />
          <div className="flex justify-between font-medium">
            <span>Total:</span>
            <span className="font-mono">
              ${quantity && price ? (parseFloat(quantity) * parseFloat(price)).toLocaleString() : '—'}
            </span>
          </div>
        </div>

        {/* AI Recommendations */}
        <Alert>
          <Sparkles className="h-4 w-4" />
          <AlertDescription className="text-sm">
            <div className="flex items-center justify-between">
              <span>AI suggests: <strong>BUY</strong> at $150.25</span>
              <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                87% confidence
              </Badge>
            </div>
          </AlertDescription>
        </Alert>

        {/* Submit Button */}
        <Button
          onClick={handleSubmitOrder}
          size="lg"
          className="w-full"
          disabled={!quantity || (orderType !== 'market' && !price)}
        >
          Place {side.toUpperCase()} Order
        </Button>
      </CardContent>
    </Card>
  );
};

// Order book component
const OrderBook = ({ symbol }: { symbol: string }) => {
  const [bids, setBids] = useState<OrderBookLevel[]>([]);
  const [asks, setAsks] = useState<OrderBookLevel[]>([]);
  
  useEffect(() => {
    // Mock order book data
    const mockBids = Array.from({ length: 10 }, (_, i) => ({
      price: 150.00 - (i * 0.05),
      size: Math.floor(Math.random() * 1000) + 100,
      orders: Math.floor(Math.random() * 10) + 1
    }));
    
    const mockAsks = Array.from({ length: 10 }, (_, i) => ({
      price: 150.05 + (i * 0.05),
      size: Math.floor(Math.random() * 1000) + 100,
      orders: Math.floor(Math.random() * 10) + 1
    }));
    
    setBids(mockBids);
    setAsks(mockAsks);
  }, [symbol]);

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-lg">
          <div className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5 text-blue-500" />
            <span>Order Book</span>
          </div>
          <Button variant="ghost" size="sm">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="grid grid-cols-3 gap-0 text-xs font-medium text-muted-foreground border-b px-4 py-2">
          <div>Price</div>
          <div className="text-right">Size</div>
          <div className="text-right">Orders</div>
        </div>
        
        <ScrollArea className="h-80">
          {/* Asks (sells) */}
          <div className="space-y-0">
            {asks.reverse().map((ask, index) => (
              <motion.div
                key={`ask-${index}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.05 }}
                className="grid grid-cols-3 gap-0 px-4 py-1 hover:bg-red-50 dark:hover:bg-red-900/20 text-sm relative"
              >
                <div className="font-mono text-red-500">${ask.price.toFixed(2)}</div>
                <div className="text-right font-mono">{ask.size.toLocaleString()}</div>
                <div className="text-right text-muted-foreground">{ask.orders}</div>
                <div 
                  className="absolute right-0 top-0 bottom-0 bg-red-100 dark:bg-red-900/30 -z-10"
                  style={{ width: `${(ask.size / 2000) * 100}%` }}
                />
              </motion.div>
            ))}
          </div>
          
          {/* Spread */}
          <div className="px-4 py-2 bg-muted/50 text-center text-sm font-medium border-y">
            Spread: $0.05 (0.03%)
          </div>
          
          {/* Bids (buys) */}
          <div className="space-y-0">
            {bids.map((bid, index) => (
              <motion.div
                key={`bid-${index}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.05 }}
                className="grid grid-cols-3 gap-0 px-4 py-1 hover:bg-green-50 dark:hover:bg-green-900/20 text-sm relative"
              >
                <div className="font-mono text-green-500">${bid.price.toFixed(2)}</div>
                <div className="text-right font-mono">{bid.size.toLocaleString()}</div>
                <div className="text-right text-muted-foreground">{bid.orders}</div>
                <div 
                  className="absolute right-0 top-0 bottom-0 bg-green-100 dark:bg-green-900/30 -z-10"
                  style={{ width: `${(bid.size / 2000) * 100}%` }}
                />
              </motion.div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

// Main trading interface
export function ProfessionalTradingInterface() {
  const [activeSymbol, setActiveSymbol] = useState('AAPL');
  const [watchlist, setWatchlist] = useState(['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'NVDA']);

  return (
    <div className="min-h-screen bg-background p-4 lg:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Professional Trading</h1>
          <p className="text-muted-foreground">
            Bloomberg-style trading interface with AI-powered insights
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline">
            <Activity className="h-3 w-3 mr-1" />
            Live Market Data
          </Badge>
          <Badge className="bg-gradient-to-r from-purple-500 to-pink-500">
            <Brain className="h-3 w-3 mr-1" />
            AI Enhanced
          </Badge>
        </div>
      </div>

      {/* Symbol Selector */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Search className="h-4 w-4 text-muted-foreground" />
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
            <div className="flex-1">
              <RealTimeQuote symbol={activeSymbol} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Trading Interface */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left Column - Order Entry */}
        <div className="space-y-6">
          <OrderEntry symbol={activeSymbol} />
          
          {/* Quick Actions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start">
                <Zap className="h-4 w-4 mr-2" />
                Smart Order Routing
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Brain className="h-4 w-4 mr-2" />
                AI Position Sizing
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Target className="h-4 w-4 mr-2" />
                Risk Calculator
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Center Column - Order Book */}
        <OrderBook symbol={activeSymbol} />

        {/* Right Column - AI Insights & Recent Trades */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center space-x-2 text-lg">
                <Sparkles className="h-5 w-5 text-purple-500" />
                <span>AI Trading Signals</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 border rounded-lg bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-green-800 dark:text-green-200">BUY Signal</span>
                  <Badge className="bg-green-600">92% confidence</Badge>
                </div>
                <p className="text-sm text-green-700 dark:text-green-300">
                  Technical momentum + positive earnings sentiment
                </p>
                <div className="mt-2 text-xs text-green-600 dark:text-green-400">
                  Target: $155.00 | Stop: $145.00
                </div>
              </div>
              
              <div className="p-3 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">Market Regime</span>
                  <Badge variant="secondary">Bullish</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Low volatility environment favors momentum strategies
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-2 border rounded">
                  <div>
                    <div className="font-medium text-sm">AAPL BUY</div>
                    <div className="text-xs text-muted-foreground">100 shares @ $150.25</div>
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