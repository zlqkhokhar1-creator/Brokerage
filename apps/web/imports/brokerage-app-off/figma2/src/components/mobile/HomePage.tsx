import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  ArrowUpDown,
  CreditCard,
  Banknote,
  HelpCircle,
  Info
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import { mockPortfolio, portfolioHistory, mockStocks } from '../mockData';

interface HomePageProps {
  onStockClick: (symbol: string) => void;
  onNavigate: (page: 'trade') => void;
}

// Mock news data matching IBKR style
const mockNews = [
  {
    id: '1',
    headline: 'Jeff Bezos-Backed Anthropic To Pay $1.5 Billion In AI Copyright Settlement With...',
    time: 'Today 12:24 PM',
    source: 'Benzinga'
  },
  {
    id: '2', 
    headline: 'Streetwise: The Market Is Pricey. Dividends Offer A Cushion in a Pullback. -- Barron\'s',
    time: 'Today 9:30 AM',
    source: 'Dow Jones Global News'
  },
  {
    id: '3',
    headline: 'Fed Officials Signal Caution on Future Rate Cuts After Strong Jobs Data',
    time: 'Yesterday 4:15 PM',
    source: 'Reuters'
  }
];

// Mock holdings data
const mockHoldings = [
  { symbol: '3042', name: 'Mkt Val: 16.6K', icon: '📊', value: 16600 },
  { symbol: 'VOO', name: 'Vanguard S&P 500 ETF', icon: 'V', value: 45200, color: 'text-red-600' },
  { symbol: 'QQQ', name: 'Invesco QQQ Trust', icon: '📈', value: 32800, color: 'text-blue-600' },
  { symbol: 'NVDA', name: 'NVIDIA Corporation', icon: '🟢', value: 28900 }
];

export function HomePage({ onStockClick, onNavigate }: HomePageProps) {
  const [selectedTimeframe, setSelectedTimeframe] = useState('1W');
  const [portfolio, setPortfolio] = useState(mockPortfolio);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatHKD = (amount: number) => {
    return new Intl.NumberFormat('en-HK', {
      style: 'currency',
      currency: 'HKD',
    }).format(amount);
  };

  const formatPercent = (percent: number) => {
    return `${percent >= 0 ? '+' : ''}${percent.toFixed(2)}%`;
  };

  // Convert to HKD for display (mock conversion rate)
  const hkdValue = portfolio.totalValue * 7.8;
  const hkdChange = portfolio.dayChange * 7.8;

  const timeframes = ['1W', 'MTD', '1M', '3M', 'YTD', '1Y', 'All'];

  return (
    <div className="p-4 space-y-6 bg-gradient-to-b from-background to-muted/20 min-h-full">
      {/* Portfolio Value Section */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex gap-4">
            <Button 
              variant={selectedTimeframe === 'Value' ? 'default' : 'ghost'}
              size="sm"
              className="px-0 h-auto"
            >
              Value
            </Button>
            <Button 
              variant="ghost"
              size="sm" 
              className="px-0 h-auto text-muted-foreground"
            >
              Performance
            </Button>
          </div>
          <Info className="h-5 w-5 text-muted-foreground" />
        </div>

        <div className="space-y-1">
          <div className="text-4xl">
            {formatHKD(hkdValue)}
          </div>
          <div className={`flex items-center gap-2 ${hkdChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            <span>{formatHKD(hkdChange)} ({formatPercent(portfolio.dayChangePercent)}) past week</span>
          </div>
        </div>
      </div>

      {/* Chart */}
      <Card className="bg-card/50 backdrop-blur-sm border-border/50 shadow-lg">
        <CardContent className="pt-4">
          <div className="h-48 mb-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={portfolioHistory}>
                <XAxis hide />
                <YAxis hide />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          
          {/* Timeframe Selector */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {timeframes.map((tf) => (
              <Button
                key={tf}
                variant={selectedTimeframe === tf ? "default" : "ghost"}
                size="sm"
                className={`flex-shrink-0 h-8 px-3 text-xs rounded-full transition-all ${
                  selectedTimeframe === tf 
                    ? 'bg-primary text-primary-foreground shadow-md' 
                    : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
                onClick={() => setSelectedTimeframe(tf)}
              >
                {tf}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* News Section */}
      <div className="space-y-3">
        {mockNews.map((article, index) => (
          <Card key={article.id} className="bg-card/30 backdrop-blur-sm border-border/30 hover:bg-card/50 transition-colors">
            <CardContent className="py-4 px-0">
              <div className="flex justify-between items-start">
                <div className="flex-1 pr-4">
                  <h3 className="text-sm leading-5 mb-2">{article.headline}</h3>
                  <p className="text-xs text-muted-foreground">{article.time} • {article.source}</p>
                </div>
                <Info className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-1" />
              </div>
              
              {/* Pagination dots */}
              {index === 0 && (
                <div className="flex justify-center gap-2 mt-4">
                  <div className="h-2 w-2 bg-primary rounded-full" />
                  <div className="h-2 w-2 bg-muted rounded-full" />
                  <div className="h-2 w-2 bg-muted rounded-full" />
                  <div className="h-2 w-2 bg-muted rounded-full" />
                  <div className="h-2 w-2 bg-muted rounded-full" />
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-5 gap-4 py-4">
        <div className="flex flex-col items-center gap-2">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center hover:from-primary/20 hover:to-primary/10 transition-colors">
            <DollarSign className="h-5 w-5 text-primary" />
          </div>
          <span className="text-xs text-center font-medium">Transactions</span>
        </div>
        
        <div className="flex flex-col items-center gap-2">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-success/10 to-success/5 flex items-center justify-center hover:from-success/20 hover:to-success/10 transition-colors">
            <ArrowUpDown className="h-5 w-5 text-success" />
          </div>
          <span className="text-xs text-center font-medium">Account</span>
        </div>
        
        <div className="flex flex-col items-center gap-2">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-warning/10 to-warning/5 flex items-center justify-center hover:from-warning/20 hover:to-warning/10 transition-colors">
            <CreditCard className="h-5 w-5 text-warning" />
          </div>
          <span className="text-xs text-center font-medium">Withdraw</span>
        </div>
        
        <div className="flex flex-col items-center gap-2">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-success/10 to-success/5 flex items-center justify-center hover:from-success/20 hover:to-success/10 transition-colors">
            <Banknote className="h-5 w-5 text-success" />
          </div>
          <span className="text-xs text-center font-medium">Deposit</span>
        </div>
        
        <div className="flex flex-col items-center gap-2">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center hover:from-muted hover:to-muted/70 transition-colors">
            <HelpCircle className="h-5 w-5 text-muted-foreground" />
          </div>
          <span className="text-xs text-center font-medium">Support</span>
        </div>
      </div>

      {/* Top Holdings */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg">Top Holdings</h2>
          <Button variant="link" className="text-primary p-0 h-auto text-sm font-medium">
            Show All
          </Button>
        </div>
        
        <div className="grid grid-cols-3 gap-4">
          {mockHoldings.slice(0, 3).map((holding) => (
            <Card key={holding.symbol} className="cursor-pointer hover:shadow-lg transition-all duration-200 bg-card/50 backdrop-blur-sm border-border/50 hover:bg-card/70">
              <CardContent className="p-4 text-center">
                <div className="mb-2">
                  {holding.icon === 'V' ? (
                    <div className={`text-2xl font-bold ${holding.color || 'text-black'}`}>V</div>
                  ) : holding.icon === '📊' ? (
                    <div className="text-2xl">📊</div>
                  ) : holding.icon === '📈' ? (
                    <div className="text-2xl">📈</div>
                  ) : (
                    <div className="h-8 w-8 bg-green-500 rounded mx-auto" />
                  )}
                </div>
                <div className="text-sm mb-1">{holding.symbol}</div>
                {holding.name === 'Mkt Val: 16.6K' ? (
                  <div className="text-xs text-muted-foreground">Mkt Val: 16.6K</div>
                ) : (
                  <div className="text-xs text-muted-foreground truncate">{holding.name}</div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}