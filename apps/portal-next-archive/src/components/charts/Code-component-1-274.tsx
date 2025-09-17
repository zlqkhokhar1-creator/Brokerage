"use client";
import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  ComposedChart
} from 'recharts';
import { 
  Maximize2, 
  TrendingUp,
  TrendingDown,
  Volume2,
  BarChart3,
  LineChart as LineChartIcon,
  CandlestickChart
} from 'lucide-react';
import { ChartData } from './AdvancedChart';

interface MobileChartProps {
  data: ChartData[];
  symbol: string;
  currentPrice: number;
  change: number;
  onFullScreen?: () => void;
}

type ChartType = 'line' | 'candlestick' | 'bar';
type Timeframe = '1D' | '1W' | '1M' | '3M' | '1Y';

export function MobileChart({ data, symbol, currentPrice, change, onFullScreen }: MobileChartProps) {
  const [chartType, setChartType] = useState<ChartType>('line');
  const [timeframe, setTimeframe] = useState<Timeframe>('1M');
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [touchEnd, setTouchEnd] = useState<{ x: number; y: number } | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);

  // Handle touch gestures
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
    });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
    });
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const deltaX = touchStart.x - touchEnd.x;
    const deltaY = touchStart.y - touchEnd.y;
    const minSwipeDistance = 50;

    // Detect swipe gestures
    if (Math.abs(deltaX) > minSwipeDistance && Math.abs(deltaY) < 100) {
      if (deltaX > 0) {
        // Swipe left - next timeframe
        const timeframes: Timeframe[] = ['1D', '1W', '1M', '3M', '1Y'];
        const currentIndex = timeframes.indexOf(timeframe);
        if (currentIndex < timeframes.length - 1) {
          setTimeframe(timeframes[currentIndex + 1]);
        }
      } else {
        // Swipe right - previous timeframe
        const timeframes: Timeframe[] = ['1D', '1W', '1M', '3M', '1Y'];
        const currentIndex = timeframes.indexOf(timeframe);
        if (currentIndex > 0) {
          setTimeframe(timeframes[currentIndex - 1]);
        }
      }
    }

    setTouchStart(null);
    setTouchEnd(null);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  const formatVolume = (volume: number) => {
    if (volume >= 1000000000) {
      return `${(volume / 1000000000).toFixed(1)}B`;
    } else if (volume >= 1000000) {
      return `${(volume / 1000000).toFixed(1)}M`;
    }
    return `${(volume / 1000).toFixed(0)}K`;
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;

    const data = payload[0].payload;
    
    return (
      <div className="bg-card border border-border rounded-lg p-2 shadow-lg text-xs">
        <p className="text-muted-foreground mb-1">{label}</p>
        <div className="space-y-1">
          {chartType === 'candlestick' && (
            <>
              <div className="flex justify-between gap-2">
                <span>O:</span>
                <span className="font-medium">${data.open.toFixed(2)}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span>H:</span>
                <span className="font-medium">${data.high.toFixed(2)}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span>L:</span>
                <span className="font-medium">${data.low.toFixed(2)}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span>C:</span>
                <span className="font-medium">${data.close.toFixed(2)}</span>
              </div>
            </>
          )}
          {chartType !== 'candlestick' && (
            <div className="flex justify-between gap-2">
              <span>Price:</span>
              <span className="font-medium">${data.close.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between gap-2">
            <span>Vol:</span>
            <span className="font-medium">{formatVolume(data.volume)}</span>
          </div>
        </div>
      </div>
    );
  };

  const renderChart = () => {
    const chartData = data;

    switch (chartType) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
              <XAxis 
                dataKey="date" 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: '#9ca3af' }}
                interval="preserveStartEnd"
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: '#9ca3af' }}
                tickFormatter={(value) => `$${value}`}
                width={45}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="close" fill="#3b82f6" radius={[1, 1, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        );

      default: // line and candlestick fallback to line for mobile
        return (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="2 2" stroke="#374151" opacity={0.3} />
              <XAxis 
                dataKey="date" 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: '#9ca3af' }}
                interval="preserveStartEnd"
              />
              <YAxis 
                domain={['dataMin - 5', 'dataMax + 5']}
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: '#9ca3af' }}
                tickFormatter={(value) => `$${value}`}
                width={45}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line 
                type="monotone" 
                dataKey="close" 
                stroke={change >= 0 ? "#22c55e" : "#ef4444"}
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        );
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm">{symbol}</span>
            <Badge 
              variant={change >= 0 ? "default" : "destructive"} 
              className="text-xs px-2 py-0"
            >
              {change >= 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
              {formatCurrency(currentPrice)}
            </Badge>
          </div>
          
          {onFullScreen && (
            <Button variant="outline" size="sm" onClick={onFullScreen} className="px-2">
              <Maximize2 className="h-3 w-3" />
            </Button>
          )}
        </div>

        {/* Mobile Controls */}
        <div className="flex items-center justify-between mt-2">
          {/* Chart Type */}
          <div className="flex gap-1 bg-muted p-0.5 rounded">
            <Button
              variant={chartType === 'line' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setChartType('line')}
              className="px-1.5 h-6 text-xs"
            >
              <LineChartIcon className="h-3 w-3" />
            </Button>
            <Button
              variant={chartType === 'bar' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setChartType('bar')}
              className="px-1.5 h-6 text-xs"
            >
              <BarChart3 className="h-3 w-3" />
            </Button>
          </div>

          {/* Timeframe */}
          <div className="flex gap-1">
            {(['1D', '1W', '1M', '3M', '1Y'] as Timeframe[]).map((tf) => (
              <Button
                key={tf}
                variant={timeframe === tf ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTimeframe(tf)}
                className="px-1.5 h-6 text-xs"
              >
                {tf}
              </Button>
            ))}
          </div>
        </div>

        {/* Swipe indicator */}
        <div className="text-xs text-muted-foreground text-center mt-1">
          Swipe left/right to change timeframe
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div 
          ref={chartRef}
          className="h-64 select-none"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {renderChart()}
        </div>
        
        {/* Mini Volume Chart */}
        <div className="h-12 mt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 0, right: 5, left: 5, bottom: 0 }}>
              <Tooltip
                formatter={(value) => [formatVolume(value as number), 'Volume']}
                labelFormatter={() => ''}
                contentStyle={{ fontSize: '10px' }}
              />
              <Bar dataKey="volume" fill="#6b7280" opacity={0.6} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-2 mt-3 text-xs">
          <div className="text-center">
            <div className="text-muted-foreground">High</div>
            <div className="font-semibold text-green-600">
              {formatCurrency(Math.max(...data.map(d => d.high)))}
            </div>
          </div>
          <div className="text-center">
            <div className="text-muted-foreground">Low</div>
            <div className="font-semibold text-red-600">
              {formatCurrency(Math.min(...data.map(d => d.low)))}
            </div>
          </div>
          <div className="text-center">
            <div className="text-muted-foreground">Volume</div>
            <div className="font-semibold">
              {formatVolume(data[data.length - 1]?.volume || 0)}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}