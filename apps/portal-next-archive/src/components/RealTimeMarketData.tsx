"use client";

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Wifi, 
  WifiOff,
  Search,
  Star,
  StarOff
} from 'lucide-react';

interface MarketData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  timestamp: string;
}

interface WebSocketMessage {
  type: string;
  symbol?: string;
  data?: any;
  status?: string;
  clientId?: string;
}

export default function RealTimeMarketData() {
  const [marketData, setMarketData] = useState<MarketData[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [subscribedSymbols, setSubscribedSymbols] = useState<Set<string>>(new Set());
  const [watchlist, setWatchlist] = useState<Set<string>>(new Set());
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize WebSocket connection
  useEffect(() => {
    connectWebSocket();
    return () => {
      // Cleanup: close WebSocket connection if open
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  // Handler stubs to fix missing references
  function connectWebSocket() {
    // Implement actual WebSocket connection logic here
    // For now, just set isConnected to false
    setIsConnected(false);
  }

  function handleSubscribe() {
    // Implement subscribe logic
  }

  function handleAddToWatchlist(symbol: string) {
    toggleWatchlist(symbol);
  }

  function handleUnsubscribe(symbol: string) {
    unsubscribeFromSymbols([symbol]);
  }

  const handleWebSocketMessage = (message: WebSocketMessage) => {
    switch (message.type) {
      case 'connection':
        console.log('WebSocket connection established:', message.clientId);
        break;
      case 'market_data':
        if (message.symbol && message.data) {
          updateMarketData(message.symbol, message.data);
        }
        break;
      case 'subscription':
        if (message.symbol) {
          setSubscribedSymbols(new Set([message.symbol]));
        }
        break;
      case 'pong':
        // Handle ping-pong for connection health
        break;
    }
  };

  const updateMarketData = (symbol: string, data: any) => {
    setMarketData(prev => {
      const existingIndex = prev.findIndex(item => item.symbol === symbol);
      const newItem = {
        symbol,
        name: prev[existingIndex]?.name || symbol,
        price: data.price,
        change: data.change,
        changePercent: data.changePercent,
        volume: data.volume,
        timestamp: data.timestamp
      };

      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = newItem;
        return updated;
      } else {
        return [...prev, newItem];
      }
    });
  };

  const fetchMarketData = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/market-data/realtime?symbols=AAPL,MSFT,GOOGL,TSLA,SPY,QQQ,BTC,ETH`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setMarketData(data);
      }
    } catch (error) {
      console.error('Error fetching market data:', error);
    }
  };

  const subscribeToSymbols = (symbols: string[]) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'subscribe',
        symbols
      }));
    }
  };

  const unsubscribeFromSymbols = (symbols: string[]) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'unsubscribe',
        symbols
      }));
    }
  };

  const toggleWatchlist = (symbol: string) => {
    setWatchlist(prev => {
      const newWatchlist = new Set(prev);
      if (newWatchlist.has(symbol)) {
        newWatchlist.delete(symbol);
      } else {
        newWatchlist.add(symbol);
      }
      return newWatchlist;
    });
  };

  const filteredData = marketData.filter(item =>
    item.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(price);
  };

  const formatVolume = (volume: number) => {
    if (volume >= 1000000) {
      return `${(volume / 1000000).toFixed(1)}M`;
    } else if (volume >= 1000) {
      return `${(volume / 1000).toFixed(1)}K`;
    }
    return volume.toString();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            Real-Time Market Data
          </h2>
          <p className="text-slate-600 dark:text-slate-300">
            Live market prices and trading activity
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-2">
            {isConnected ? (
              <Wifi className="w-4 h-4 text-green-500" />
            ) : (
              <WifiOff className="w-4 h-4 text-red-500" />
            )}
            <span className="text-sm text-slate-600">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>
      </div>

      {/* Search and Controls */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
          <Input
            placeholder="Search symbols..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button
          variant="outline"
          onClick={() => fetchMarketData()}
          disabled={!isConnected}
        >
          <Activity className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Market Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>Live Market Prices</CardTitle>
          <CardDescription>
            Real-time stock prices and market movements
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium text-slate-600 dark:text-slate-300">
                    Symbol
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600 dark:text-slate-300">
                    Name
                  </th>
                  <th className="text-right py-3 px-4 font-medium text-slate-600 dark:text-slate-300">
                    Price
                  </th>
                  <th className="text-right py-3 px-4 font-medium text-slate-600 dark:text-slate-300">
                    Change
                  </th>
                  <th className="text-right py-3 px-4 font-medium text-slate-600 dark:text-slate-300">
                    Volume
                  </th>
                  <th className="text-center py-3 px-4 font-medium text-slate-600 dark:text-slate-300">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((item) => (
                  <tr key={item.symbol} className="border-b hover:bg-slate-50 dark:hover:bg-slate-800">
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-900 dark:text-white">
                        {item.symbol}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-sm text-slate-600 dark:text-slate-300">
                        {item.name}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="font-medium text-slate-900 dark:text-white">
                        {formatPrice(item.price)}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end space-x-1">
                        {item.change >= 0 ? (
                          <TrendingUp className="w-4 h-4 text-green-500" />
                        ) : (
                          <TrendingDown className="w-4 h-4 text-red-500" />
                        )}
                        <span className={`font-medium ${
                          item.change >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {item.change >= 0 ? '+' : ''}{formatPrice(item.change)}
                        </span>
                        <Badge 
                          variant={item.change >= 0 ? 'default' : 'destructive'}
                          className="ml-2"
                        >
                          {item.changePercent >= 0 ? '+' : ''}{item.changePercent.toFixed(2)}%
                        </Badge>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="text-sm text-slate-600 dark:text-slate-300">
                        {formatVolume(item.volume)}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleWatchlist(item.symbol)}
                      >
                        {watchlist.has(item.symbol) ? (
                          <Star className="w-4 h-4 text-yellow-500 fill-current" />
                        ) : (
                          <StarOff className="w-4 h-4 text-slate-400" />
                        )}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredData.length === 0 && (
            <div className="text-center py-8 text-slate-500">
              No market data available
            </div>
          )}
        </CardContent>
      </Card>

      {/* Watchlist */}
      {watchlist.size > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Your Watchlist</CardTitle>
            <CardDescription>
              Track your favorite stocks and securities
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {Array.from(watchlist).map(symbol => {
                const item = marketData.find(d => d.symbol === symbol);
                return (
                  <div key={symbol} className="flex items-center space-x-2 bg-slate-100 dark:bg-slate-800 rounded-lg px-3 py-2">
                    <span className="font-medium">{symbol}</span>
                    {item && (
                      <>
                        <span className="text-sm text-slate-600">
                          {formatPrice(item.price)}
                        </span>
                        <Badge 
                          variant={item.change >= 0 ? 'default' : 'destructive'}
                          className="text-xs"
                        >
                          {item.changePercent >= 0 ? '+' : ''}{item.changePercent.toFixed(2)}%
                        </Badge>
                      </>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleWatchlist(symbol)}
                    >
                      <StarOff className="w-3 h-3" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}


