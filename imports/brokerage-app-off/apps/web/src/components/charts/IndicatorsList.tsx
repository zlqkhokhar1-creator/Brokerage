import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { 
  TrendingUp, 
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Minus,
  Activity,
  BarChart3,
  Target
} from 'lucide-react';
import { ChartData } from './AdvancedChart';

interface IndicatorsListProps {
  data: ChartData[];
  currentPrice: number;
}

interface IndicatorData {
  name: string;
  value: string;
  signal: 'Strong Buy' | 'Buy' | 'Neutral' | 'Sell' | 'Strong Sell';
  description: string;
  category: 'trend' | 'momentum' | 'volume' | 'volatility';
  icon: React.ReactNode;
}

export function IndicatorsList({ data, currentPrice }: IndicatorsListProps) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardContent className="p-4 text-center text-muted-foreground">
          Loading indicators...
        </CardContent>
      </Card>
    );
  }

  const latestData = data[data.length - 1];
  const prices = data.map(d => d.close);
  
  // Calculate indicators
  const rsi = latestData.rsi || 50;
  const macd = latestData.macd || 0;
  const signal = latestData.signal || 0;
  const sma = latestData.ema || currentPrice;
  const volume = latestData.volume;
  const avgVolume = data.reduce((sum, d) => sum + d.volume, 0) / data.length;
  
  // Bollinger Bands position
  const bbUpper = latestData.bb_upper || currentPrice * 1.02;
  const bbLower = latestData.bb_lower || currentPrice * 0.98;
  const bbPosition = ((currentPrice - bbLower) / (bbUpper - bbLower)) * 100;

  const indicators: IndicatorData[] = [
    {
      name: 'RSI (14)',
      value: rsi.toFixed(1),
      signal: rsi > 75 ? 'Strong Sell' : 
              rsi > 65 ? 'Sell' : 
              rsi < 25 ? 'Strong Buy' : 
              rsi < 35 ? 'Buy' : 'Neutral',
      description: rsi > 70 ? 'Overbought condition' : 
                   rsi < 30 ? 'Oversold condition' : 'Normal range',
      category: 'momentum',
      icon: <Activity className="h-4 w-4" />
    },
    {
      name: 'MACD',
      value: `${macd.toFixed(3)} / ${signal.toFixed(3)}`,
      signal: macd > signal && macd > 0 ? 'Strong Buy' :
              macd > signal && macd < 0 ? 'Buy' :
              macd < signal && macd > 0 ? 'Sell' :
              macd < signal && macd < 0 ? 'Strong Sell' : 'Neutral',
      description: macd > signal ? 'Bullish momentum' : 'Bearish momentum',
      category: 'trend',
      icon: <TrendingUp className="h-4 w-4" />
    },
    {
      name: 'SMA (20)',
      value: `$${sma.toFixed(2)}`,
      signal: currentPrice > sma * 1.02 ? 'Strong Buy' :
              currentPrice > sma ? 'Buy' :
              currentPrice < sma * 0.98 ? 'Strong Sell' :
              currentPrice < sma ? 'Sell' : 'Neutral',
      description: currentPrice > sma ? 'Price above moving average' : 'Price below moving average',
      category: 'trend',
      icon: <BarChart3 className="h-4 w-4" />
    },
    {
      name: 'Volume Ratio',
      value: `${(volume / avgVolume).toFixed(2)}x`,
      signal: volume > avgVolume * 2 ? 'Strong Buy' :
              volume > avgVolume * 1.5 ? 'Buy' :
              volume < avgVolume * 0.3 ? 'Strong Sell' :
              volume < avgVolume * 0.7 ? 'Sell' : 'Neutral',
      description: volume > avgVolume ? 'Above average volume' : 'Below average volume',
      category: 'volume',
      icon: <Activity className="h-4 w-4" />
    },
    {
      name: 'Bollinger Bands',
      value: `${bbPosition.toFixed(0)}%`,
      signal: bbPosition > 90 ? 'Strong Sell' :
              bbPosition > 75 ? 'Sell' :
              bbPosition < 10 ? 'Strong Buy' :
              bbPosition < 25 ? 'Buy' : 'Neutral',
      description: bbPosition > 80 ? 'Near upper band' : 
                   bbPosition < 20 ? 'Near lower band' : 'Middle range',
      category: 'volatility',
      icon: <Target className="h-4 w-4" />
    }
  ];

  const getSignalColor = (signal: string) => {
    switch (signal) {
      case 'Strong Buy':
        return 'text-green-700 bg-green-100 border-green-200';
      case 'Buy':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'Strong Sell':
        return 'text-red-700 bg-red-100 border-red-200';
      case 'Sell':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-muted-foreground bg-muted border-border';
    }
  };

  const getSignalIcon = (signal: string) => {
    switch (signal) {
      case 'Strong Buy':
        return <CheckCircle2 className="h-4 w-4 text-green-700" />;
      case 'Buy':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'Strong Sell':
        return <XCircle className="h-4 w-4 text-red-700" />;
      case 'Sell':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      default:
        return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'trend':
        return <TrendingUp className="h-3 w-3" />;
      case 'momentum':
        return <Activity className="h-3 w-3" />;
      case 'volume':
        return <BarChart3 className="h-3 w-3" />;
      case 'volatility':
        return <AlertTriangle className="h-3 w-3" />;
      default:
        return <Target className="h-3 w-3" />;
    }
  };

  // Group indicators by category
  const groupedIndicators = {
    trend: indicators.filter(i => i.category === 'trend'),
    momentum: indicators.filter(i => i.category === 'momentum'),
    volume: indicators.filter(i => i.category === 'volume'),
    volatility: indicators.filter(i => i.category === 'volatility')
  };

  // Calculate overall signal
  const buySignals = indicators.filter(i => i.signal === 'Buy' || i.signal === 'Strong Buy').length;
  const sellSignals = indicators.filter(i => i.signal === 'Sell' || i.signal === 'Strong Sell').length;
  const neutralSignals = indicators.filter(i => i.signal === 'Neutral').length;

  const overallSignal = buySignals > sellSignals ? (buySignals >= 3 ? 'Strong Buy' : 'Buy') :
                       sellSignals > buySignals ? (sellSignals >= 3 ? 'Strong Sell' : 'Sell') : 'Neutral';

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Technical Indicators</CardTitle>
          <Badge className={getSignalColor(overallSignal)}>
            {getSignalIcon(overallSignal)}
            <span className="ml-1">{overallSignal}</span>
          </Badge>
        </div>
        <div className="text-sm text-muted-foreground">
          {buySignals} Buy • {sellSignals} Sell • {neutralSignals} Neutral
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {Object.entries(groupedIndicators).map(([category, categoryIndicators]) => {
          if (categoryIndicators.length === 0) return null;
          
          return (
            <div key={category}>
              <div className="flex items-center gap-2 mb-3">
                {getCategoryIcon(category)}
                <h3 className="font-medium text-sm capitalize">
                  {category} Indicators
                </h3>
              </div>
              
              <div className="space-y-3">
                {categoryIndicators.map((indicator, index) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                    <div className="flex items-center gap-3">
                      <div className="text-muted-foreground">
                        {indicator.icon}
                      </div>
                      <div>
                        <div className="font-medium text-sm">{indicator.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {indicator.description}
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="font-medium text-sm mb-1">
                        {indicator.value}
                      </div>
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${getSignalColor(indicator.signal)}`}
                      >
                        {getSignalIcon(indicator.signal)}
                        <span className="ml-1">{indicator.signal}</span>
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
              
              {category !== 'volatility' && <Separator className="mt-4" />}
            </div>
          );
        })}

        {/* Summary Statistics */}
        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
          <h4 className="font-medium text-sm mb-3">Signal Summary</h4>
          <div className="grid grid-cols-3 gap-4 text-xs">
            <div className="text-center">
              <div className="font-semibold text-green-600">{buySignals}</div>
              <div className="text-muted-foreground">Buy Signals</div>
            </div>
            <div className="text-center">
              <div className="font-semibold">{neutralSignals}</div>
              <div className="text-muted-foreground">Neutral</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-red-600">{sellSignals}</div>
              <div className="text-muted-foreground">Sell Signals</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}