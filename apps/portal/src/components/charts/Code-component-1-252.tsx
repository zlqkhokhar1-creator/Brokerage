import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { 
  TrendingUp, 
  TrendingDown, 
  Activity,
  BarChart3,
  PieChart,
  DollarSign,
  Percent,
  Calendar,
  Target,
  AlertCircle,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { ChartData } from './AdvancedChart';

interface AnalyticsPanelProps {
  data: ChartData[];
  symbol: string;
  currentPrice: number;
  marketCap: string;
  volume: number;
}

interface AnalyticsMetric {
  name: string;
  value: string | number;
  change?: number;
  status?: 'positive' | 'negative' | 'neutral';
  description?: string;
  icon?: React.ReactNode;
}

export function AnalyticsPanel({ data, symbol, currentPrice, marketCap, volume }: AnalyticsPanelProps) {
  const [analytics, setAnalytics] = useState<any>(null);

  // Calculate technical analytics
  useEffect(() => {
    if (!data || data.length === 0) return;

    const calculateAnalytics = () => {
      const prices = data.map(d => d.close);
      const volumes = data.map(d => d.volume);
      const highs = data.map(d => d.high);
      const lows = data.map(d => d.low);

      // Price Statistics
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);
      const avgPrice = prices.reduce((sum, p) => sum + p, 0) / prices.length;
      const priceRange = maxPrice - minPrice;
      const priceVolatility = calculateVolatility(prices);

      // Volume Analytics
      const avgVolume = volumes.reduce((sum, v) => sum + v, 0) / volumes.length;
      const maxVolume = Math.max(...volumes);
      const volumeRatio = volume / avgVolume;

      // Moving Averages
      const sma20 = calculateSMA(prices, 20);
      const sma50 = calculateSMA(prices, 50);
      const ema12 = calculateEMA(prices, 12);
      const ema26 = calculateEMA(prices, 26);

      // Technical Indicators
      const rsi = calculateRSI(prices, 14);
      const macd = ema12[ema12.length - 1] - ema26[ema26.length - 1];
      const signal = calculateEMA([macd], 9)[0];
      
      // Bollinger Bands
      const bb = calculateBollingerBands(prices, 20, 2);
      const bbPosition = (currentPrice - bb.lower) / (bb.upper - bb.lower);

      // Support and Resistance
      const { support, resistance } = calculateSupportResistance(data);

      return {
        price: {
          current: currentPrice,
          min: minPrice,
          max: maxPrice,
          average: avgPrice,
          range: priceRange,
          volatility: priceVolatility,
          change24h: ((currentPrice - prices[prices.length - 2]) / prices[prices.length - 2]) * 100
        },
        volume: {
          current: volume,
          average: avgVolume,
          max: maxVolume,
          ratio: volumeRatio,
          trend: volume > avgVolume ? 'high' : volume < avgVolume * 0.5 ? 'low' : 'normal'
        },
        technical: {
          rsi: rsi[rsi.length - 1],
          macd: {
            value: macd,
            signal: signal,
            histogram: macd - signal
          },
          sma20: sma20[sma20.length - 1],
          sma50: sma50[sma50.length - 1],
          bollinger: {
            upper: bb.upper,
            middle: bb.middle,
            lower: bb.lower,
            position: bbPosition
          }
        },
        levels: {
          support,
          resistance,
          nextSupport: support * 0.98,
          nextResistance: resistance * 1.02
        },
        fundamentals: {
          peRatio: 24.5,
          pegRatio: 1.2,
          priceToBook: 4.2,
          debtToEquity: 0.8,
          roe: 15.4,
          grossMargin: 43.9,
          operatingMargin: 25.8,
          netMargin: 21.2,
          beta: 1.12
        }
      };
    };

    setAnalytics(calculateAnalytics());
  }, [data, currentPrice, volume]);

  // Helper functions for calculations
  const calculateVolatility = (prices: number[], period: number = 20): number => {
    if (prices.length < period) return 0;
    
    const returns = [];
    for (let i = 1; i < prices.length; i++) {
      returns.push(Math.log(prices[i] / prices[i - 1]));
    }
    
    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
    
    return Math.sqrt(variance * 252) * 100; // Annualized volatility
  };

  const calculateSMA = (prices: number[], period: number): number[] => {
    const sma = [];
    for (let i = period - 1; i < prices.length; i++) {
      const sum = prices.slice(i - period + 1, i + 1).reduce((sum, price) => sum + price, 0);
      sma.push(sum / period);
    }
    return sma;
  };

  const calculateEMA = (prices: number[], period: number): number[] => {
    const ema = [prices[0]];
    const multiplier = 2 / (period + 1);
    
    for (let i = 1; i < prices.length; i++) {
      ema.push((prices[i] * multiplier) + (ema[i - 1] * (1 - multiplier)));
    }
    return ema;
  };

  const calculateRSI = (prices: number[], period: number = 14): number[] => {
    const gains = [];
    const losses = [];
    
    for (let i = 1; i < prices.length; i++) {
      const change = prices[i] - prices[i - 1];
      gains.push(change > 0 ? change : 0);
      losses.push(change < 0 ? Math.abs(change) : 0);
    }
    
    const rsi = [];
    for (let i = period - 1; i < gains.length; i++) {
      const avgGain = gains.slice(i - period + 1, i + 1).reduce((sum, g) => sum + g, 0) / period;
      const avgLoss = losses.slice(i - period + 1, i + 1).reduce((sum, l) => sum + l, 0) / period;
      
      if (avgLoss === 0) {
        rsi.push(100);
      } else {
        const rs = avgGain / avgLoss;
        rsi.push(100 - (100 / (1 + rs)));
      }
    }
    
    return rsi;
  };

  const calculateBollingerBands = (prices: number[], period: number = 20, stdDev: number = 2) => {
    const sma = calculateSMA(prices, period);
    const lastSMA = sma[sma.length - 1];
    
    // Calculate standard deviation for the last period
    const lastPrices = prices.slice(-period);
    const variance = lastPrices.reduce((sum, price) => sum + Math.pow(price - lastSMA, 2), 0) / period;
    const standardDeviation = Math.sqrt(variance);
    
    return {
      upper: lastSMA + (standardDeviation * stdDev),
      middle: lastSMA,
      lower: lastSMA - (standardDeviation * stdDev)
    };
  };

  const calculateSupportResistance = (data: ChartData[]) => {
    const highs = data.map(d => d.high);
    const lows = data.map(d => d.low);
    
    // Simple support/resistance calculation based on recent highs and lows
    const recentHighs = highs.slice(-20).sort((a, b) => b - a);
    const recentLows = lows.slice(-20).sort((a, b) => a - b);
    
    return {
      resistance: recentHighs[0],
      support: recentLows[0]
    };
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  const formatVolume = (volume: number) => {
    if (volume >= 1000000000) {
      return `${(volume / 1000000000).toFixed(1)}B`;
    } else if (volume >= 1000000) {
      return `${(volume / 1000000).toFixed(1)}M`;
    }
    return `${(volume / 1000).toFixed(0)}K`;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'positive':
      case 'bullish':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'negative':
      case 'bearish':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getRSIStatus = (rsi: number) => {
    if (rsi > 70) return { status: 'Overbought', color: 'text-red-500' };
    if (rsi < 30) return { status: 'Oversold', color: 'text-green-500' };
    return { status: 'Neutral', color: 'text-muted-foreground' };
  };

  const getBollingerStatus = (position: number) => {
    if (position > 0.8) return { status: 'Near Upper Band', color: 'text-red-500' };
    if (position < 0.2) return { status: 'Near Lower Band', color: 'text-green-500' };
    return { status: 'Middle Range', color: 'text-muted-foreground' };
  };

  if (!analytics) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading analytics...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="technical">Technical</TabsTrigger>
          <TabsTrigger value="fundamentals">Fundamentals</TabsTrigger>
          <TabsTrigger value="levels">Key Levels</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Market Cap</p>
                    <p className="text-lg font-semibold">{marketCap}</p>
                  </div>
                  <DollarSign className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Volume Ratio</p>
                    <p className="text-lg font-semibold">{analytics.volume.ratio.toFixed(1)}x</p>
                    <Badge 
                      variant={analytics.volume.trend === 'high' ? 'default' : analytics.volume.trend === 'low' ? 'destructive' : 'secondary'}
                      className="text-xs mt-1"
                    >
                      {analytics.volume.trend}
                    </Badge>
                  </div>
                  <Activity className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Volatility</p>
                    <p className="text-lg font-semibold">{analytics.price.volatility.toFixed(1)}%</p>
                    <p className={`text-xs ${analytics.price.volatility > 30 ? 'text-red-500' : analytics.price.volatility < 15 ? 'text-green-500' : 'text-muted-foreground'}`}>
                      {analytics.price.volatility > 30 ? 'High' : analytics.price.volatility < 15 ? 'Low' : 'Normal'}
                    </p>
                  </div>
                  <BarChart3 className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">24h Change</p>
                    <p className={`text-lg font-semibold ${analytics.price.change24h >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatPercent(analytics.price.change24h)}
                    </p>
                  </div>
                  {analytics.price.change24h >= 0 ? 
                    <TrendingUp className="h-5 w-5 text-green-600" /> : 
                    <TrendingDown className="h-5 w-5 text-red-600" />
                  }
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Price Analysis */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Price Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Current Price</span>
                    <span className="font-semibold">{formatCurrency(analytics.price.current)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Period High</span>
                    <span className="font-semibold text-green-600">{formatCurrency(analytics.price.max)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Period Low</span>
                    <span className="font-semibold text-red-600">{formatCurrency(analytics.price.min)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Average Price</span>
                    <span className="font-semibold">{formatCurrency(analytics.price.average)}</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-muted-foreground">Price Position</span>
                      <span className="text-sm font-medium">
                        {(((analytics.price.current - analytics.price.min) / analytics.price.range) * 100).toFixed(1)}%
                      </span>
                    </div>
                    <Progress 
                      value={((analytics.price.current - analytics.price.min) / analytics.price.range) * 100} 
                      className="h-2"
                    />
                  </div>
                  
                  <div className="text-sm text-muted-foreground">
                    Price range: {formatCurrency(analytics.price.range)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="technical" className="space-y-4">
          {/* Technical Indicators */}
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">RSI (14)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-2xl font-semibold">{analytics.technical.rsi.toFixed(1)}</span>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(getRSIStatus(analytics.technical.rsi).status.toLowerCase())}
                    <span className={`text-sm ${getRSIStatus(analytics.technical.rsi).color}`}>
                      {getRSIStatus(analytics.technical.rsi).status}
                    </span>
                  </div>
                </div>
                <Progress value={analytics.technical.rsi} className="h-2" />
                <div className="flex justify-between text-xs text-muted-foreground mt-2">
                  <span>Oversold (30)</span>
                  <span>Overbought (70)</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">MACD</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">MACD Line</span>
                    <span className="font-semibold">{analytics.technical.macd.value.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Signal Line</span>
                    <span className="font-semibold">{analytics.technical.macd.signal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Histogram</span>
                    <span className={`font-semibold ${analytics.technical.macd.histogram >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {analytics.technical.macd.histogram.toFixed(2)}
                    </span>
                  </div>
                  <div className="mt-3">
                    <Badge variant={analytics.technical.macd.histogram >= 0 ? 'default' : 'destructive'}>
                      {analytics.technical.macd.histogram >= 0 ? 'Bullish' : 'Bearish'}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Moving Averages */}
          <Card>
            <CardHeader>
              <CardTitle>Moving Averages</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">SMA (20)</span>
                    <span className="font-semibold">{formatCurrency(analytics.technical.sma20)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">SMA (50)</span>
                    <span className="font-semibold">{formatCurrency(analytics.technical.sma50)}</span>
                  </div>
                  <div className="pt-2">
                    <Badge variant={analytics.price.current > analytics.technical.sma20 ? 'default' : 'destructive'}>
                      {analytics.price.current > analytics.technical.sma20 ? 'Above SMA 20' : 'Below SMA 20'}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Golden Cross</span>
                    <Badge variant={analytics.technical.sma20 > analytics.technical.sma50 ? 'default' : 'secondary'}>
                      {analytics.technical.sma20 > analytics.technical.sma50 ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {analytics.technical.sma20 > analytics.technical.sma50 
                      ? 'Short-term trend is stronger than long-term' 
                      : 'Long-term trend is stronger than short-term'
                    }
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bollinger Bands */}
          <Card>
            <CardHeader>
              <CardTitle>Bollinger Bands</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Upper Band</span>
                    <span className="font-semibold">{formatCurrency(analytics.technical.bollinger.upper)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Middle Band</span>
                    <span className="font-semibold">{formatCurrency(analytics.technical.bollinger.middle)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Lower Band</span>
                    <span className="font-semibold">{formatCurrency(analytics.technical.bollinger.lower)}</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-muted-foreground">Band Position</span>
                      <span className={`text-sm font-medium ${getBollingerStatus(analytics.technical.bollinger.position).color}`}>
                        {(analytics.technical.bollinger.position * 100).toFixed(1)}%
                      </span>
                    </div>
                    <Progress value={analytics.technical.bollinger.position * 100} className="h-2" />
                  </div>
                  
                  <Badge variant={getBollingerStatus(analytics.technical.bollinger.position).status === 'Middle Range' ? 'secondary' : 'default'}>
                    {getBollingerStatus(analytics.technical.bollinger.position).status}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fundamentals" className="space-y-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Valuation Metrics */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Valuation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">P/E Ratio</span>
                  <span className="font-semibold">{analytics.fundamentals.peRatio}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">PEG Ratio</span>
                  <span className="font-semibold">{analytics.fundamentals.pegRatio}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">P/B Ratio</span>
                  <span className="font-semibold">{analytics.fundamentals.priceToBook}</span>
                </div>
              </CardContent>
            </Card>

            {/* Profitability */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Profitability</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">ROE</span>
                  <span className="font-semibold text-green-600">{analytics.fundamentals.roe}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Gross Margin</span>
                  <span className="font-semibold">{analytics.fundamentals.grossMargin}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Net Margin</span>
                  <span className="font-semibold">{analytics.fundamentals.netMargin}%</span>
                </div>
              </CardContent>
            </Card>

            {/* Risk Metrics */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Risk</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Beta</span>
                  <span className="font-semibold">{analytics.fundamentals.beta}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Debt/Equity</span>
                  <span className="font-semibold">{analytics.fundamentals.debtToEquity}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Volatility</span>
                  <span className="font-semibold">{analytics.price.volatility.toFixed(1)}%</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="levels" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            {/* Support and Resistance */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Key Levels</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Resistance</span>
                    <span className="font-semibold text-red-600">{formatCurrency(analytics.levels.resistance)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Current</span>
                    <span className="font-semibold">{formatCurrency(analytics.price.current)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Support</span>
                    <span className="font-semibold text-green-600">{formatCurrency(analytics.levels.support)}</span>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="flex justify-between text-xs text-muted-foreground mb-2">
                    <span>Support</span>
                    <span>Resistance</span>
                  </div>
                  <Progress 
                    value={((analytics.price.current - analytics.levels.support) / (analytics.levels.resistance - analytics.levels.support)) * 100}
                    className="h-3"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Next Targets */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Next Targets</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Next Resistance</span>
                  <div className="text-right">
                    <span className="font-semibold text-red-600">{formatCurrency(analytics.levels.nextResistance)}</span>
                    <div className="text-xs text-muted-foreground">
                      +{(((analytics.levels.nextResistance - analytics.price.current) / analytics.price.current) * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Next Support</span>
                  <div className="text-right">
                    <span className="font-semibold text-green-600">{formatCurrency(analytics.levels.nextSupport)}</span>
                    <div className="text-xs text-muted-foreground">
                      {(((analytics.levels.nextSupport - analytics.price.current) / analytics.price.current) * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}