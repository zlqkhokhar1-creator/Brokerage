import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
import { Dialog, DialogContent } from '../ui/dialog';
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
  X, 
  Settings,
  ZoomIn,
  ZoomOut,
  Move,
  RotateCcw,
  Volume2,
  BarChart3,
  LineChart as LineChartIcon,
  CandlestickChart,
  TrendingUp
} from 'lucide-react';
import { ChartData } from './AdvancedChart';

interface FullScreenChartProps {
  isOpen: boolean;
  onClose: () => void;
  data: ChartData[];
  symbol: string;
  currentPrice: number;
}

type ChartType = 'line' | 'candlestick' | 'bar';
type Timeframe = '1D' | '1W' | '1M' | '3M' | '1Y' | '5Y';

interface TechnicalIndicator {
  id: string;
  name: string;
  enabled: boolean;
  color: string;
}

export function FullScreenChart({ isOpen, onClose, data, symbol, currentPrice }: FullScreenChartProps) {
  const [chartType, setChartType] = useState<ChartType>('line');
  const [timeframe, setTimeframe] = useState<Timeframe>('1M');
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [lastPanPoint, setLastPanPoint] = useState({ x: 0, y: 0 });
  const [showSettings, setShowSettings] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);

  const [indicators, setIndicators] = useState<TechnicalIndicator[]>([
    { id: 'rsi', name: 'RSI (14)', enabled: false, color: '#8884d8' },
    { id: 'macd', name: 'MACD', enabled: false, color: '#82ca9d' },
    { id: 'bb', name: 'Bollinger Bands', enabled: false, color: '#ffc658' },
    { id: 'ema', name: 'EMA (20)', enabled: false, color: '#ff7300' },
    { id: 'sma', name: 'SMA (50)', enabled: false, color: '#00d4aa' },
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

  // Touch/Mouse handlers for pan and zoom
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setLastPanPoint({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    } else if (e.touches.length === 2) {
      // Handle pinch start
      const distance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      setLastPanPoint({ x: distance, y: 0 });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    
    if (e.touches.length === 1 && isDragging) {
      const deltaX = e.touches[0].clientX - lastPanPoint.x;
      const deltaY = e.touches[0].clientY - lastPanPoint.y;
      
      setPanOffset(prev => ({
        x: prev.x + deltaX * 0.5,
        y: prev.y + deltaY * 0.5
      }));
      
      setLastPanPoint({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    } else if (e.touches.length === 2) {
      // Handle pinch zoom
      const distance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      
      const scale = distance / lastPanPoint.x;
      setZoomLevel(prev => Math.min(Math.max(prev * scale, 0.5), 3));
      setLastPanPoint({ x: distance, y: 0 });
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setLastPanPoint({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    
    const deltaX = e.clientX - lastPanPoint.x;
    const deltaY = e.clientY - lastPanPoint.y;
    
    setPanOffset(prev => ({
      x: prev.x + deltaX * 0.5,
      y: prev.y + deltaY * 0.5
    }));
    
    setLastPanPoint({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const resetView = () => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
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
        {chartType !== 'candlestick' && (
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

    const commonProps = {
      data: chartData,
      margin: { top: 20, right: 30, left: 20, bottom: 5 }
    };

    const commonAxisProps = {
      axisLine: false,
      tickLine: false,
      tick: { fontSize: 12, fill: '#9ca3af' }
    };

    switch (chartType) {
      case 'candlestick':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
              <XAxis dataKey="date" {...commonAxisProps} />
              <YAxis 
                domain={['dataMin - 5', 'dataMax + 5']}
                {...commonAxisProps}
                tickFormatter={(value) => `$${value}`}
              />
              <Tooltip content={<CustomTooltip />} />
              
              {/* Technical Indicators */}
              {indicators.map((indicator) => {
                if (!indicator.enabled) return null;
                
                switch (indicator.id) {
                  case 'bb':
                    return (
                      <React.Fragment key={indicator.id}>
                        <Line
                          type="monotone"
                          dataKey="bb_upper"
                          stroke={indicator.color}
                          strokeWidth={1}
                          dot={false}
                          strokeDasharray="5 5"
                        />
                        <Line
                          type="monotone"
                          dataKey="bb_lower"
                          stroke={indicator.color}
                          strokeWidth={1}
                          dot={false}
                          strokeDasharray="5 5"
                        />
                        <Line
                          type="monotone"
                          dataKey="bb_middle"
                          stroke={indicator.color}
                          strokeWidth={1}
                          dot={false}
                        />
                      </React.Fragment>
                    );
                  case 'ema':
                    return (
                      <Line
                        key={indicator.id}
                        type="monotone"
                        dataKey="ema"
                        stroke={indicator.color}
                        strokeWidth={1}
                        dot={false}
                      />
                    );
                  case 'sma':
                    return (
                      <Line
                        key={indicator.id}
                        type="monotone"
                        dataKey="sma"
                        stroke={indicator.color}
                        strokeWidth={2}
                        dot={false}
                      />
                    );
                  default:
                    return null;
                }
              })}
            </ComposedChart>
          </ResponsiveContainer>
        );

      case 'bar':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
              <XAxis dataKey="date" {...commonAxisProps} />
              <YAxis {...commonAxisProps} tickFormatter={(value) => `$${value}`} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="close" fill="#3b82f6" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        );

      default: // line
        return (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
              <XAxis dataKey="date" {...commonAxisProps} />
              <YAxis 
                domain={['dataMin - 5', 'dataMax + 5']}
                {...commonAxisProps}
                tickFormatter={(value) => `$${value}`}
              />
              <Tooltip content={<CustomTooltip />} />
              
              {/* Technical Indicators */}
              {indicators.map((indicator) => {
                if (!indicator.enabled) return null;
                
                switch (indicator.id) {
                  case 'bb':
                    return (
                      <React.Fragment key={indicator.id}>
                        <Line
                          type="monotone"
                          dataKey="bb_upper"
                          stroke={indicator.color}
                          strokeWidth={1}
                          dot={false}
                          strokeDasharray="5 5"
                        />
                        <Line
                          type="monotone"
                          dataKey="bb_lower"
                          stroke={indicator.color}
                          strokeWidth={1}
                          dot={false}
                          strokeDasharray="5 5"
                        />
                        <Line
                          type="monotone"
                          dataKey="bb_middle"
                          stroke={indicator.color}
                          strokeWidth={1}
                          dot={false}
                        />
                      </React.Fragment>
                    );
                  case 'ema':
                    return (
                      <Line
                        key={indicator.id}
                        type="monotone"
                        dataKey="ema"
                        stroke={indicator.color}
                        strokeWidth={1}
                        dot={false}
                      />
                    );
                  case 'sma':
                    return (
                      <Line
                        key={indicator.id}
                        type="monotone"
                        dataKey="sma"
                        stroke={indicator.color}
                        strokeWidth={2}
                        dot={false}
                      />
                    );
                  default:
                    return null;
                }
              })}
              
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

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-full w-full h-full m-0 p-0 bg-background">
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border bg-card/50 backdrop-blur-sm">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">{symbol}</h2>
                <Badge variant="secondary">
                  {formatCurrency(currentPrice)}
                </Badge>
              </div>
              
              {/* Chart Type Controls */}
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
            </div>

            <div className="flex items-center gap-2">
              {/* Timeframe Controls */}
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

              {/* Zoom Controls */}
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setZoomLevel(prev => Math.min(prev * 1.2, 3))}
                  disabled={zoomLevel >= 3}
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setZoomLevel(prev => Math.max(prev / 1.2, 0.5))}
                  disabled={zoomLevel <= 0.5}
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetView}
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>

              {/* Settings */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSettings(!showSettings)}
              >
                <Settings className="h-4 w-4" />
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={onClose}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Chart Container */}
          <div className="flex-1 flex">
            {/* Settings Panel */}
            {showSettings && (
              <div className="w-64 bg-card border-r border-border p-4 overflow-y-auto">
                <h3 className="font-medium mb-4">Technical Indicators</h3>
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
            )}

            {/* Main Chart Area */}
            <div className="flex-1 flex flex-col">
              {/* Chart */}
              <div 
                ref={chartRef}
                className="flex-1 cursor-move select-none relative overflow-hidden"
                style={{
                  transform: `scale(${zoomLevel}) translate(${panOffset.x}px, ${panOffset.y}px)`,
                  transformOrigin: 'center center'
                }}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              >
                {renderChart()}
              </div>

              {/* Volume Chart */}
              <div className="h-24 border-t border-border">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={data}
                    style={{
                      transform: `scale(${zoomLevel}) translateX(${panOffset.x}px)`,
                      transformOrigin: 'center center'
                    }}
                  >
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

              {/* Technical Indicators Panel */}
              {indicators.some(i => i.enabled && (i.id === 'rsi' || i.id === 'macd')) && (
                <div className="border-t border-border bg-card/20">
                  {indicators.find(i => i.id === 'rsi' && i.enabled) && (
                    <div className="h-20 p-2">
                      <Label className="text-xs text-muted-foreground mb-1 block">RSI (14)</Label>
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
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {indicators.find(i => i.id === 'macd' && i.enabled) && (
                    <div className="h-20 p-2 border-t border-border/50">
                      <Label className="text-xs text-muted-foreground mb-1 block">MACD</Label>
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
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}