"use client";
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Clock, TrendingUp, TrendingDown, Globe, Bell, Filter, Bookmark, Share2 } from 'lucide-react';

interface NewsArticle {
  id: string;
  title: string;
  summary: string;
  source: string;
  category: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  impact: 'high' | 'medium' | 'low';
  timestamp: string;
  url: string;
  symbols: string[];
  imageUrl?: string;
  readTime: number;
}

interface MarketUpdate {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  high: number;
  low: number;
  marketCap: string;
  news_count: number;
}

interface EconomicEvent {
  id: string;
  title: string;
  country: string;
  importance: 'high' | 'medium' | 'low';
  time: string;
  previous: string;
  forecast: string;
  actual?: string;
  impact: string;
}

export default function NewsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedSentiment, setSelectedSentiment] = useState('all');
  
  const [topNews, setTopNews] = useState<NewsArticle[]>([
    {
      id: '1',
      title: 'Federal Reserve Signals Potential Rate Cut in March 2024',
      summary: 'Fed officials indicate growing confidence in inflation control, opening door for monetary policy easing.',
      source: 'Reuters',
      category: 'Economics',
      sentiment: 'positive',
      impact: 'high',
      timestamp: '2024-01-15T14:30:00Z',
      url: '#',
      symbols: ['SPY', 'QQQ', 'IWM'],
      readTime: 3
    },
    {
      id: '2',
      title: 'NVIDIA Reports Record Q4 Earnings, Beats Estimates',
      summary: 'AI chip giant posts 265% revenue growth year-over-year, driven by data center demand.',
      source: 'Bloomberg',
      category: 'Earnings',
      sentiment: 'positive',
      impact: 'high',
      timestamp: '2024-01-15T13:45:00Z',
      url: '#',
      symbols: ['NVDA'],
      readTime: 4
    },
    {
      id: '3',
      title: 'Tesla Faces Production Challenges in Shanghai',
      summary: 'Supply chain disruptions impact Q1 delivery targets, shares down in pre-market trading.',
      source: 'CNBC',
      category: 'Corporate',
      sentiment: 'negative',
      impact: 'medium',
      timestamp: '2024-01-15T12:20:00Z',
      url: '#',
      symbols: ['TSLA'],
      readTime: 2
    },
    {
      id: '4',
      title: 'Crypto Markets Rally on ETF Approval Hopes',
      summary: 'Bitcoin surges past $45,000 as institutional adoption accelerates.',
      source: 'CoinDesk',
      category: 'Crypto',
      sentiment: 'positive',
      impact: 'medium',
      timestamp: '2024-01-15T11:15:00Z',
      url: '#',
      symbols: ['BTC', 'ETH'],
      readTime: 3
    },
    {
      id: '5',
      title: 'Oil Prices Drop on Rising US Inventory Data',
      summary: 'Crude futures fall 3% after unexpected build in strategic petroleum reserves.',
      source: 'MarketWatch',
      category: 'Commodities',
      sentiment: 'negative',
      impact: 'medium',
      timestamp: '2024-01-15T10:30:00Z',
      url: '#',
      symbols: ['USO', 'XOM', 'CVX'],
      readTime: 2
    }
  ]);

  const [marketUpdates, setMarketUpdates] = useState<MarketUpdate[]>([
    {
      symbol: 'SPY',
      price: 485.23,
      change: 5.67,
      changePercent: 1.18,
      volume: 89234567,
      high: 486.12,
      low: 481.45,
      marketCap: '45.2T',
      news_count: 23
    },
    {
      symbol: 'NVDA',
      price: 789.45,
      change: 23.56,
      changePercent: 3.08,
      volume: 45678901,
      high: 792.33,
      low: 765.12,
      marketCap: '1.95T',
      news_count: 15
    },
    {
      symbol: 'TSLA',
      price: 234.78,
      change: -8.23,
      changePercent: -3.39,
      volume: 67890123,
      high: 242.45,
      low: 232.11,
      marketCap: '745B',
      news_count: 12
    },
    {
      symbol: 'AAPL',
      price: 178.92,
      change: 2.34,
      changePercent: 1.33,
      volume: 78901234,
      high: 179.87,
      low: 176.45,
      marketCap: '2.78T',
      news_count: 18
    }
  ]);

  const [economicEvents, setEconomicEvents] = useState<EconomicEvent[]>([
    {
      id: '1',
      title: 'US Consumer Price Index (CPI)',
      country: 'US',
      importance: 'high',
      time: '08:30 EST',
      previous: '3.1%',
      forecast: '3.0%',
      actual: '2.9%',
      impact: 'Market positive reaction expected'
    },
    {
      id: '2',
      title: 'Federal Reserve Interest Rate Decision',
      country: 'US',
      importance: 'high',
      time: '14:00 EST',
      previous: '5.25%',
      forecast: '5.00%',
      impact: 'High volatility expected'
    },
    {
      id: '3',
      title: 'ECB Monetary Policy Statement',
      country: 'EU',
      importance: 'high',
      time: '13:45 CET',
      previous: '4.50%',
      forecast: '4.25%',
      impact: 'EUR volatility expected'
    },
    {
      id: '4',
      title: 'US Non-Farm Payrolls',
      country: 'US',
      importance: 'high',
      time: '08:30 EST',
      previous: '199K',
      forecast: '180K',
      impact: 'Labor market indicator'
    }
  ]);

  const categories = ['all', 'Economics', 'Earnings', 'Corporate', 'Crypto', 'Commodities', 'Technology'];
  const sentiments = ['all', 'positive', 'negative', 'neutral'];

  const filteredNews = topNews.filter(article => {
    const matchesSearch = article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         article.summary.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || article.category === selectedCategory;
    const matchesSentiment = selectedSentiment === 'all' || article.sentiment === selectedSentiment;
    
    return matchesSearch && matchesCategory && matchesSentiment;
  });

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    } else if (diffInMinutes < 1440) {
      return `${Math.floor(diffInMinutes / 60)}h ago`;
    } else {
      return `${Math.floor(diffInMinutes / 1440)}d ago`;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatPercent = (percent: number) => {
    return `${percent >= 0 ? '+' : ''}${percent.toFixed(2)}%`;
  };

  const getChangeColor = (change: number) => {
    return change >= 0 ? 'text-green-400' : 'text-red-400';
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return 'bg-green-500/20 text-green-400';
      case 'negative': return 'bg-red-500/20 text-red-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'bg-red-500/20 text-red-400';
      case 'medium': return 'bg-yellow-500/20 text-yellow-400';
      default: return 'bg-blue-500/20 text-blue-400';
    }
  };

  const getImportanceColor = (importance: string) => {
    switch (importance) {
      case 'high': return 'border-l-red-400 bg-red-500/5';
      case 'medium': return 'border-l-yellow-400 bg-yellow-500/5';
      default: return 'border-l-blue-400 bg-blue-500/5';
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold mb-2">Market News & Updates</h1>
              <p className="text-gray-400">Stay informed with real-time market news and analysis</p>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="outline" size="sm">
                <Bell className="w-4 h-4 mr-2" />
                Alerts
              </Button>
              <Button variant="outline" size="sm">
                <Filter className="w-4 h-4 mr-2" />
                Filters
              </Button>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search news articles..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-[#111111] border-[#1E1E1E]"
              />
            </div>
            <div className="flex gap-2">
              {categories.map((category) => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(category)}
                  className="capitalize"
                >
                  {category}
                </Button>
              ))}
            </div>
          </div>
        </div>

        <Tabs defaultValue="news" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="news">Breaking News</TabsTrigger>
            <TabsTrigger value="markets">Market Movers</TabsTrigger>
            <TabsTrigger value="events">Economic Events</TabsTrigger>
            <TabsTrigger value="analysis">Analysis</TabsTrigger>
          </TabsList>

          <TabsContent value="news" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Featured News */}
              <div className="lg:col-span-2 space-y-6">
                {filteredNews.slice(0, 1).map((article) => (
                  <Card key={article.id} className="bg-[#111111] border-[#1E1E1E]">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className={getSentimentColor(article.sentiment)}>
                            {article.sentiment}
                          </Badge>
                          <Badge className={getImpactColor(article.impact)}>
                            {article.impact} impact
                          </Badge>
                          <span className="text-sm text-gray-400">{article.source}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm">
                            <Bookmark className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Share2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      <h2 className="text-xl font-bold mb-3">{article.title}</h2>
                      <p className="text-gray-300 mb-4">{article.summary}</p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <span className="text-sm text-gray-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatTime(article.timestamp)}
                          </span>
                          <span className="text-sm text-gray-400">{article.readTime} min read</span>
                          <div className="flex gap-1">
                            {article.symbols.map((symbol) => (
                              <Badge key={symbol} variant="outline" className="text-xs">
                                {symbol}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <Button variant="outline" size="sm">
                          Read More
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {/* Other News */}
                <div className="space-y-4">
                  {filteredNews.slice(1).map((article) => (
                    <Card key={article.id} className="bg-[#111111] border-[#1E1E1E]">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge className={getSentimentColor(article.sentiment)}>
                                {article.sentiment}
                              </Badge>
                              <Badge className={getImpactColor(article.impact)}>
                                {article.impact}
                              </Badge>
                              <span className="text-xs text-gray-400">{article.source}</span>
                            </div>
                            <h3 className="font-semibold mb-2 line-clamp-2">{article.title}</h3>
                            <p className="text-sm text-gray-400 mb-3 line-clamp-2">{article.summary}</p>
                            <div className="flex items-center gap-4">
                              <span className="text-xs text-gray-400 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {formatTime(article.timestamp)}
                              </span>
                              <div className="flex gap-1">
                                {article.symbols.slice(0, 2).map((symbol) => (
                                  <Badge key={symbol} variant="outline" className="text-xs">
                                    {symbol}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          </div>
                          <Button variant="ghost" size="sm">
                            <Bookmark className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Trending Symbols */}
                <Card className="bg-[#111111] border-[#1E1E1E]">
                  <CardHeader>
                    <CardTitle className="text-lg">Trending Symbols</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {marketUpdates.slice(0, 4).map((update) => (
                        <div key={update.symbol} className="flex items-center justify-between">
                          <div>
                            <div className="font-semibold">{update.symbol}</div>
                            <div className="text-sm text-gray-400">{update.news_count} articles</div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold">{formatCurrency(update.price)}</div>
                            <div className={`text-sm ${getChangeColor(update.change)}`}>
                              {formatPercent(update.changePercent)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Market Sentiment */}
                <Card className="bg-[#111111] border-[#1E1E1E]">
                  <CardHeader>
                    <CardTitle className="text-lg">Market Sentiment</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-green-400">Bullish</span>
                        <span className="font-semibold">65%</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div className="bg-green-400 h-2 rounded-full" style={{ width: '65%' }}></div>
                      </div>
                      <div className="flex justify-between text-sm text-gray-400">
                        <span>Bearish: 25%</span>
                        <span>Neutral: 10%</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="markets" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {marketUpdates.map((update) => (
                <Card key={update.symbol} className="bg-[#111111] border-[#1E1E1E]">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xl font-bold">{update.symbol}</h3>
                      {update.change >= 0 ? 
                        <TrendingUp className="w-5 h-5 text-green-400" /> : 
                        <TrendingDown className="w-5 h-5 text-red-400" />
                      }
                    </div>
                    <div className="space-y-2">
                      <div className="text-2xl font-bold">{formatCurrency(update.price)}</div>
                      <div className={`text-sm ${getChangeColor(update.change)}`}>
                        {formatCurrency(Math.abs(update.change))} ({formatPercent(update.changePercent)})
                      </div>
                      <div className="text-xs text-gray-400">
                        Vol: {(update.volume / 1000000).toFixed(1)}M
                      </div>
                      <div className="text-xs text-gray-400">
                        Range: {formatCurrency(update.low)} - {formatCurrency(update.high)}
                      </div>
                      <div className="text-xs text-gray-400">
                        {update.news_count} news articles
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="events" className="space-y-6">
            <Card className="bg-[#111111] border-[#1E1E1E]">
              <CardHeader>
                <CardTitle>Today's Economic Events</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {economicEvents.map((event) => (
                    <div 
                      key={event.id} 
                      className={`p-4 border-l-4 rounded-r-lg ${getImportanceColor(event.importance)}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline" className="text-xs">
                              {event.country}
                            </Badge>
                            <Badge className={getImpactColor(event.importance)}>
                              {event.importance}
                            </Badge>
                            <span className="text-sm font-semibold">{event.time}</span>
                          </div>
                          <h4 className="font-semibold mb-2">{event.title}</h4>
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <span className="text-gray-400">Previous:</span>
                              <span className="ml-1">{event.previous}</span>
                            </div>
                            <div>
                              <span className="text-gray-400">Forecast:</span>
                              <span className="ml-1">{event.forecast}</span>
                            </div>
                            {event.actual && (
                              <div>
                                <span className="text-gray-400">Actual:</span>
                                <span className="ml-1 font-semibold text-green-400">{event.actual}</span>
                              </div>
                            )}
                          </div>
                          <p className="text-sm text-gray-400 mt-2">{event.impact}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analysis" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-[#111111] border-[#1E1E1E]">
                <CardHeader>
                  <CardTitle>Market Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-4 border border-[#1E1E1E] rounded-lg">
                      <h4 className="font-semibold mb-2">Technical Outlook</h4>
                      <p className="text-sm text-gray-400">
                        S&P 500 showing bullish momentum with RSI indicating potential continuation. 
                        Key resistance at 4,850 level.
                      </p>
                    </div>
                    <div className="p-4 border border-[#1E1E1E] rounded-lg">
                      <h4 className="font-semibold mb-2">Sector Rotation</h4>
                      <p className="text-sm text-gray-400">
                        Technology leading gains while defensive sectors show weakness. 
                        Growth stocks outperforming value.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-[#111111] border-[#1E1E1E]">
                <CardHeader>
                  <CardTitle>AI-Powered Insights</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-4 border border-[#1E1E1E] rounded-lg">
                      <h4 className="font-semibold mb-2">Sentiment Analysis</h4>
                      <p className="text-sm text-gray-400">
                        Overall market sentiment remains positive with 65% bullish bias. 
                        Fed policy shift driving optimism.
                      </p>
                    </div>
                    <div className="p-4 border border-[#1E1E1E] rounded-lg">
                      <h4 className="font-semibold mb-2">News Impact Score</h4>
                      <p className="text-sm text-gray-400">
                        High impact events in focus: Fed decision (95%), NVDA earnings (87%), 
                        CPI data (82%).
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
