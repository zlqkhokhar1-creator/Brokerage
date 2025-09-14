"use client";
import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  ArrowLeft, 
  TrendingUp, 
  TrendingDown,
  Star,
  Plus,
  Minus,
  BarChart3,
  Maximize2
} from 'lucide-react';
import { mockStocks, Stock } from '@/lib/mockData';
import { Input } from './ui/input';
import { AdvancedChart } from './charts/AdvancedChart';
import { FullScreenChart } from './charts/FullScreenChart';
import { AnalyticsPanel } from './charts/AnalyticsPanel';
import { MobileChart } from './charts/MobileChart';
import { TechnicalSummary } from './charts/TechnicalSummary';
import { generateEnhancedChartData, generateTimeframeData } from '@/lib/chartData';

interface StockDetailsProps {
  symbol: string;
  onNavigate: (page: 'dashboard') => void;
  onBack: () => void;
}



// Mock news data
const mockNews = [
  {
    id: '1',
    headline: 'Strong Q4 earnings beat expectations',
    summary: 'Company reports record revenue growth and positive outlook for next quarter.',
    timestamp: '2 hours ago',
    source: 'Financial Times'
  },
  {
    id: '2',
    headline: 'New product line announcement drives investor interest',
    summary: 'Market responds positively to innovative technology reveal at recent conference.',
    timestamp: '5 hours ago',
    source: 'MarketWatch'
  },
  {
    id: '3',
    headline: 'Analyst upgrades stock rating to Buy',
    summary: 'Major investment firm raises price target citing strong fundamentals.',
    timestamp: '1 day ago',
    source: 'Bloomberg'
  }
];

// Mock analyst ratings
const mockAnalystData = {
  strongBuy: 8,
  buy: 12,
  hold: 5,
  sell: 2,
  strongSell: 1,
  averageTarget: 195.50,
  highTarget: 225.00,
  lowTarget: 160.00
};

export function StockDetails({ symbol, onNavigate, onBack }: StockDetailsProps) {
  const [stock, setStock] = useState<Stock | null>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [isWatchlisted, setIsWatchlisted] = useState(false);
  const [tradeShares, setTradeShares] = useState('');
  const [showFullScreenChart, setShowFullScreenChart] = useState(false);

  useEffect(() => {
    const stockData = mockStocks.find(s => s.symbol === symbol);
    if (stockData) {
      setStock(stockData);
      const enhancedData = generateEnhancedChartData(stockData.price, 120);
      setChartData(enhancedData);
    }
  }, [symbol]);

  // Simulate real-time price updates
  useEffect(() => {
    if (!stock) return;
    
    const interval = setInterval(() => {
      setStock(prev => {
        if (!prev) return prev;
        const newPrice = prev.price * (0.998 + Math.random() * 0.004);
        const change = newPrice - prev.price;
        return {
          ...prev,
          price: Number(newPrice.toFixed(2)),
          change: Number(change.toFixed(2)),
          changePercent: Number(((change / prev.price) * 100).toFixed(2))
        };
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [stock]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatPercent = (percent: number) => {
    return `${percent >= 0 ? '+' : ''}${percent.toFixed(2)}%`;
  };

  const formatVolume = (volume: number) => {
    if (volume >= 1000000) {
      return `${(volume / 1000000).toFixed(1)}M`;
    }
    return `${(volume / 1000).toFixed(0)}K`;
  };

  if (!stock) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Navigation */}
      <nav className="border-b border-border/50 bg-card/80 backdrop-blur-xl sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Button variant="ghost" onClick={onBack} className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
            <div className="flex items-center">
              <TrendingUp className="h-6 w-6 text-primary" />
              <span className="ml-2 text-lg text-primary">InvestPro</span>
            </div>
            <div></div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stock Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl">{stock.symbol}</h1>
                <Button
                  variant={isWatchlisted ? "default" : "outline"}
                  size="sm"
                  onClick={() => setIsWatchlisted(!isWatchlisted)}
                >
                  <Star className={`h-4 w-4 mr-1 ${isWatchlisted ? 'fill-current' : ''}`} />
                  {isWatchlisted ? 'Watching' : 'Watch'}
                </Button>
              </div>
              <p className="text-muted-foreground">{stock.name}</p>
            </div>
            
            <div className="text-right">
              <div className="text-3xl mb-1">{formatCurrency(stock.price)}</div>
              <div className={`flex items-center justify-end gap-2 ${stock.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {stock.change >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                <span>{formatCurrency(Math.abs(stock.change))} ({formatPercent(stock.changePercent)})</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Chart & Analysis */}
          <div className="lg:col-span-2 space-y-6">
            {/* Responsive Chart - Mobile vs Desktop */}
            <div className="block md:hidden space-y-4">
              <MobileChart
                data={chartData}
                symbol={symbol}
                currentPrice={stock.price}
                change={stock.change}
                onFullScreen={() => setShowFullScreenChart(true)}
              />
              <TechnicalSummary
                data={chartData}
                currentPrice={stock.price}
              />
            </div>
            <div className="hidden md:block">
              <AdvancedChart
                data={chartData}
                symbol={symbol}
                currentPrice={stock.price}
                onFullScreen={() => setShowFullScreenChart(true)}
              />
            </div>

            {/* Analytics Panel */}
            <div className="hidden lg:block">
              <AnalyticsPanel
                data={chartData}
                symbol={symbol}
                currentPrice={stock.price}
                marketCap={stock.marketCap}
                volume={stock.volume}
              />
            </div>

            {/* Tabs for different data views */}
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="news">News</TabsTrigger>
                <TabsTrigger value="analysts">Analysts</TabsTrigger>
                <TabsTrigger value="financials">Financials</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Key Statistics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Market Cap</p>
                        <p className="text-lg">{stock.marketCap}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Volume</p>
                        <p className="text-lg">{formatVolume(stock.volume)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">P/E Ratio</p>
                        <p className="text-lg">24.5</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">52W High</p>
                        <p className="text-lg">{formatCurrency(stock.price * 1.25)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">52W Low</p>
                        <p className="text-lg">{formatCurrency(stock.price * 0.75)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Avg Volume</p>
                        <p className="text-lg">{formatVolume(stock.volume * 0.8)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Beta</p>
                        <p className="text-lg">1.12</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">EPS</p>
                        <p className="text-lg">{formatCurrency(stock.price / 24.5)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="news" className="space-y-4">
                {mockNews.map((article) => (
                  <Card key={article.id}>
                    <CardContent className="pt-6">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="text-lg mb-2">{article.headline}</h3>
                        <span className="text-sm text-muted-foreground">{article.timestamp}</span>
                      </div>
                      <p className="text-muted-foreground mb-2">{article.summary}</p>
                      <p className="text-sm text-muted-foreground">Source: {article.source}</p>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>

              <TabsContent value="analysts" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Analyst Ratings</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="mb-4">Rating Distribution</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span>Strong Buy</span>
                            <span>{mockAnalystData.strongBuy}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Buy</span>
                            <span>{mockAnalystData.buy}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Hold</span>
                            <span>{mockAnalystData.hold}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Sell</span>
                            <span>{mockAnalystData.sell}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Strong Sell</span>
                            <span>{mockAnalystData.strongSell}</span>
                          </div>
                        </div>
                      </div>
                      <div>
                        <h4 className="mb-4">Price Targets</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span>Average Target</span>
                            <span>{formatCurrency(mockAnalystData.averageTarget)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>High Target</span>
                            <span>{formatCurrency(mockAnalystData.highTarget)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Low Target</span>
                            <span>{formatCurrency(mockAnalystData.lowTarget)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="financials" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Financial Highlights</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="mb-4">Revenue (TTM)</h4>
                        <p className="text-2xl mb-2">$394.3B</p>
                        <p className="text-sm text-green-600">+8.1% YoY</p>
                      </div>
                      <div>
                        <h4 className="mb-4">Net Income (TTM)</h4>
                        <p className="text-2xl mb-2">$100.9B</p>
                        <p className="text-sm text-green-600">+5.4% YoY</p>
                      </div>
                      <div>
                        <h4 className="mb-4">Gross Margin</h4>
                        <p className="text-2xl mb-2">43.9%</p>
                        <p className="text-sm text-muted-foreground">vs Industry: 41.2%</p>
                      </div>
                      <div>
                        <h4 className="mb-4">ROE</h4>
                        <p className="text-2xl mb-2">160.6%</p>
                        <p className="text-sm text-green-600">Excellent</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Right Column - Trading */}
          <div className="space-y-6">
            {/* Quick Trade */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Trade</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm mb-2 block">Shares</label>
                  <Input
                    type="number"
                    placeholder="Enter number of shares"
                    value={tradeShares}
                    onChange={(e) => setTradeShares(e.target.value)}
                  />
                </div>

                {tradeShares && (
                  <div className="text-sm text-muted-foreground">
                    Total: {formatCurrency(parseInt(tradeShares || '0') * stock.price)}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <Button className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Buy
                  </Button>
                  <Button variant="destructive" className="w-full">
                    <Minus className="h-4 w-4 mr-2" />
                    Sell
                  </Button>
                </div>

                <Button variant="outline" className="w-full">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Advanced Order
                </Button>
              </CardContent>
            </Card>

            {/* Market Hours */}
            <Card>
              <CardHeader>
                <CardTitle>Market Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-2">
                  <span>Market Status</span>
                  <Badge variant="default">Open</Badge>
                </div>
                <div className="text-sm text-muted-foreground">
                  <p>Regular Hours: 9:30 AM - 4:00 PM EST</p>
                  <p>Pre-Market: 4:00 AM - 9:30 AM EST</p>
                  <p>After Hours: 4:00 PM - 8:00 PM EST</p>
                </div>
              </CardContent>
            </Card>

            {/* Similar Stocks */}
            <Card>
              <CardHeader>
                <CardTitle>Similar Stocks</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {mockStocks.filter(s => s.symbol !== stock.symbol).slice(0, 4).map((similarStock) => (
                    <div
                      key={similarStock.symbol}
                      className="flex items-center justify-between p-2 rounded hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => window.location.reload()} // Simplified for demo
                    >
                      <div>
                        <p className="text-sm">{similarStock.symbol}</p>
                        <p className="text-xs text-muted-foreground">{formatCurrency(similarStock.price)}</p>
                      </div>
                      <Badge variant={similarStock.change >= 0 ? "default" : "destructive"} className="text-xs">
                        {formatPercent(similarStock.changePercent)}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Full Screen Chart Modal */}
        <FullScreenChart
          isOpen={showFullScreenChart}
          onClose={() => setShowFullScreenChart(false)}
          data={chartData}
          symbol={symbol}
          currentPrice={stock.price}
        />
      </div>
    </div>
  );
}