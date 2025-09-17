'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Loader2 } from 'lucide-react';

interface MarketDataProps {
  symbol: string;
}

export function SimpleMarketData({ symbol }: MarketDataProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/trading/${symbol}`);
        if (!response.ok) throw new Error('Failed to fetch');
        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [symbol]);

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading {symbol}...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="h-6 bg-muted animate-pulse rounded" />
            <div className="h-4 bg-muted animate-pulse rounded w-1/2" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-red-500">Error</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-500">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const isPositive = data.change >= 0;
  const ChangeIcon = isPositive ? TrendingUp : TrendingDown;
  const changeColor = isPositive ? 'text-green-500' : 'text-red-500';

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{data.symbol}</span>
          <div className="flex items-center gap-1">
            <ChangeIcon className={`h-4 w-4 ${changeColor}`} />
            <span className={`text-sm ${changeColor}`}>
              {isPositive ? '+' : ''}{data.changePercent.toFixed(2)}%
            </span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-2xl font-bold">${data.price.toFixed(2)}</span>
            <span className={`text-sm ${changeColor}`}>
              {isPositive ? '+' : ''}${data.change.toFixed(2)}
            </span>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Volume:</span>
              <div className="font-medium">{data.volume.toLocaleString()}</div>
            </div>
            <div>
              <span className="text-muted-foreground">Last Updated:</span>
              <div className="font-medium">
                {new Date(data.timestamp).toLocaleTimeString()}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
