import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { 
  Search, 
  TrendingUp, 
  TrendingDown, 
  Star,
  Eye,
  ArrowRight,
  Target,
  PieChart,
  BarChart3
} from 'lucide-react';
import { mockStocks, Stock } from '@/lib/mockData';

interface ExplorePageProps {
  onStockClick: (symbol: string) => void;
}

// Mock data for different categories
const topMovers = {
  gainers: [
    { symbol: 'NVDA', name: 'NVIDIA Corp', price: 1208.88, change: 15.24, changePercent: 1.28 },
    { symbol: 'AMZN', name: 'Amazon.com Inc', price: 153.40, change: 4.82, changePercent: 3.24 },
    { symbol: 'GOOGL', name: 'Alphabet Inc', price: 141.80, change: 2.45, changePercent: 1.76 }
  ],
  losers: [
    { symbol: 'META', name: 'Meta Platforms', price: 484.49, change: -8.21, changePercent: -1.67 },
    { symbol: 'TSLA', name: 'Tesla Inc', price: 248.42, change: -5.33, changePercent: -2.10 },
    { symbol: 'NFLX', name: 'Netflix Inc', price: 614.30, change: -4.15, changePercent: -0.67 }
  ]
};

const sectors = [
  { name: 'Technology', return: '+2.4%', color: 'text-green-600' },
  { name: 'Healthcare', return: '+1.8%', color: 'text-green-600' },
  { name: 'Consumer Discretionary', return: '+1.2%', color: 'text-green-600' },
  { name: 'Financial Services', return: '-0.5%', color: 'text-red-600' },
  { name: 'Energy', return: '-1.2%', color: 'text-red-600' },
  { name: 'Real Estate', return: '-1.8%', color: 'text-red-600' }
];

const trendingStocks = [
  { symbol: 'AI', name: 'C3.ai Inc', mentions: '2.3K', sentiment: 'Bullish' },
  { symbol: 'PLTR', name: 'Palantir Technologies', mentions: '1.8K', sentiment: 'Bullish' },
  { symbol: 'SOFI', name: 'SoFi Technologies', mentions: '1.5K', sentiment: 'Neutral' },
  { symbol: 'AMD', name: 'Advanced Micro Devices', mentions: '1.2K', sentiment: 'Bullish' }
];

export function ExplorePage({ onStockClick }: ExplorePageProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('discover');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatPercent = (percent: number) => {
    return `${percent >= 0 ? '+' : ''}${percent.toFixed(2)}%`;
  };

  const filteredStocks = mockStocks.filter(stock =>
    stock.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
    stock.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <h1 className="text-2xl">Explore</h1>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search stocks, ETFs, or news..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Search Results */}
      {searchQuery && (
        <div className="space-y-2">
          <h3 className="text-lg">Search Results</h3>
          {filteredStocks.slice(0, 5).map((stock) => (
            <Card 
              key={stock.symbol} 
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => onStockClick(stock.symbol)}
            >
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">{stock.symbol}</h4>
                    <p className="text-sm text-muted-foreground truncate max-w-48">{stock.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{formatCurrency(stock.price)}</p>
                    <p className={`text-sm ${stock.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatPercent(stock.changePercent)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Main Content */}
      {!searchQuery && (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="discover">Discover</TabsTrigger>
            <TabsTrigger value="markets">Markets</TabsTrigger>
            <TabsTrigger value="news">News</TabsTrigger>
          </TabsList>

          <TabsContent value="discover" className="space-y-6 mt-6">
            {/* Top Movers */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Top Movers</span>
                  <Button variant="ghost" size="sm">
                    View All <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="gainers" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="gainers">Gainers</TabsTrigger>
                    <TabsTrigger value="losers">Losers</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="gainers" className="space-y-3 mt-4">
                    {topMovers.gainers.map((stock, index) => (
                      <div 
                        key={stock.symbol}
                        className="flex items-center justify-between p-3 hover:bg-muted/50 rounded-lg cursor-pointer transition-colors"
                        onClick={() => onStockClick(stock.symbol)}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-muted-foreground w-4">{index + 1}</span>
                          <div>
                            <p className="font-medium">{stock.symbol}</p>
                            <p className="text-sm text-muted-foreground truncate max-w-32">{stock.name}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{formatCurrency(stock.price)}</p>
                          <div className="flex items-center gap-1 text-green-600">
                            <TrendingUp className="h-3 w-3" />
                            <span className="text-sm">{formatPercent(stock.changePercent)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </TabsContent>
                  
                  <TabsContent value="losers" className="space-y-3 mt-4">
                    {topMovers.losers.map((stock, index) => (
                      <div 
                        key={stock.symbol}
                        className="flex items-center justify-between p-3 hover:bg-muted/50 rounded-lg cursor-pointer transition-colors"
                        onClick={() => onStockClick(stock.symbol)}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-muted-foreground w-4">{index + 1}</span>
                          <div>
                            <p className="font-medium">{stock.symbol}</p>
                            <p className="text-sm text-muted-foreground truncate max-w-32">{stock.name}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{formatCurrency(stock.price)}</p>
                          <div className="flex items-center gap-1 text-red-600">
                            <TrendingDown className="h-3 w-3" />
                            <span className="text-sm">{formatPercent(stock.changePercent)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* Trending Stocks */}
            <Card>
              <CardHeader>
                <CardTitle>Trending Stocks</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {trendingStocks.map((stock) => (
                  <div 
                    key={stock.symbol}
                    className="flex items-center justify-between p-3 hover:bg-muted/50 rounded-lg cursor-pointer transition-colors"
                    onClick={() => onStockClick(stock.symbol)}
                  >
                    <div>
                      <p className="font-medium">{stock.symbol}</p>
                      <p className="text-sm text-muted-foreground">{stock.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm">{stock.mentions} mentions</p>
                      <Badge 
                        variant={stock.sentiment === 'Bullish' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {stock.sentiment}
                      </Badge>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="markets" className="space-y-6 mt-6">
            {/* Market Indices */}
            <Card>
              <CardHeader>
                <CardTitle>Market Indices</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">S&P 500</p>
                    <p className="text-sm text-muted-foreground">SPX</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">4,783.45</p>
                    <div className="flex items-center gap-1 text-green-600">
                      <TrendingUp className="h-3 w-3" />
                      <span className="text-sm">+1.2%</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">NASDAQ Composite</p>
                    <p className="text-sm text-muted-foreground">IXIC</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">14,897.55</p>
                    <div className="flex items-center gap-1 text-green-600">
                      <TrendingUp className="h-3 w-3" />
                      <span className="text-sm">+0.8%</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Dow Jones Industrial Average</p>
                    <p className="text-sm text-muted-foreground">DJI</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">37,863.80</p>
                    <div className="flex items-center gap-1 text-red-600">
                      <TrendingDown className="h-3 w-3" />
                      <span className="text-sm">-0.3%</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Sector Performance */}
            <Card>
              <CardHeader>
                <CardTitle>Sector Performance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {sectors.map((sector) => (
                  <div key={sector.name} className="flex items-center justify-between">
                    <span className="text-sm">{sector.name}</span>
                    <span className={`text-sm ${sector.color}`}>
                      {sector.return}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="news" className="space-y-4 mt-6">
            {/* Market News */}
            <div className="space-y-4">
              {[
                {
                  headline: 'Fed Signals Potential Rate Cuts as Inflation Shows Signs of Cooling',
                  source: 'Reuters',
                  time: '2 hours ago',
                  category: 'Markets'
                },
                {
                  headline: 'Tech Stocks Rally as AI Investments Continue to Drive Growth',
                  source: 'Bloomberg',
                  time: '4 hours ago',
                  category: 'Technology'
                },
                {
                  headline: 'Energy Sector Faces Headwinds Amid Supply Chain Concerns',
                  source: 'Financial Times',
                  time: '6 hours ago',
                  category: 'Energy'
                },
                {
                  headline: 'Healthcare Giants Report Strong Quarterly Earnings',
                  source: 'WSJ',
                  time: '8 hours ago',
                  category: 'Healthcare'
                }
              ].map((article, index) => (
                <Card key={index} className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="space-y-2">
                      <div className="flex items-start justify-between">
                        <h3 className="text-sm leading-5 pr-4">{article.headline}</h3>
                        <Badge variant="secondary" className="text-xs flex-shrink-0">
                          {article.category}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {article.source} • {article.time}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}