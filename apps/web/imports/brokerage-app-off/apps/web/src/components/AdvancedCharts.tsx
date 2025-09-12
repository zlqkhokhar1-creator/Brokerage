"use client";

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceLine, 
  Legend 
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  PieChart, 
  Activity,
  Settings,
  Download,
  Maximize2
} from 'lucide-react';

interface ChartData {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  sma20: number;
  sma50: number;
  ema12: number;
  ema26: number;
  rsi: number;
  macd: number;
  signal: number;
  histogram: number;
}

interface TechnicalIndicator {
  name: string;
  value: number;
  signal: 'buy' | 'sell' | 'hold';
  description: string;
}

export default function AdvancedCharts({ symbol, data }: { symbol: string; data: ChartData[] }) {
  // Ensure data is defined to avoid runtime errors if not provided
  const safeData = data ?? [];

  const [chartType, setChartType] = useState<'candlestick' | 'line' | 'area' | 'bar'>('candlestick');
  const [timeframe, setTimeframe] = useState('1D');
  const [indicators, setIndicators] = useState<string[]>(['sma20', 'sma50']);
  const [technicalAnalysis, setTechnicalAnalysis] = useState<TechnicalIndicator[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (safeData.length > 0) {
      calculateTechnicalIndicators();
    }
  }, [safeData]);

  const calculateTechnicalIndicators = () => {
    const analysis: TechnicalIndicator[] = [];

    if (safeData.length < 20) return;

    const latest = safeData[safeData.length - 1];
    const previous = safeData[safeData.length - 2];

    // RSI Analysis
    if (latest.rsi !== undefined) {
      let rsiSignal: 'buy' | 'sell' | 'hold' = 'hold';
      if (latest.rsi < 30) rsiSignal = 'buy';
      else if (latest.rsi > 70) rsiSignal = 'sell';

      analysis.push({
        name: 'RSI',
        value: latest.rsi,
        signal: rsiSignal,
        description: rsiSignal === 'buy' ? 'Oversold - Potential buy signal' :
                    rsiSignal === 'sell' ? 'Overbought - Potential sell signal' :
                    'Neutral - No clear signal'
      });
    }

    // Moving Average Analysis
    if (latest.sma20 !== undefined && latest.sma50 !== undefined) {
      let maSignal: 'buy' | 'sell' | 'hold' = 'hold';
      if (latest.close > latest.sma20 && latest.sma20 > latest.sma50) {
        maSignal = 'buy';
      } else if (latest.close < latest.sma20 && latest.sma20 < latest.sma50) {
        maSignal = 'sell';
      }

      analysis.push({
        name: 'Moving Averages',
        value: latest.sma20,
        signal: maSignal,
        description: maSignal === 'buy' ? 'Bullish trend - Price above moving averages' :
                    maSignal === 'sell' ? 'Bearish trend - Price below moving averages' :
                    'Mixed signals - Wait for clearer direction'
      });
    }

    // MACD Analysis
    if (latest.macd !== undefined && latest.signal !== undefined) {
      let macdSignal: 'buy' | 'sell' | 'hold' = 'hold';
      if (latest.macd > latest.signal && previous.macd <= previous.signal) {
        macdSignal = 'buy';
      } else if (latest.macd < latest.signal && previous.macd >= previous.signal) {
        macdSignal = 'sell';
      }

      analysis.push({
        name: 'MACD',
        value: latest.macd,
        signal: macdSignal,
        description: macdSignal === 'buy' ? 'Bullish crossover - Buy signal' :
                    macdSignal === 'sell' ? 'Bearish crossover - Sell signal' :
                    'No crossover - Hold position'
      });
    }

    // Volume Analysis
    const avgVolume = safeData.slice(-20).reduce((sum, d) => sum + d.volume, 0) / 20;
    const volumeRatio = latest.volume / avgVolume;
    
    analysis.push({
      name: 'Volume',
      value: volumeRatio,
      signal: volumeRatio > 1.5 ? 'buy' : volumeRatio < 0.5 ? 'sell' : 'hold',
      description: volumeRatio > 1.5 ? 'High volume - Strong interest' :
                  volumeRatio < 0.5 ? 'Low volume - Weak interest' :
                  'Normal volume - No significant change'
    });

    setTechnicalAnalysis(analysis);
  };

  const formatPrice = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  const formatVolume = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }
    return value.toString();
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-slate-800 p-3 border rounded-lg shadow-lg">
          <p className="font-medium">{new Date(label).toLocaleString()}</p>
          <div className="space-y-1">
            <p>Open: {formatPrice(data.open)}</p>
            <p>High: {formatPrice(data.high)}</p>
            <p>Low: {formatPrice(data.low)}</p>
            <p>Close: {formatPrice(data.close)}</p>
            <p>Volume: {formatVolume(data.volume)}</p>
            {data.sma20 && <p>SMA20: {formatPrice(data.sma20)}</p>}
            {data.sma50 && <p>SMA50: {formatPrice(data.sma50)}</p>}
            {data.rsi && <p>RSI: {data.rsi.toFixed(2)}</p>}
          </div>
        </div>
      );
    }
    return null;
  };

  const CandlestickChart = ({ data }: { data: ChartData[] }) => {
    const candlestickData = data.map(d => ({
      ...d,
      timestamp: new Date(d.timestamp).getTime()
    }));

    return (
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={candlestickData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="timestamp"
            type="number"
            scale="time"
            domain={['dataMin', 'dataMax']}
            tickFormatter={(value) => new Date(value).toLocaleDateString()}
          />
          <YAxis domain={['dataMin', 'dataMax']} />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          
          {/* Candlestick bars */}
          <Bar dataKey="high" fill="transparent" />
          <Bar dataKey="low" fill="transparent" />
          <Bar dataKey="open" fill="transparent" />
          <Bar dataKey="close" fill="transparent" />
          
          {/* Moving averages */}
          {indicators.includes('sma20') && (
            <Line 
              type="monotone" 
              dataKey="sma20" 
              stroke="#8884d8" 
              strokeWidth={2}
              name="SMA 20"
            />
          )}
          {indicators.includes('sma50') && (
            <Line 
              type="monotone" 
              dataKey="sma50" 
              stroke="#82ca9d" 
              strokeWidth={2}
              name="SMA 50"
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    );
  };

  const renderChart = () => {
    switch (chartType) {
      case 'candlestick':
        return <CandlestickChart data={safeData} />;
      
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={safeData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="timestamp" />
              <YAxis domain={['dataMin', 'dataMax']} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="close" 
                stroke="#8884d8" 
                strokeWidth={2}
                name="Price"
              />
              {indicators.includes('sma20') && (
                <Line 
                  type="monotone" 
                  dataKey="sma20" 
                  stroke="#82ca9d" 
                  strokeWidth={2}
                  name="SMA 20"
                />
              )}
              {indicators.includes('sma50') && (
                <Line 
                  type="monotone" 
                  dataKey="sma50" 
                  stroke="#ffc658" 
                  strokeWidth={2}
                  name="SMA 50"
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        );
      
      case 'area':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={safeData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="timestamp" />
              <YAxis domain={['dataMin', 'dataMax']} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Area 
                type="monotone" 
                dataKey="close" 
                stroke="#8884d8" 
                fill="#8884d8"
                fillOpacity={0.3}
                name="Price"
              />
            </AreaChart>
          </ResponsiveContainer>
        );
      
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={safeData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="timestamp" />
              <YAxis />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar dataKey="volume" fill="#8884d8" name="Volume" />
            </BarChart>
          </ResponsiveContainer>
        );
      
      default:
        return <CandlestickChart data={safeData} />;
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      chartRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const downloadChart = () => {
    // In a real implementation, this would export the chart as an image
    console.log('Downloading chart...');
  };

  return (
    <div className="space-y-6">
      {/* Chart Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <Select value={chartType} onValueChange={(value: any) => setChartType(value)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="candlestick">Candlestick</SelectItem>
              <SelectItem value="line">Line</SelectItem>
              <SelectItem value="area">Area</SelectItem>
              <SelectItem value="bar">Volume</SelectItem>
            </SelectContent>
          </Select>

          <Select value={timeframe} onValueChange={setTimeframe}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1D">1 Day</SelectItem>
              <SelectItem value="1W">1 Week</SelectItem>
              <SelectItem value="1M">1 Month</SelectItem>
              <SelectItem value="3M">3 Months</SelectItem>
              <SelectItem value="6M">6 Months</SelectItem>
              <SelectItem value="1Y">1 Year</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={downloadChart}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" size="sm" onClick={toggleFullscreen}>
            <Maximize2 className="w-4 h-4 mr-2" />
            Fullscreen
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Activity className="w-5 h-5" />
                <span>{symbol} - Advanced Chart</span>
              </CardTitle>
              <CardDescription>
                Real-time price action with technical indicators
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div ref={chartRef} className="w-full">
                {renderChart()}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Technical Analysis Panel */}
        <div className="space-y-6">
          {/* Technical Indicators */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="w-5 h-5" />
                <span>Technical Analysis</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {technicalAnalysis.map((indicator, index) => (
                  <div key={index} className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{indicator.name}</span>
                      <span className={`px-2 py-1 rounded text-xs ${
                        indicator.signal === 'buy' ? 'bg-green-100 text-green-800' :
                        indicator.signal === 'sell' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {indicator.signal.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                      {indicator.description}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Value: {indicator.value.toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Indicator Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="w-5 h-5" />
                <span>Indicators</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="sma20"
                    checked={indicators.includes('sma20')}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setIndicators([...indicators, 'sma20']);
                      } else {
                        setIndicators(indicators.filter(i => i !== 'sma20'));
                      }
                    }}
                    className="rounded"
                  />
                  <label htmlFor="sma20" className="text-sm">SMA 20</label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="sma50"
                    checked={indicators.includes('sma50')}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setIndicators([...indicators, 'sma50']);
                      } else {
                        setIndicators(indicators.filter(i => i !== 'sma50'));
                      }
                    }}
                    className="rounded"
                  />
                  <label htmlFor="sma50" className="text-sm">SMA 50</label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="ema12"
                    checked={indicators.includes('ema12')}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setIndicators([...indicators, 'ema12']);
                      } else {
                        setIndicators(indicators.filter(i => i !== 'ema12'));
                      }
                    }}
                    className="rounded"
                  />
                  <label htmlFor="ema12" className="text-sm">EMA 12</label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="ema26"
                    checked={indicators.includes('ema26')}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setIndicators([...indicators, 'ema26']);
                      } else {
                        setIndicators(indicators.filter(i => i !== 'ema26'));
                      }
                    }}
                    className="rounded"
                  />
                  <label htmlFor="ema26" className="text-sm">EMA 26</label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Market Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <PieChart className="w-5 h-5" />
                <span>Market Summary</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {safeData.length > 0 && (
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600">Current Price:</span>
                    <span className="font-medium">{formatPrice(safeData[safeData.length - 1].close)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600">24h Change:</span>
                    <span className={`font-medium ${
                      safeData[safeData.length - 1].close > safeData[safeData.length - 2].close 
                        ? 'text-green-600' 
                        : 'text-red-600'
                    }`}>
                      {safeData[safeData.length - 1].close > safeData[safeData.length - 2].close ? '+' : ''}
                      {((safeData[safeData.length - 1].close - safeData[safeData.length - 2].close) / safeData[safeData.length - 2].close * 100).toFixed(2)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600">Volume:</span>
                    <span className="font-medium">{formatVolume(safeData[safeData.length - 1].volume)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600">High:</span>
                    <span className="font-medium">{formatPrice(safeData[safeData.length - 1].high)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600">Low:</span>
                    <span className="font-medium">{formatPrice(safeData[safeData.length - 1].low)}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}


