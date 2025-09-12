import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { 
  TrendingUp, 
  TrendingDown,
  Activity,
  Target,
  AlertCircle,
  CheckCircle,
  XCircle,
  Minus
} from 'lucide-react';
import { ChartData } from './AdvancedChart';

interface TechnicalSummaryProps {
  data: ChartData[];
  currentPrice: number;
}

export function TechnicalSummary({ data, currentPrice }: TechnicalSummaryProps) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardContent className="p-4 text-center text-muted-foreground">
          Loading technical data...
        </CardContent>
      </Card>
    );
  }

  const latestData = data[data.length - 1];
  const prices = data.map(d => d.close);
  
  // Calculate simple technical signals
  const rsi = latestData.rsi || 50;
  const sma20 = latestData.ema || currentPrice;
  const volume = latestData.volume;
  const avgVolume = data.reduce((sum, d) => sum + d.volume, 0) / data.length;
  
  // Technical analysis signals
  const signals = [
    {
      name: 'RSI',
      value: rsi.toFixed(1),
      signal: rsi > 70 ? 'Overbought' : rsi < 30 ? 'Oversold' : 'Neutral',
      status: rsi > 70 ? 'bearish' : rsi < 30 ? 'bullish' : 'neutral',
      icon: rsi > 70 ? XCircle : rsi < 30 ? CheckCircle : Minus
    },
    {
      name: 'Price vs SMA',
      value: ((currentPrice / sma20 - 1) * 100).toFixed(1) + '%',
      signal: currentPrice > sma20 ? 'Above SMA' : 'Below SMA',
      status: currentPrice > sma20 ? 'bullish' : 'bearish',
      icon: currentPrice > sma20 ? TrendingUp : TrendingDown
    },
    {
      name: 'Volume',
      value: (volume / avgVolume).toFixed(1) + 'x',
      signal: volume > avgVolume * 1.5 ? 'High' : volume < avgVolume * 0.5 ? 'Low' : 'Normal',
      status: volume > avgVolume * 1.5 ? 'bullish' : volume < avgVolume * 0.5 ? 'bearish' : 'neutral',
      icon: Activity
    }
  ];

  // Overall sentiment
  const bullishSignals = signals.filter(s => s.status === 'bullish').length;
  const bearishSignals = signals.filter(s => s.status === 'bearish').length;
  const neutralSignals = signals.filter(s => s.status === 'neutral').length;

  const overallSentiment = bullishSignals > bearishSignals ? 'Bullish' : 
                          bearishSignals > bullishSignals ? 'Bearish' : 'Neutral';
  
  const sentimentColor = overallSentiment === 'Bullish' ? 'text-green-600' :
                        overallSentiment === 'Bearish' ? 'text-red-600' : 'text-muted-foreground';

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'bullish':
        return 'text-green-600';
      case 'bearish':
        return 'text-red-600';
      default:
        return 'text-muted-foreground';
    }
  };

  const getStatusIcon = (status: string, IconComponent: any) => {
    const colorClass = getStatusColor(status);
    return <IconComponent className={`h-4 w-4 ${colorClass}`} />;
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Technical Summary</CardTitle>
          <Badge 
            variant={overallSentiment === 'Bullish' ? 'default' : 
                    overallSentiment === 'Bearish' ? 'destructive' : 'secondary'}
            className="text-xs"
          >
            {overallSentiment}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Overall Sentiment Meter */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-muted-foreground">Market Sentiment</span>
            <span className={`text-sm font-medium ${sentimentColor}`}>
              {bullishSignals}/{signals.length} Bullish
            </span>
          </div>
          <Progress 
            value={(bullishSignals / signals.length) * 100} 
            className="h-2"
          />
        </div>

        {/* Technical Indicators */}
        <div className="space-y-3">
          {signals.map((signal, index) => (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {getStatusIcon(signal.status, signal.icon)}
                <div>
                  <div className="text-sm font-medium">{signal.name}</div>
                  <div className="text-xs text-muted-foreground">{signal.signal}</div>
                </div>
              </div>
              <div className="text-right">
                <div className={`text-sm font-medium ${getStatusColor(signal.status)}`}>
                  {signal.value}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Key Levels */}
        <div className="pt-2 border-t border-border">
          <div className="text-sm font-medium mb-2">Key Levels</div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <div className="text-muted-foreground">Resistance</div>
              <div className="font-semibold text-red-600">
                ${(Math.max(...prices) * 1.02).toFixed(2)}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Support</div>
              <div className="font-semibold text-green-600">
                ${(Math.min(...prices) * 0.98).toFixed(2)}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3 pt-2 border-t border-border text-xs">
          <div className="text-center">
            <div className="text-muted-foreground">Volatility</div>
            <div className="font-semibold">
              {(((Math.max(...prices) - Math.min(...prices)) / Math.min(...prices)) * 100).toFixed(1)}%
            </div>
          </div>
          <div className="text-center">
            <div className="text-muted-foreground">Range</div>
            <div className="font-semibold">
              ${(Math.max(...prices) - Math.min(...prices)).toFixed(2)}
            </div>
          </div>
          <div className="text-center">
            <div className="text-muted-foreground">RSI</div>
            <div className={`font-semibold ${rsi > 70 ? 'text-red-600' : rsi < 30 ? 'text-green-600' : 'text-muted-foreground'}`}>
              {rsi.toFixed(0)}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}