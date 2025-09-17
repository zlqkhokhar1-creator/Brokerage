'use client';

import { useState, useEffect, useMemo } from 'react';
import { FixedSizeList as List } from 'react-window';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, Search, Filter, Star } from 'lucide-react';

interface MarketDataItem {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap: number;
  sector: string;
  isWatched: boolean;
}

interface VirtualMarketDataListProps {
  height?: number;
  itemHeight?: number;
}

export function VirtualMarketDataList({ height = 600, itemHeight = 60 }: VirtualMarketDataListProps) {
  const [marketData, setMarketData] = useState<MarketDataItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'price' | 'change' | 'volume' | 'marketCap'>('change');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [sectorFilter, setSectorFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);

  // Generate mock market data
  useEffect(() => {
    const generateMockData = () => {
      const symbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA', 'NFLX', 'AMD', 'INTC'];
      const names = [
        'Apple Inc.', 'Microsoft Corp.', 'Alphabet Inc.', 'Amazon.com Inc.', 'Tesla Inc.',
        'Meta Platforms Inc.', 'NVIDIA Corp.', 'Netflix Inc.', 'Advanced Micro Devices', 'Intel Corp.'
      ];
      const sectors = ['Technology', 'Consumer Discretionary', 'Communication Services', 'Healthcare', 'Financials'];
      
      const data: MarketDataItem[] = symbols.map((symbol, index) => {
        const basePrice = 100 + Math.random() * 500;
        const change = (Math.random() - 0.5) * 20;
        const changePercent = (change / basePrice) * 100;
        
        return {
          symbol,
          name: names[index],
          price: basePrice,
          change,
          changePercent,
          volume: Math.floor(Math.random() * 10000000) + 1000000,
          marketCap: Math.floor(Math.random() * 2000000000000) + 100000000000,
          sector: sectors[Math.floor(Math.random() * sectors.length)],
          isWatched: Math.random() > 0.7
        };
      });

      // Add more data for virtualization demo
      const extendedData = [];
      for (let i = 0; i < 1000; i++) {
        const symbol = `STOCK${i.toString().padStart(4, '0')}`;
        const basePrice = 10 + Math.random() * 200;
        const change = (Math.random() - 0.5) * 10;
        const changePercent = (change / basePrice) * 100;
        
        extendedData.push({
          symbol,
          name: `Stock ${i + 1} Inc.`,
          price: basePrice,
          change,
          changePercent,
          volume: Math.floor(Math.random() * 5000000) + 100000,
          marketCap: Math.floor(Math.random() * 100000000000) + 1000000000,
          sector: sectors[Math.floor(Math.random() * sectors.length)],
          isWatched: Math.random() > 0.9
        });
      }

      setMarketData([...data, ...extendedData]);
      setIsLoading(false);
    };

    generateMockData();
    
    // Update prices every 5 seconds
    const interval = setInterval(() => {
      setMarketData(prev => prev.map(item => {
        const change = (Math.random() - 0.5) * 2;
        const newPrice = Math.max(0.01, item.price + change);
        const changePercent = (change / item.price) * 100;
        
        return {
          ...item,
          price: newPrice,
          change: item.change + change,
          changePercent: item.changePercent + changePercent
        };
      }));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // Filter and sort data
  const filteredAndSortedData = useMemo(() => {
    let filtered = marketData.filter(item => {
      const matchesSearch = item.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           item.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesSector = sectorFilter === 'all' || item.sector === sectorFilter;
      return matchesSearch && matchesSector;
    });

    filtered.sort((a, b) => {
      let aValue: number, bValue: number;
      
      switch (sortBy) {
        case 'price':
          aValue = a.price;
          bValue = b.price;
          break;
        case 'change':
          aValue = a.changePercent;
          bValue = b.changePercent;
          break;
        case 'volume':
          aValue = a.volume;
          bValue = b.volume;
          break;
        case 'marketCap':
          aValue = a.marketCap;
          bValue = b.marketCap;
          break;
        default:
          return 0;
      }

      return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
    });

    return filtered;
  }, [marketData, searchTerm, sortBy, sortOrder, sectorFilter]);

  const toggleWatch = (symbol: string) => {
    setMarketData(prev => prev.map(item => 
      item.symbol === symbol ? { ...item, isWatched: !item.isWatched } : item
    ));
  };

  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const item = filteredAndSortedData[index];
    if (!item) return null;

    const isPositive = item.change >= 0;
    const ChangeIcon = isPositive ? TrendingUp : TrendingDown;
    const changeColor = isPositive ? 'text-green-500' : 'text-red-500';

    return (
      <div style={style} className="px-4 py-2 border-b border-border/50 hover:bg-muted/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => toggleWatch(item.symbol)}
              className="p-1 h-auto"
            >
              <Star 
                className={`h-4 w-4 ${item.isWatched ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`} 
              />
            </Button>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm">{item.symbol}</span>
                <Badge variant="outline" className="text-xs">
                  {item.sector}
                </Badge>
              </div>
              <div className="text-xs text-muted-foreground truncate">
                {item.name}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6 text-sm">
            <div className="text-right">
              <div className="font-mono">${item.price.toFixed(2)}</div>
              <div className={`flex items-center gap-1 ${changeColor}`}>
                <ChangeIcon className="h-3 w-3" />
                <span>{item.changePercent.toFixed(2)}%</span>
              </div>
            </div>
            
            <div className="text-right text-muted-foreground">
              <div>Vol: {(item.volume / 1000000).toFixed(1)}M</div>
              <div>Cap: ${(item.marketCap / 1000000000).toFixed(1)}B</div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Market Data
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Market Data ({filteredAndSortedData.length} stocks)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search stocks..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 border border-input rounded-md bg-background"
            >
              <option value="change">Change %</option>
              <option value="price">Price</option>
              <option value="volume">Volume</option>
              <option value="marketCap">Market Cap</option>
            </select>
            
            <Button
              variant="outline"
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </Button>
            
            <select
              value={sectorFilter}
              onChange={(e) => setSectorFilter(e.target.value)}
              className="px-3 py-2 border border-input rounded-md bg-background"
            >
              <option value="all">All Sectors</option>
              <option value="Technology">Technology</option>
              <option value="Consumer Discretionary">Consumer Discretionary</option>
              <option value="Communication Services">Communication Services</option>
              <option value="Healthcare">Healthcare</option>
              <option value="Financials">Financials</option>
            </select>
          </div>

          {/* Virtual List */}
          <div className="border border-border rounded-lg">
            <List
              height={height}
              itemCount={filteredAndSortedData.length}
              itemSize={itemHeight}
              width="100%"
            >
              {Row}
            </List>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
