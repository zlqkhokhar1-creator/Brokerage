import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Star, TrendingUp, TrendingDown } from 'lucide-react';
import { StockData } from './types';

interface StockCardProps {
  stock: StockData;
  onSave?: (symbol: string) => void;
  isSaved?: boolean;
}

export const StockCard: React.FC<StockCardProps> = ({ stock, onSave, isSaved = false }) => {
  const isPositive = stock.change >= 0;
  const changeColor = isPositive ? 'text-green-500' : 'text-red-500';
  const ChangeIcon = isPositive ? TrendingUp : TrendingDown;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg font-semibold">
              {stock.symbol}
              <span className="text-sm text-muted-foreground ml-2">{stock.exchange}</span>
            </CardTitle>
            <p className="text-sm text-muted-foreground">{stock.name}</p>
          </div>
          {onSave && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onSave(stock.symbol)}
              aria-label={isSaved ? 'Remove from watchlist' : 'Add to watchlist'}
            >
              <Star
                className={`h-5 w-5 ${isSaved ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`}
              />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between items-center">
          <div>
            <p className="text-2xl font-bold">${stock.price.toFixed(2)}</p>
            <div className={`flex items-center ${changeColor}`}>
              <ChangeIcon className="h-4 w-4 mr-1" />
              <span>
                {stock.change.toFixed(2)} ({stock.changePercent.toFixed(2)}%)
              </span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm">P/E: {stock.peRatio?.toFixed(2) || 'N/A'}</p>
            <p className="text-sm">
              Mkt Cap: {new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              }).format(stock.marketCap)}
            </p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-1">
          <Badge variant="outline">{stock.sector}</Badge>
          <Badge variant="outline">Vol: {new Intl.NumberFormat().format(stock.volume)}</Badge>
        </div>
      </CardContent>
    </Card>
  );
});

StockCard.displayName = 'StockCard';
