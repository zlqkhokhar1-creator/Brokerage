'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, BarChart3, Volume2, Activity } from 'lucide-react';

interface AdvancedTradingChartProps {
  symbol: string;
  height?: number;
}

interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export function AdvancedTradingChart({ symbol, height = 400 }: AdvancedTradingChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const [candleData, setCandleData] = useState<CandleData[]>([]);
  const [timeframe, setTimeframe] = useState('1D');
  const [indicators, setIndicators] = useState({
    sma: true,
    ema: false,
    rsi: true,
    macd: false,
    bollinger: false
  });
  const [isLoading, setIsLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  // Generate mock candlestick data - client side only
  useEffect(() => {
    setMounted(true);

    // Only generate data on client side to prevent hydration mismatch
    if (!mounted) return;

    const generateMockData = () => {
      const data: CandleData[] = [];
      const basePrice = 175.43;
      let currentPrice = basePrice;

      for (let i = 0; i < 100; i++) {
        const change = (Math.random() - 0.5) * 2;
        const open = currentPrice;
        const close = currentPrice + change;
        const high = Math.max(open, close) + Math.random() * 0.5;
        const low = Math.min(open, close) - Math.random() * 0.5;
        const volume = Math.floor(Math.random() * 1000000) + 100000;

        data.push({
          time: Date.now() - (100 - i) * 60000, // 1 minute intervals
          open,
          high,
          low,
          close,
          volume
        });

        currentPrice = close;
      }

      setCandleData(data);
      setIsLoading(false);
    };

    generateMockData();
  }, [symbol, mounted]);

  // Show loading state until mounted
  if (!mounted || isLoading) {
    return (
      <Card className="card-professional">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Advanced Chart - {symbol}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center" style={{ height }}>
            <div className="animate-pulse text-muted-foreground">Loading chart...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const calculateSMA = (data: CandleData[], period: number) => {
    const sma: number[] = [];
    for (let i = period - 1; i < data.length; i++) {
      const sum = data.slice(i - period + 1, i + 1).reduce((acc, candle) => acc + candle.close, 0);
      sma.push(sum / period);
    }
    return sma;
  };

  const calculateRSI = (data: CandleData[], period: number = 14) => {
    const rsi: number[] = [];
    const gains: number[] = [];
    const losses: number[] = [];
    
    for (let i = 1; i < data.length; i++) {
      const change = data[i].close - data[i - 1].close;
      gains.push(change > 0 ? change : 0);
      losses.push(change < 0 ? Math.abs(change) : 0);
    }
    
    for (let i = period - 1; i < gains.length; i++) {
      const avgGain = gains.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period;
      const avgLoss = losses.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period;
      const rs = avgGain / avgLoss;
      const rsiValue = 100 - (100 / (1 + rs));
      rsi.push(rsiValue);
    }
    
    return rsi;
  };

  const sma20 = calculateSMA(candleData, 20);
  const rsi = calculateRSI(candleData);

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Advanced Trading Chart
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-96">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            {symbol} - Advanced Chart
          </CardTitle>
          <div className="flex items-center gap-2">
            {['1D', '5D', '1M', '3M', '1Y'].map((tf) => (
              <Button
                key={tf}
                variant={timeframe === tf ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTimeframe(tf)}
              >
                {tf}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Chart Container */}
          <div 
            ref={chartRef}
            className="relative bg-muted/50 rounded-lg border"
            style={{ height: `${height}px` }}
          >
            <div className="absolute inset-0 p-4">
              <div className="h-full flex flex-col">
                {/* Price Chart */}
                <div className="flex-1 relative">
                  <svg className="w-full h-full" viewBox="0 0 800 300">
                    {/* Grid lines */}
                    <defs>
                      <pattern id="grid" width="40" height="30" patternUnits="userSpaceOnUse">
                        <path d="M 40 0 L 0 0 0 30" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.1"/>
                      </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#grid)" />
                    
                    {/* Candlesticks */}
                    {candleData.map((candle, index) => {
                      const x = (index / candleData.length) * 800;
                      const y = 300 - ((candle.close - 170) / 20) * 300;
                      const isGreen = candle.close > candle.open;
                      
                      return (
                        <g key={index}>
                          {/* High-Low line */}
                          <line
                            x1={x}
                            y1={300 - ((candle.high - 170) / 20) * 300}
                            x2={x}
                            y2={300 - ((candle.low - 170) / 20) * 300}
                            stroke={isGreen ? '#10b981' : '#ef4444'}
                            strokeWidth="1"
                          />
                          {/* Body */}
                          <rect
                            x={x - 2}
                            y={300 - ((Math.max(candle.open, candle.close) - 170) / 20) * 300}
                            width="4"
                            height={Math.abs(candle.close - candle.open) * 15}
                            fill={isGreen ? '#10b981' : '#ef4444'}
                          />
                        </g>
                      );
                    })}
                    
                    {/* SMA Line */}
                    {indicators.sma && sma20.map((value, index) => {
                      const x = ((index + 19) / candleData.length) * 800;
                      const y = 300 - ((value - 170) / 20) * 300;
                      return (
                        <circle
                          key={index}
                          cx={x}
                          cy={y}
                          r="1"
                          fill="#3b82f6"
                        />
                      );
                    })}
                  </svg>
                </div>
                
                {/* Volume Chart */}
                <div className="h-16 mt-2">
                  <svg className="w-full h-full" viewBox="0 0 800 60">
                    {candleData.map((candle, index) => {
                      const x = (index / candleData.length) * 800;
                      const height = (candle.volume / 1000000) * 60;
                      const isGreen = candle.close > candle.open;
                      
                      return (
                        <rect
                          key={index}
                          x={x - 1}
                          y={60 - height}
                          width="2"
                          height={height}
                          fill={isGreen ? '#10b981' : '#ef4444'}
                          opacity="0.6"
                        />
                      );
                    })}
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Technical Indicators */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center p-3 border rounded">
              <div className="text-xs text-muted-foreground">Price</div>
              <div className="text-lg font-bold">${candleData[candleData.length - 1]?.close.toFixed(2)}</div>
              <div className="text-xs text-green-500">+3.45%</div>
            </div>
            <div className="text-center p-3 border rounded">
              <div className="text-xs text-muted-foreground">SMA (20)</div>
              <div className="text-lg font-bold">{sma20[sma20.length - 1]?.toFixed(2)}</div>
              <div className="text-xs text-green-500">Bullish</div>
            </div>
            <div className="text-center p-3 border rounded">
              <div className="text-xs text-muted-foreground">RSI (14)</div>
              <div className="text-lg font-bold">{rsi[rsi.length - 1]?.toFixed(1)}</div>
              <div className="text-xs text-orange-500">Neutral</div>
            </div>
            <div className="text-center p-3 border rounded">
              <div className="text-xs text-muted-foreground">Volume</div>
              <div className="text-lg font-bold">45.2M</div>
              <div className="text-xs text-blue-500">High</div>
            </div>
            <div className="text-center p-3 border rounded">
              <div className="text-xs text-muted-foreground">MACD</div>
              <div className="text-lg font-bold">+1.23</div>
              <div className="text-xs text-green-500">Buy Signal</div>
            </div>
          </div>

          {/* Indicator Toggles */}
          <div className="flex flex-wrap gap-2">
            <span className="text-sm font-medium">Indicators:</span>
            {Object.entries(indicators).map(([key, enabled]) => (
              <Button
                key={key}
                variant={enabled ? 'default' : 'outline'}
                size="sm"
                onClick={() => setIndicators(prev => ({ ...prev, [key]: !enabled }))}
              >
                {key.toUpperCase()}
              </Button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
