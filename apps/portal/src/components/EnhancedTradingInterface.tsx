"use client";
import React, { useState, useEffect, useRef } from 'react';
import { motion, useAnimation, AnimatePresence } from '@/components/MotionWrappers';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Zap, 
  Target, 
  Shield, 
  Brain,
  BarChart3,
  DollarSign,
  Clock,
  AlertTriangle,
  CheckCircle,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles
} from 'lucide-react';

interface EnhancedTradingInterfaceProps {
  symbol: string;
  setSymbol: (symbol: string) => void;
  side: "buy" | "sell";
  setSide: (side: "buy" | "sell") => void;
  quantity: string;
  setQuantity: (quantity: string) => void;
  orderType: string;
  setOrderType: (orderType: string) => void;
  price: string;
  setPrice: (price: string) => void;
}

export const EnhancedTradingInterface: React.FC<EnhancedTradingInterfaceProps> = ({
  symbol,
  setSymbol,
  side,
  setSide,
  quantity,
  setQuantity,
  orderType,
  setOrderType,
  price,
  setPrice
}) => {
  const [marketData, setMarketData] = useState({
    price: 175.42,
    change: 2.34,
    changePercent: 1.35,
    volume: 45234567,
    bid: 175.40,
    ask: 175.44,
    high: 177.89,
    low: 173.21
  });

  const [orderStatus, setOrderStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [aiInsights, setAiInsights] = useState({
    sentiment: 0.75,
    momentum: 0.82,
    volatility: 0.45,
    recommendation: 'BUY'
  });

  const controls = useAnimation();
  const priceRef = useRef<HTMLDivElement>(null);

  // Simulate real-time price updates
  useEffect(() => {
    const interval = setInterval(() => {
      setMarketData(prev => ({
        ...prev,
        price: prev.price + (Math.random() - 0.5) * 0.5,
        change: prev.change + (Math.random() - 0.5) * 0.1,
        changePercent: prev.changePercent + (Math.random() - 0.5) * 0.05
      }));
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  // Animate price changes
  useEffect(() => {
    controls.start({
      scale: [1, 1.05, 1],
      transition: { duration: 0.3 }
    });
  }, [marketData.price, controls]);

  const handlePlaceOrder = async () => {
    setOrderStatus('processing');
    
    // Simulate order processing
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setOrderStatus('success');
    setTimeout(() => setOrderStatus('idle'), 3000);
  };

  const isPositive = marketData.change >= 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Market Data Card */}
      <Card className="lg:col-span-2 bg-gradient-to-br from-gray-900 to-black border-gray-800 text-white overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-pink-500/10" />
        <CardHeader className="relative z-10">
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl font-bold flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              {symbol}
            </CardTitle>
            <Badge 
              className={`${isPositive ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30'}`}
            >
              {isPositive ? <TrendingUp className="w-4 h-4 mr-1" /> : <TrendingDown className="w-4 h-4 mr-1" />}
              {isPositive ? '+' : ''}{marketData.changePercent.toFixed(2)}%
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent className="relative z-10">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <motion.div 
              ref={priceRef}
              animate={controls}
              className="text-center"
            >
              <div className="text-3xl font-bold text-white mb-1">
                ${marketData.price.toFixed(2)}
              </div>
              <div className={`text-sm ${isPositive ? 'text-green-400' : 'text-red-400'} flex items-center justify-center gap-1`}>
                {isPositive ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                {isPositive ? '+' : ''}{marketData.change.toFixed(2)}
              </div>
            </motion.div>

            <div className="text-center">
              <div className="text-lg font-semibold text-gray-300 mb-1">Volume</div>
              <div className="text-sm text-gray-400">{(marketData.volume / 1000000).toFixed(1)}M</div>
            </div>

            <div className="text-center">
              <div className="text-lg font-semibold text-gray-300 mb-1">Bid/Ask</div>
              <div className="text-sm text-gray-400">{marketData.bid.toFixed(2)} / {marketData.ask.toFixed(2)}</div>
            </div>

            <div className="text-center">
              <div className="text-lg font-semibold text-gray-300 mb-1">Range</div>
              <div className="text-sm text-gray-400">{marketData.low.toFixed(2)} - {marketData.high.toFixed(2)}</div>
            </div>
          </div>

          {/* AI Insights */}
          <div className="bg-gradient-to-r from-purple-900/30 to-pink-900/30 rounded-xl p-6 border border-purple-500/20">
            <div className="flex items-center gap-2 mb-4">
              <Brain className="w-5 h-5 text-purple-400" />
              <span className="text-lg font-semibold text-purple-300">AI Market Insights</span>
              <Sparkles className="w-4 h-4 text-purple-400" />
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-300">Sentiment</span>
                  <span className="text-sm font-semibold text-green-400">{(aiInsights.sentiment * 100).toFixed(0)}%</span>
                </div>
                <Progress value={aiInsights.sentiment * 100} className="h-2 bg-gray-700" />
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-300">Momentum</span>
                  <span className="text-sm font-semibold text-blue-400">{(aiInsights.momentum * 100).toFixed(0)}%</span>
                </div>
                <Progress value={aiInsights.momentum * 100} className="h-2 bg-gray-700" />
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-300">Volatility</span>
                  <span className="text-sm font-semibold text-orange-400">{(aiInsights.volatility * 100).toFixed(0)}%</span>
                </div>
                <Progress value={aiInsights.volatility * 100} className="h-2 bg-gray-700" />
              </div>
            </div>

            <div className="mt-4 flex items-center justify-center">
              <Badge className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-400 border-green-500/30 px-4 py-2">
                <Target className="w-4 h-4 mr-2" />
                AI Recommendation: {aiInsights.recommendation}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Order Entry Card */}
      <Card className="bg-gradient-to-br from-gray-900 to-black border-gray-800 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-cyan-500/10" />
        <CardHeader className="relative z-10">
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-blue-400" />
            Quick Order
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-6 relative z-10">
          {/* Symbol Input */}
          <div className="space-y-2">
            <Label className="text-gray-300">Symbol</Label>
            <Input
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              className="bg-gray-800 border-gray-700 text-white focus:border-blue-500"
              placeholder="AAPL"
            />
          </div>

          {/* Buy/Sell Toggle */}
          <div className="space-y-2">
            <Label className="text-gray-300">Side</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={side === 'buy' ? 'default' : 'outline'}
                onClick={() => setSide('buy')}
                className={`${side === 'buy' 
                  ? 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600' 
                  : 'border-gray-700 text-gray-300 hover:bg-gray-800'
                }`}
              >
                <TrendingUp className="w-4 h-4 mr-2" />
                Buy
              </Button>
              <Button
                variant={side === 'sell' ? 'default' : 'outline'}
                onClick={() => setSide('sell')}
                className={`${side === 'sell' 
                  ? 'bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600' 
                  : 'border-gray-700 text-gray-300 hover:bg-gray-800'
                }`}
              >
                <TrendingDown className="w-4 h-4 mr-2" />
                Sell
              </Button>
            </div>
          </div>

          {/* Quantity */}
          <div className="space-y-2">
            <Label className="text-gray-300">Quantity</Label>
            <Input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="bg-gray-800 border-gray-700 text-white focus:border-blue-500"
              placeholder="100"
            />
          </div>

          {/* Order Type */}
          <div className="space-y-2">
            <Label className="text-gray-300">Order Type</Label>
            <Select value={orderType} onValueChange={setOrderType}>
              <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                <SelectItem value="market">Market</SelectItem>
                <SelectItem value="limit">Limit</SelectItem>
                <SelectItem value="stop">Stop</SelectItem>
                <SelectItem value="stop-limit">Stop Limit</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Price (for limit orders) */}
          {(orderType === 'limit' || orderType === 'stop-limit') && (
            <div className="space-y-2">
              <Label className="text-gray-300">Price</Label>
              <Input
                type="number"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="bg-gray-800 border-gray-700 text-white focus:border-blue-500"
                placeholder="175.00"
              />
            </div>
          )}

          {/* Order Summary */}
          <div className="bg-gradient-to-r from-gray-800/50 to-gray-700/50 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-300">Estimated Total</span>
              <span className="text-white font-semibold">
                ${(parseFloat(quantity || '0') * parseFloat(price || '0')).toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-300">Commission</span>
              <span className="text-green-400 font-semibold">$0.00</span>
            </div>
          </div>

          {/* Place Order Button */}
          <AnimatePresence mode="wait">
            {orderStatus === 'idle' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <Button
                  onClick={handlePlaceOrder}
                  className={`w-full py-3 text-lg font-semibold ${
                    side === 'buy'
                      ? 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600'
                      : 'bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600'
                  }`}
                >
                  <DollarSign className="w-5 h-5 mr-2" />
                  Place {side.charAt(0).toUpperCase() + side.slice(1)} Order
                </Button>
              </motion.div>
            )}

            {orderStatus === 'processing' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <Button disabled className="w-full py-3 text-lg font-semibold bg-gray-600">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  >
                    <Clock className="w-5 h-5 mr-2" />
                  </motion.div>
                  Processing Order...
                </Button>
              </motion.div>
            )}

            {orderStatus === 'success' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <Button disabled className="w-full py-3 text-lg font-semibold bg-green-600">
                  <CheckCircle className="w-5 h-5 mr-2" />
                  Order Placed Successfully!
                </Button>
              </motion.div>
            )}

            {orderStatus === 'error' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <Button disabled className="w-full py-3 text-lg font-semibold bg-red-600">
                  <AlertTriangle className="w-5 h-5 mr-2" />
                  Order Failed
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Risk Warning */}
          <div className="bg-gradient-to-r from-orange-900/30 to-red-900/30 rounded-lg p-3 border border-orange-500/20">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-orange-400" />
              <span className="text-xs text-orange-300">
                Trading involves risk. AI recommendations are not financial advice.
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
