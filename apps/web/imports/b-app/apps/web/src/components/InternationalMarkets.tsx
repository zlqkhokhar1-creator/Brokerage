import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Globe, 
  TrendingUp, 
  TrendingDown, 
  Clock,
  DollarSign,
  BarChart3,
  Search,
  Filter,
  RefreshCw,
  MapPin,
  Calendar,
  AlertCircle
} from 'lucide-react';

interface MarketData {
  market: string;
  country: string;
  currency: string;
  index: string;
  currentValue: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap: number;
  status: 'OPEN' | 'CLOSED' | 'PRE_MARKET' | 'AFTER_HOURS';
  timezone: string;
  openTime: string;
  closeTime: string;
  lastUpdate: string;
}

interface InternationalStock {
  symbol: string;
  name: string;
  market: string;
  currency: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap: number;
  sector: string;
  pe: number;
  dividend: number;
}

interface CurrencyRate {
  from: string;
  to: string;
  rate: number;
  change: number;
  changePercent: number;
  lastUpdate: string;
}

interface MarketHours {
  market: string;
  timezone: string;
  currentTime: string;
  status: 'OPEN' | 'CLOSED' | 'PRE_MARKET' | 'AFTER_HOURS';
  nextOpen?: string;
  nextClose?: string;
  tradingHours: {
    open: string;
    close: string;
  };
}

interface NewsItem {
  id: string;
  title: string;
  summary: string;
  source: string;
  timestamp: string;
  market: string;
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
  category: 'ECONOMIC' | 'POLITICAL' | 'CORPORATE' | 'REGULATORY';
}

const InternationalMarkets: React.FC = () => {
  const [markets, setMarkets] = useState<MarketData[]>([]);
  const [stocks, setStocks] = useState<InternationalStock[]>([]);
  const [currencies, setCurrencies] = useState<CurrencyRate[]>([]);
  const [marketHours, setMarketHours] = useState<MarketHours[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMarket, setSelectedMarket] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchInternationalData();
  }, [selectedMarket]);

  const fetchInternationalData = async () => {
    try {
      setLoading(true);
      
      // Fetch international markets data
      const marketsResponse = await fetch('/api/v1/markets/international', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (marketsResponse.ok) {
        const marketsData = await marketsResponse.json();
        setMarkets(marketsData.data || []);
      }

      // Fetch international stocks
      const stocksResponse = await fetch(`/api/v1/markets/international/stocks${selectedMarket !== 'ALL' ? `?market=${selectedMarket}` : ''}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (stocksResponse.ok) {
        const stocksData = await stocksResponse.json();
        setStocks(stocksData.data || []);
      }

      // Fetch currency rates
      const currenciesResponse = await fetch('/api/v1/markets/currencies', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (currenciesResponse.ok) {
        const currenciesData = await currenciesResponse.json();
        setCurrencies(currenciesData.data || []);
      }

      // Fetch market hours
      const hoursResponse = await fetch('/api/v1/markets/hours', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (hoursResponse.ok) {
        const hoursData = await hoursResponse.json();
        setMarketHours(hoursData.data || []);
      }

      // Fetch international news
      const newsResponse = await fetch('/api/v1/markets/international/news', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (newsResponse.ok) {
        const newsData = await newsResponse.json();
        setNews(newsData.data || []);
      }

    } catch (error) {
      console.error('Error fetching international markets data:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    setRefreshing(true);
    await fetchInternationalData();
    setRefreshing(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN': return 'text-green-600 bg-green-50 border-green-200';
      case 'CLOSED': return 'text-red-600 bg-red-50 border-red-200';
      case 'PRE_MARKET':
      case 'AFTER_HOURS': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'HIGH': return 'text-red-600 bg-red-50';
      case 'MEDIUM': return 'text-yellow-600 bg-yellow-50';
      case 'LOW': return 'text-blue-600 bg-blue-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const filteredStocks = stocks.filter(stock =>
    stock.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
    stock.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading international markets...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Globe className="w-8 h-8 text-blue-500" />
            International Markets
          </h1>
          <p className="text-muted-foreground">Global market data and trading opportunities</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search stocks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
          <Select value={selectedMarket} onValueChange={setSelectedMarket}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Markets</SelectItem>
              <SelectItem value="NYSE">US (NYSE)</SelectItem>
              <SelectItem value="LSE">UK (LSE)</SelectItem>
              <SelectItem value="TSE">Japan (TSE)</SelectItem>
              <SelectItem value="HKEX">Hong Kong</SelectItem>
              <SelectItem value="SSE">China (SSE)</SelectItem>
              <SelectItem value="BSE">India (BSE)</SelectItem>
              <SelectItem value="FWB">Germany (FWB)</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={refreshData} disabled={refreshing} variant="outline">
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Market Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {markets.slice(0, 4).map((market, index) => (
          <Card key={index}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <MapPin className="w-4 h-4 text-gray-500" />
                  <span className="font-semibold">{market.country}</span>
                </div>
                <Badge className={getStatusColor(market.status)} variant="outline">
                  {market.status.replace('_', ' ')}
                </Badge>
              </div>
              
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">{market.index}</p>
                <p className="text-lg font-bold">{market.currentValue.toLocaleString()}</p>
                <div className="flex items-center space-x-1">
                  {market.change >= 0 ? (
                    <TrendingUp className="w-4 h-4 text-green-500" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-red-500" />
                  )}
                  <span className={`text-sm font-medium ${market.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {market.change >= 0 ? '+' : ''}{market.change.toFixed(2)} ({market.changePercent.toFixed(2)}%)
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="markets" className="space-y-4">
        <TabsList>
          <TabsTrigger value="markets">Market Overview</TabsTrigger>
          <TabsTrigger value="stocks">International Stocks</TabsTrigger>
          <TabsTrigger value="currencies">Currency Rates</TabsTrigger>
          <TabsTrigger value="hours">Market Hours</TabsTrigger>
          <TabsTrigger value="news">Global News</TabsTrigger>
        </TabsList>

        <TabsContent value="markets" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {markets.map((market, index) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <MapPin className="w-5 h-5" />
                      <span>{market.country} - {market.market}</span>
                    </div>
                    <Badge className={getStatusColor(market.status)} variant="outline">
                      {market.status.replace('_', ' ')}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">{market.index}</p>
                        <p className="text-2xl font-bold">{market.currentValue.toLocaleString()}</p>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center space-x-1">
                          {market.change >= 0 ? (
                            <TrendingUp className="w-5 h-5 text-green-500" />
                          ) : (
                            <TrendingDown className="w-5 h-5 text-red-500" />
                          )}
                          <span className={`font-semibold ${market.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {market.change >= 0 ? '+' : ''}{market.change.toFixed(2)}
                          </span>
                        </div>
                        <p className={`text-sm ${market.changePercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          ({market.changePercent >= 0 ? '+' : ''}{market.changePercent.toFixed(2)}%)
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Volume</p>
                        <p className="font-semibold">{(market.volume / 1000000).toFixed(1)}M</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Market Cap</p>
                        <p className="font-semibold">${(market.marketCap / 1000000000).toFixed(1)}B</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Currency</p>
                        <p className="font-semibold">{market.currency}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Timezone</p>
                        <p className="font-semibold">{market.timezone}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Trading Hours:</span>
                      <span className="font-medium">{market.openTime} - {market.closeTime}</span>
                    </div>

                    <div className="text-xs text-muted-foreground">
                      Last updated: {new Date(market.lastUpdate).toLocaleString()}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="stocks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>International Stocks</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {filteredStocks.map((stock, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div>
                        <div className="flex items-center space-x-2">
                          <p className="font-semibold">{stock.symbol}</p>
                          <Badge variant="outline" className="text-xs">{stock.market}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{stock.name}</p>
                        <p className="text-xs text-muted-foreground">{stock.sector}</p>
                      </div>
                    </div>

                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Price ({stock.currency})</p>
                      <p className="font-semibold">{stock.price.toFixed(2)}</p>
                    </div>

                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Change</p>
                      <div className="flex items-center space-x-1">
                        {stock.change >= 0 ? (
                          <TrendingUp className="w-4 h-4 text-green-500" />
                        ) : (
                          <TrendingDown className="w-4 h-4 text-red-500" />
                        )}
                        <span className={`text-sm font-medium ${stock.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {stock.changePercent.toFixed(2)}%
                        </span>
                      </div>
                    </div>

                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Volume</p>
                      <p className="text-sm font-medium">{(stock.volume / 1000).toFixed(0)}K</p>
                    </div>

                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">P/E</p>
                      <p className="text-sm font-medium">{stock.pe ? stock.pe.toFixed(1) : 'N/A'}</p>
                    </div>

                    <Button size="sm" variant="outline">
                      Trade
                    </Button>
                  </div>
                ))}

                {filteredStocks.length === 0 && (
                  <div className="text-center py-8">
                    <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-muted-foreground">No stocks found</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="currencies" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Currency Exchange Rates</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {currencies.map((currency, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-lg">{currency.from}/{currency.to}</h4>
                      <div className="flex items-center space-x-1">
                        {currency.change >= 0 ? (
                          <TrendingUp className="w-4 h-4 text-green-500" />
                        ) : (
                          <TrendingDown className="w-4 h-4 text-red-500" />
                        )}
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Rate</span>
                        <span className="font-semibold">{currency.rate.toFixed(4)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Change</span>
                        <span className={`text-sm font-medium ${currency.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {currency.change >= 0 ? '+' : ''}{currency.change.toFixed(4)} ({currency.changePercent.toFixed(2)}%)
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Updated: {new Date(currency.lastUpdate).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="hours" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Global Market Hours</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {marketHours.map((hours, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold">{hours.market}</h4>
                      <Badge className={getStatusColor(hours.status)} variant="outline">
                        {hours.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Timezone</span>
                        <span className="font-medium">{hours.timezone}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Current Time</span>
                        <span className="font-medium">{hours.currentTime}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Trading Hours</span>
                        <span className="font-medium">{hours.tradingHours.open} - {hours.tradingHours.close}</span>
                      </div>
                      
                      {hours.status === 'CLOSED' && hours.nextOpen && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Next Open</span>
                          <span className="font-medium text-green-600">{hours.nextOpen}</span>
                        </div>
                      )}
                      
                      {hours.status === 'OPEN' && hours.nextClose && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Closes At</span>
                          <span className="font-medium text-red-600">{hours.nextClose}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="news" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Global Market News</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {news.map((item) => (
                  <div key={item.id} className="p-4 border rounded-lg">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <Badge className={getImpactColor(item.impact)} variant="outline">
                          {item.impact} Impact
                        </Badge>
                        <Badge variant="secondary">{item.category}</Badge>
                        <Badge variant="outline">{item.market}</Badge>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {new Date(item.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                    
                    <h4 className="font-semibold mb-2">{item.title}</h4>
                    <p className="text-sm text-muted-foreground mb-3">{item.summary}</p>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Source: {item.source}</span>
                      <Button size="sm" variant="outline">
                        Read More
                      </Button>
                    </div>
                  </div>
                ))}

                {news.length === 0 && (
                  <div className="text-center py-8">
                    <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-muted-foreground">No news available</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default InternationalMarkets;
