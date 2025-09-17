'use client';

import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Filter, 
  TrendingUp, 
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  Activity,
  RefreshCw,
  Settings,
  Star,
  Eye,
  EyeOff,
  MoreVertical,
  Clock,
  DollarSign,
  Target,
  PieChart,
  AlertCircle,
  CheckCircle,
  Info
} from 'lucide-react';
import { useState } from 'react';

const marketIndices = [
  { 
    name: 'S&P 500', 
    symbol: 'SPX',
    value: '4,567.89', 
    change: '+1.23%', 
    changeValue: '+55.67',
    isPositive: true,
    volume: '2.1B'
  },
  { 
    name: 'Dow Jones', 
    symbol: 'DJI',
    value: '34,567.89', 
    change: '+0.45%', 
    changeValue: '+154.32',
    isPositive: true,
    volume: '1.8B'
  },
  { 
    name: 'Nasdaq', 
    symbol: 'IXIC',
    value: '14,234.56', 
    change: '-0.12%', 
    changeValue: '-17.89',
    isPositive: false,
    volume: '3.2B'
  },
  { 
    name: 'Russell 2000', 
    symbol: 'RUT',
    value: '2,123.45', 
    change: '+0.78%', 
    changeValue: '+16.45',
    isPositive: true,
    volume: '890M'
  },
];

const topGainers = [
  { 
    symbol: 'NVDA', 
    name: 'NVIDIA Corp.', 
    price: '432.12', 
    change: '+8.45%', 
    changeValue: '+33.67',
    volume: '45.2M',
    marketCap: '1.07T',
    positive: true 
  },
  { 
    symbol: 'TSLA', 
    name: 'Tesla Inc.', 
    price: '245.67', 
    change: '+5.23%', 
    changeValue: '+12.19',
    volume: '32.1M',
    marketCap: '780B',
    positive: true 
  },
  { 
    symbol: 'AAPL', 
    name: 'Apple Inc.', 
    price: '175.43', 
    change: '+3.45%', 
    changeValue: '+5.85',
    volume: '28.7M',
    marketCap: '2.75T',
    positive: true 
  },
  { 
    symbol: 'MSFT', 
    name: 'Microsoft Corp.', 
    price: '335.89', 
    change: '+2.67%', 
    changeValue: '+8.73',
    volume: '25.4M',
    marketCap: '2.49T',
    positive: true 
  },
  { 
    symbol: 'GOOGL', 
    name: 'Alphabet Inc.', 
    price: '123.45', 
    change: '+1.89%', 
    changeValue: '+2.28',
    volume: '18.3M',
    marketCap: '1.58T',
    positive: true 
  },
];

const topLosers = [
  { 
    symbol: 'META', 
    name: 'Meta Platforms', 
    price: '345.67', 
    change: '-4.23%', 
    changeValue: '-15.28',
    volume: '18.3M',
    marketCap: '890B',
    positive: false 
  },
  { 
    symbol: 'NFLX', 
    name: 'Netflix Inc.', 
    price: '456.78', 
    change: '-3.12%', 
    changeValue: '-14.69',
    volume: '15.7M',
    marketCap: '200B',
    positive: false 
  },
  { 
    symbol: 'AMZN', 
    name: 'Amazon.com', 
    price: '134.56', 
    change: '-2.89%', 
    changeValue: '-4.01',
    volume: '22.1M',
    marketCap: '1.42T',
    positive: false 
  },
  { 
    symbol: 'UBER', 
    name: 'Uber Technologies', 
    price: '45.23', 
    change: '-2.15%', 
    changeValue: '-0.99',
    volume: '12.8M',
    marketCap: '95B',
    positive: false 
  },
];

const sectorPerformance = [
  { name: 'Technology', change: '+2.34%', positive: true, weight: 28.5 },
  { name: 'Healthcare', change: '+1.67%', positive: true, weight: 13.2 },
  { name: 'Financials', change: '-0.45%', positive: false, weight: 11.8 },
  { name: 'Energy', change: '+3.12%', positive: true, weight: 4.1 },
  { name: 'Consumer Discretionary', change: '+0.89%', positive: true, weight: 12.3 },
  { name: 'Industrials', change: '-1.23%', positive: false, weight: 8.7 },
  { name: 'Consumer Staples', change: '+0.45%', positive: true, weight: 6.9 },
  { name: 'Utilities', change: '-0.78%', positive: false, weight: 3.2 },
  { name: 'Real Estate', change: '+0.23%', positive: true, weight: 2.8 },
  { name: 'Materials', change: '-0.56%', positive: false, weight: 2.4 },
];

export default function MarketsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [showFilters, setShowFilters] = useState(false);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'gainers', label: 'Top Gainers', icon: TrendingUp },
    { id: 'losers', label: 'Top Losers', icon: TrendingDown },
    { id: 'sectors', label: 'Sectors', icon: PieChart },
  ];

  const filteredGainers = topGainers.filter(stock => 
    stock.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
    stock.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredLosers = topLosers.filter(stock => 
    stock.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
    stock.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Professional Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-heading-1 text-foreground mb-2">Market Analysis</h1>
            <p className="text-body-large text-muted-foreground">
              Real-time market data and comprehensive analysis tools
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
            <Button variant="outline" size="sm" className="gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </Button>
          </div>
        </div>

        {/* Market Status Banner */}
        <Card className="border-success/20 bg-success/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
                <span className="font-medium text-success">Markets Open</span>
                <span className="text-sm text-muted-foreground">• Live trading until 4:00 PM ET</span>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>Last Update: 2:34 PM</span>
                <Badge variant="success" size="sm">Live</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Market Indices */}
        <Card className="card-professional">
          <CardHeader>
            <CardTitle className="text-xl">Market Indices</CardTitle>
            <CardDescription>Major market benchmarks and their performance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {marketIndices.map((index, i) => (
                <div key={i} className="p-6 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-semibold text-foreground">{index.name}</p>
                      <p className="text-sm text-muted-foreground">{index.symbol}</p>
                    </div>
                    <Badge variant={index.isPositive ? 'success' : 'destructive'} size="sm">
                      {index.isPositive ? 'Gain' : 'Loss'}
                    </Badge>
                  </div>
                  <p className="text-2xl font-bold text-foreground mb-2">{index.value}</p>
                  <div className="flex items-center gap-1">
                    {index.isPositive ? (
                      <ArrowUpRight className="h-4 w-4 text-success" />
                    ) : (
                      <ArrowDownRight className="h-4 w-4 text-destructive" />
                    )}
                    <span className={`text-sm font-medium ${index.isPositive ? 'text-success' : 'text-destructive'}`}>
                      {index.change}
                    </span>
                    <span className={`text-sm ${index.isPositive ? 'text-success' : 'text-destructive'}`}>
                      ({index.changeValue})
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">Vol: {index.volume}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Search and Filter */}
        <div className="flex items-center gap-4">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search stocks, symbols..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <Button 
            variant="outline" 
            onClick={() => setShowFilters(!showFilters)}
            className="gap-2"
          >
            <Filter className="h-4 w-4" />
            Filters
          </Button>
        </div>

        {/* Professional Tab Navigation */}
        <div className="flex space-x-1 bg-muted/30 p-1 rounded-lg">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Top Gainers */}
            <Card className="card-professional">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl">Top Gainers</CardTitle>
                    <CardDescription>Today's biggest winners</CardDescription>
                  </div>
                  <Badge variant="success" size="sm">Live</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {topGainers.slice(0, 5).map((stock, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-4 hover:bg-muted/50 rounded-lg transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                          <span className="font-bold text-sm">{stock.symbol.slice(0, 2)}</span>
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{stock.symbol}</p>
                          <p className="text-sm text-muted-foreground">{stock.name}</p>
                          <p className="text-xs text-muted-foreground">MCap: {stock.marketCap}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-foreground">${stock.price}</p>
                        <div className="flex items-center gap-1">
                          <ArrowUpRight className="h-4 w-4 text-success" />
                          <span className="text-sm font-medium text-success">{stock.change}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">Vol: {stock.volume}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Top Losers */}
            <Card className="card-professional">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl">Top Losers</CardTitle>
                    <CardDescription>Today's biggest decliners</CardDescription>
                  </div>
                  <Badge variant="destructive" size="sm">Live</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {topLosers.slice(0, 5).map((stock, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-4 hover:bg-muted/50 rounded-lg transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                          <span className="font-bold text-sm">{stock.symbol.slice(0, 2)}</span>
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{stock.symbol}</p>
                          <p className="text-sm text-muted-foreground">{stock.name}</p>
                          <p className="text-xs text-muted-foreground">MCap: {stock.marketCap}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-foreground">${stock.price}</p>
                        <div className="flex items-center gap-1">
                          <ArrowDownRight className="h-4 w-4 text-destructive" />
                          <span className="text-sm font-medium text-destructive">{stock.change}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">Vol: {stock.volume}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Top Gainers Tab */}
        {activeTab === 'gainers' && (
          <Card className="card-professional">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl">Top Gainers</CardTitle>
                  <CardDescription>Stocks with the highest percentage gains today</CardDescription>
                </div>
                <Badge variant="success" size="sm">Live Data</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {filteredGainers.map((stock, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 hover:bg-muted/50 rounded-lg transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-muted rounded-xl flex items-center justify-center">
                        <span className="font-bold text-lg">{stock.symbol.slice(0, 2)}</span>
                      </div>
                      <div>
                        <p className="font-semibold text-foreground text-lg">{stock.symbol}</p>
                        <p className="text-sm text-muted-foreground">{stock.name}</p>
                        <p className="text-xs text-muted-foreground">Market Cap: {stock.marketCap}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-foreground text-xl">${stock.price}</p>
                      <div className="flex items-center gap-1">
                        <ArrowUpRight className="h-5 w-5 text-success" />
                        <span className="text-lg font-semibold text-success">{stock.change}</span>
                        <span className="text-sm text-success">({stock.changeValue})</span>
                      </div>
                      <p className="text-sm text-muted-foreground">Volume: {stock.volume}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Top Losers Tab */}
        {activeTab === 'losers' && (
          <Card className="card-professional">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl">Top Losers</CardTitle>
                  <CardDescription>Stocks with the highest percentage losses today</CardDescription>
                </div>
                <Badge variant="destructive" size="sm">Live Data</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {filteredLosers.map((stock, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 hover:bg-muted/50 rounded-lg transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-muted rounded-xl flex items-center justify-center">
                        <span className="font-bold text-lg">{stock.symbol.slice(0, 2)}</span>
                      </div>
                      <div>
                        <p className="font-semibold text-foreground text-lg">{stock.symbol}</p>
                        <p className="text-sm text-muted-foreground">{stock.name}</p>
                        <p className="text-xs text-muted-foreground">Market Cap: {stock.marketCap}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-foreground text-xl">${stock.price}</p>
                      <div className="flex items-center gap-1">
                        <ArrowDownRight className="h-5 w-5 text-destructive" />
                        <span className="text-lg font-semibold text-destructive">{stock.change}</span>
                        <span className="text-sm text-destructive">({stock.changeValue})</span>
                      </div>
                      <p className="text-sm text-muted-foreground">Volume: {stock.volume}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Sectors Tab */}
        {activeTab === 'sectors' && (
          <Card className="card-professional">
            <CardHeader>
              <CardTitle className="text-xl">Sector Performance</CardTitle>
              <CardDescription>How different sectors are performing today</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {sectorPerformance.map((sector, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-4 h-4 rounded-full ${
                          sector.positive ? 'bg-success' : 'bg-destructive'
                        }`} />
                        <span className="font-medium text-foreground">{sector.name}</span>
                        <Badge variant="secondary" size="sm">{sector.weight}%</Badge>
                      </div>
                      <div className="text-right">
                        <span className={`font-semibold text-lg ${
                          sector.positive ? 'text-success' : 'text-destructive'
                        }`}>
                          {sector.change}
                        </span>
                      </div>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-500 ${
                          sector.positive ? 'bg-success' : 'bg-destructive'
                        }`}
                        style={{ width: `${Math.abs(parseFloat(sector.change)) * 20}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}