import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { TrendingUp, TrendingDown, Search, Star, Plus } from 'lucide-react';
import { mockStocks, Stock } from '@/lib/mockData';

interface WatchlistPageProps {
  onStockClick: (symbol: string) => void;
}

export function WatchlistPage({ onStockClick }: WatchlistPageProps) {
  const [watchlist, setWatchlist] = useState<string[]>(['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA', 'META']);
  const [stocks, setStocks] = useState(mockStocks);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  // Simulate real-time price updates
  useEffect(() => {
    const interval = setInterval(() => {
      setStocks(prevStocks => 
        prevStocks.map(stock => ({
          ...stock,
          price: Number((stock.price * (0.995 + Math.random() * 0.01)).toFixed(2)),
          change: Number(((Math.random() - 0.5) * 2).toFixed(2)),
          changePercent: Number(((Math.random() - 0.5) * 4).toFixed(2))
        }))
      );
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatPercent = (percent: number) => {
    return `${percent >= 0 ? '+' : ''}${percent.toFixed(2)}%`;
  };

  const watchlistStocks = stocks.filter(stock => watchlist.includes(stock.symbol));
  
  const filteredStocks = stocks.filter(stock =>
    !watchlist.includes(stock.symbol) &&
    (stock.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
    stock.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const addToWatchlist = (symbol: string) => {
    setWatchlist(prev => [...prev, symbol]);
    setSearchQuery('');
  };

  const removeFromWatchlist = (symbol: string) => {
    setWatchlist(prev => prev.filter(s => s !== symbol));
  };

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl">Watchlist</h1>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowSearch(!showSearch)}
        >
          {showSearch ? 'Done' : <Plus className="h-5 w-5" />}
        </Button>
      </div>

      {/* Search */}
      {showSearch && (
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search stocks to add..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          
          {searchQuery && (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {filteredStocks.slice(0, 5).map((stock) => (
                <Card key={stock.symbol} className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{stock.symbol}</span>
                          <span className="text-sm text-muted-foreground truncate">{stock.name}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">{formatCurrency(stock.price)}</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => addToWatchlist(stock.symbol)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Watchlist Items */}
      <div className="space-y-3">
        {watchlistStocks.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="space-y-2">
                <Star className="h-12 w-12 mx-auto text-muted-foreground" />
                <h3 className="text-lg">Your watchlist is empty</h3>
                <p className="text-muted-foreground">Add stocks you want to track</p>
                <Button onClick={() => setShowSearch(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Stocks
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          watchlistStocks.map((stock: Stock) => (
            <Card 
              key={stock.symbol} 
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => onStockClick(stock.symbol)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h3 className="font-medium">{stock.symbol}</h3>
                        <p className="text-sm text-muted-foreground truncate max-w-32">{stock.name}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatCurrency(stock.price)}</p>
                        <div className={`flex items-center gap-1 text-sm ${
                          stock.change >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {stock.change >= 0 ? (
                            <TrendingUp className="h-3 w-3" />
                          ) : (
                            <TrendingDown className="h-3 w-3" />
                          )}
                          <span>{formatCurrency(Math.abs(stock.change))}</span>
                          <span>({formatPercent(stock.changePercent)})</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-muted-foreground">
                        <span>Vol: {(stock.volume / 1000000).toFixed(1)}M</span>
                        <span className="ml-3">Cap: {stock.marketCap}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFromWatchlist(stock.symbol);
                        }}
                        className="p-1 h-auto text-muted-foreground hover:text-foreground"
                      >
                        <Star className="h-4 w-4 fill-current" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Market Summary */}
      <Card>
        <CardContent className="p-4">
          <h3 className="font-medium mb-3">Market Summary</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">S&P 500</span>
              <div className="flex items-center gap-2">
                <span className="text-sm">4,783.45</span>
                <Badge variant="default" className="text-xs">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  +1.2%
                </Badge>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm">NASDAQ</span>
              <div className="flex items-center gap-2">
                <span className="text-sm">14,897.55</span>
                <Badge variant="default" className="text-xs">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  +0.8%
                </Badge>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm">Dow Jones</span>
              <div className="flex items-center gap-2">
                <span className="text-sm">37,863.80</span>
                <Badge variant="destructive" className="text-xs">
                  <TrendingDown className="h-3 w-3 mr-1" />
                  -0.3%
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}