import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
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
  ComposedChart,
  Area,
  AreaChart
} from 'recharts';
import { 
  Maximize2, 
  Settings,
  TrendingUp,
  TrendingDown,
  Volume2,
  BarChart3,
  LineChart as LineChartIcon,
  CandlestickChart
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';

export interface ChartData {
  date: string;
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  rsi?: number;
  macd?: number;
  signal?: number;
  histogram?: number;
  bb_upper?: number;
  bb_middle?: number;
  bb_lower?: number;
}

interface AdvancedChartProps {
  data: ChartData[];
  symbol: string;
  currentPrice: number;
  onFullScreen?: () => void;
}

type ChartType = 'line' | 'candlestick' | 'bar';
type Timeframe = '1D' | '1W' | '1M' | '3M' | '1Y' | '5Y';

interface TechnicalIndicator {
  id: string;
  name: string;
  enabled: boolean;
  color: string;
}

export function AdvancedChart({ data, symbol, currentPrice, onFullScreen }: AdvancedChartProps) {
  const [chartType, setChartType] = useState<ChartType>('line');
  const [timeframe, setTimeframe] = useState<Timeframe>('1M');
  const [indicators, setIndicators] = useState<TechnicalIndicator[]>([
    { id: 'rsi', name: 'RSI', enabled: false, color: '#8884d8' },
    { id: 'macd', name: 'MACD', enabled: false, color: '#82ca9d' },
    { id: 'bb', name: 'Bollinger Bands', enabled: false, color: '#ffc658' },
  ]);

  const toggleIndicator = (id: string) => {
    setIndicators(prev => prev.map(ind => 
      ind.id === id ? { ...ind, enabled: !ind.enabled } : ind
    ));
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

  // Custom Candlestick Component
  const CandlestickBar = (props: any) => {
    const { payload, x, y, width, height } = props;
    if (!payload) return null;

    const { open, high, low, close } = payload;
    const isPositive = close >= open;
    const color = isPositive ? '#22c55e' : '#ef4444';
    const bodyHeight = Math.abs(close - open);
    const bodyY = Math.min(open, close);

    return (
      <g>
        {/* Wick */}
        <line
          x1={x + width / 2}
          y1={y + (high - Math.max(open, close)) * height / (high - low)}
          x2={x + width / 2}
          y2={y + (high - Math.min(open, close)) * height / (high - low)}
          stroke={color}
          strokeWidth={1}
        />
        <line
          x1={x + width / 2}
          y1={y + (high - Math.max(open, close)) * height / (high - low)}
          x2={x + width / 2}
          y2={y + (high - Math.min(open, close)) * height / (high - low)}
          stroke={color}
          strokeWidth={1}
        />
        {/* Body */}
        <rect
          x={x + width * 0.25}
          y={y + (high - Math.max(open, close)) * height / (high - low)}
          width={width * 0.5}
          height={bodyHeight * height / (high - low)}
          fill={isPositive ? color : color}
          stroke={color}
        />
      </g>
    );
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;

    const data = payload[0].payload;
    
    return (
      <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
        <p className="text-sm text-muted-foreground mb-2">{label}</p>
        {chartType === 'candlestick' && (
          <div className="space-y-1 text-sm">
            <div className="flex justify-between gap-4">
              <span>Open:</span>
              <span className="font-medium">{formatCurrency(data.open)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span>High:</span>
              <span className="font-medium">{formatCurrency(data.high)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span>Low:</span>
              <span className="font-medium">{formatCurrency(data.low)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span>Close:</span>
              <span className="font-medium">{formatCurrency(data.close)}</span>
            </div>
          </div>
        )}
        {chartType === 'line' && (
          <div className="text-sm">
            <span>Price: </span>
            <span className="font-medium">{formatCurrency(data.close)}</span>
          </div>
        )}
        <div className="text-sm mt-2">
          <span>Volume: </span>
          <span className="font-medium">{formatVolume(data.volume)}</span>
        </div>
      </div>
    );
  };

  const renderChart = () => {
    const chartData = data;

    switch (chartType) {
      case 'candlestick':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
              <XAxis 
                dataKey="date" 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: '#9ca3af' }}
              />
              <YAxis 
                domain={['dataMin - 5', 'dataMax + 5']}
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: '#9ca3af' }}
                tickFormatter={(value) => `$${value}`}
              />
              <Tooltip content={<CustomTooltip />} />
              
              {/* Bollinger Bands */}
              {indicators.find(i => i.id === 'bb')?.enabled && (
                <>
                  <Area
                    type="monotone"
                    dataKey="bb_upper"
                    stroke="#ffc658"
                    strokeWidth={1}
                    fill="none"
                    strokeDasharray="5 5"
                  />
                  <Area
                    type="monotone"
                    dataKey="bb_lower"
                    stroke="#ffc658"
                    strokeWidth={1}
                    fill="none"
                    strokeDasharray="5 5"
                  />
                  <Line
                    type="monotone"
                    dataKey="bb_middle"
                    stroke="#ffc658"
                    strokeWidth={1}
                    dot={false}
                  />
                </>
              )}
              
              {/* Price bars rendered as custom shapes */}
              <Bar 
                dataKey="high" 
                shape={<CandlestickBar />}
                fill="transparent"
              />
            </ComposedChart>
          </ResponsiveContainer>
        );

      case 'bar':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
              <XAxis 
                dataKey="date" 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: '#9ca3af' }}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: '#9ca3af' }}
                tickFormatter={(value) => `$${value}`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="close" fill="#3b82f6" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        );

      default: // line
        return (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
              <XAxis 
                dataKey="date" 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: '#9ca3af' }}
              />
              <YAxis 
                domain={['dataMin - 5', 'dataMax + 5']}
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: '#9ca3af' }}
                tickFormatter={(value) => `$${value}`}
              />
              <Tooltip content={<CustomTooltip />} />
              
              {/* Bollinger Bands */}
              {indicators.find(i => i.id === 'bb')?.enabled && (
                <>
                  <Line
                    type="monotone"
                    dataKey="bb_upper"
                    stroke="#ffc658"
                    strokeWidth={1}
                    dot={false}
                    strokeDasharray="5 5"
                  />
                  <Line
                    type="monotone"
                    dataKey="bb_lower"
                    stroke="#ffc658"
                    strokeWidth={1}
                    dot={false}
                    strokeDasharray="5 5"
                  />
                  <Line
                    type="monotone"
                    dataKey="bb_middle"
                    stroke="#ffc658"
                    strokeWidth={1}
                    dot={false}
                  />
                </>
              )}
              
              <Line 
                type="monotone" 
                dataKey="close" 
                stroke="#3b82f6"
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
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-2">
            <CardTitle>{symbol} Chart</CardTitle>
            <Badge variant="secondary" className="text-xs">
              {formatCurrency(currentPrice)}
            </Badge>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            {/* Chart Type Buttons */}
            <div className="flex gap-1 bg-muted p-1 rounded-lg">
              <Button
                variant={chartType === 'line' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setChartType('line')}
                className="px-2"
              >
                <LineChartIcon className="h-4 w-4" />
              </Button>
              <Button
                variant={chartType === 'candlestick' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setChartType('candlestick')}
                className="px-2"
              >
                <CandlestickChart className="h-4 w-4" />
              </Button>
              <Button
                variant={chartType === 'bar' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setChartType('bar')}
                className="px-2"
              >
                <BarChart3 className="h-4 w-4" />
              </Button>
            </div>

            {/* Timeframe Buttons */}
            <div className="flex gap-1">
              {(['1D', '1W', '1M', '3M', '1Y', '5Y'] as Timeframe[]).map((tf) => (
                <Button
                  key={tf}
                  variant={timeframe === tf ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTimeframe(tf)}
                  className="px-2 text-xs"
                >
                  {tf}
                </Button>
              ))}
            </div>

            {/* Settings and Fullscreen */}
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Settings className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Chart Settings</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium mb-3 block">Technical Indicators</Label>
                    <div className="space-y-3">
                      {indicators.map((indicator) => (
                        <div key={indicator.id} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded"
                              style={{ backgroundColor: indicator.color }}
                            />
                            <Label className="text-sm">{indicator.name}</Label>
                          </div>
                          <Switch
                            checked={indicator.enabled}
                            onCheckedChange={() => toggleIndicator(indicator.id)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {onFullScreen && (
              <Button variant="outline" size="sm" onClick={onFullScreen}>
                <Maximize2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="h-80">
          {renderChart()}
        </div>
        
        {/* Volume Chart */}
        <div className="h-20 mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <XAxis dataKey="date" hide />
              <YAxis hide />
              <Tooltip
                formatter={(value) => [formatVolume(value as number), 'Volume']}
                labelFormatter={(label) => `Date: ${label}`}
              />
              <Bar dataKey="volume" fill="#6b7280" opacity={0.6} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Technical Indicators Charts */}
        {indicators.some(i => i.enabled) && (
          <div className="mt-6 space-y-4">
            {indicators.find(i => i.id === 'rsi' && i.enabled) && (
              <div>
                <Label className="text-sm font-medium mb-2 block">RSI (14)</Label>
                <div className="h-20">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data}>
                      <XAxis dataKey="date" hide />
                      <YAxis domain={[0, 100]} hide />
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
                      <Tooltip formatter={(value) => [`${value}`, 'RSI']} />
                      <Line 
                        type="monotone" 
                        dataKey="rsi" 
                        stroke="#8884d8" 
                        strokeWidth={1}
                        dot={false}
                      />
                      {/* RSI reference lines */}
                      <Line 
                        type="monotone" 
                        dataKey={() => 70} 
                        stroke="#ef4444" 
                        strokeWidth={1}
                        strokeDasharray="2 2"
                        dot={false}
                      />
                      <Line 
                        type="monotone" 
                        dataKey={() => 30} 
                        stroke="#22c55e" 
                        strokeWidth={1}
                        strokeDasharray="2 2"
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {indicators.find(i => i.id === 'macd' && i.enabled) && (
              <div>
                <Label className="text-sm font-medium mb-2 block">MACD</Label>
                <div className="h-20">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={data}>
                      <XAxis dataKey="date" hide />
                      <YAxis hide />
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
                      <Tooltip />
                      <Bar dataKey="histogram" fill="#82ca9d" opacity={0.7} />
                      <Line 
                        type="monotone" 
                        dataKey="macd" 
                        stroke="#82ca9d" 
                        strokeWidth={1}
                        dot={false}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="signal" 
                        stroke="#ff7300" 
                        strokeWidth={1}
                        dot={false}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}