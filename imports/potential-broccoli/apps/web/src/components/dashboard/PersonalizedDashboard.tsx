'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  TrendingUp, 
  TrendingDown, 
  AlertCircle,
  Clock,
  TrendingUpIcon,
  TrendingDownIcon,
  DollarSign,
  Percent,
  BarChart2,
  PieChart,
  LineChart,
  RefreshCw,
  Bell,
  Settings,
  ChevronRight,
  Plus
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

type PortfolioMetric = {
  id: string;
  label: string;
  value: string;
  change: number;
  icon: React.ReactNode;
};

type AssetAllocation = {
  id: string;
  name: string;
  ticker: string;
  allocation: number;
  change: number;
  value: number;
};

type Insight = {
  id: string;
  title: string;
  description: string;
  type: 'opportunity' | 'warning' | 'info';
  timestamp: string;
  action?: () => void;
};

type MarketSentiment = {
  overall: 'bullish' | 'bearish' | 'neutral';
  score: number;
  indicators: {
    name: string;
    score: number;
    change: number;
  }[];
};

export function PersonalizedDashboard() {
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [marketSentiment, setMarketSentiment] = useState<MarketSentiment | null>(null);
  
  // Simulate loading data
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
      // Mock market sentiment data
      setMarketSentiment({
        overall: 'bullish',
        score: 72,
        indicators: [
          { name: 'S&P 500', score: 75, change: 2.5 },
          { name: 'NASDAQ', score: 82, change: 3.1 },
          { name: 'DOW', score: 65, change: 1.2 },
          { name: 'VIX', score: 28, change: -5.4 },
        ],
      });
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  const portfolioMetrics: PortfolioMetric[] = [
    {
      id: 'total-value',
      label: 'Portfolio Value',
      value: '$145,328.75',
      change: 2.8,
      icon: <DollarSign className="h-4 w-4 text-muted-foreground" />,
    },
    {
      id: 'daily-change',
      label: 'Daily Change',
      value: '+$1,245.32',
      change: 0.85,
      icon: <TrendingUp className="h-4 w-4 text-muted-foreground" />,
    },
    {
      id: 'ytd-return',
      label: 'YTD Return',
      value: '+12.4%',
      change: 3.2,
      icon: <Percent className="h-4 w-4 text-muted-foreground" />,
    },
    {
      id: 'risk-level',
      label: 'Risk Level',
      value: 'Moderate',
      change: -0.5,
      icon: <BarChart2 className="h-4 w-4 text-muted-foreground" />,
    },
  ];

  const assetAllocations: AssetAllocation[] = [
    { id: 'stocks', name: 'Stocks', ticker: 'VTI', allocation: 65, change: 2.1, value: 94463.69 },
    { id: 'bonds', name: 'Bonds', ticker: 'BND', allocation: 20, change: -1.2, value: 29065.75 },
    { id: 'crypto', name: 'Crypto', ticker: 'BTC-USD', allocation: 8, change: 5.7, value: 11626.30 },
    { id: 'real-estate', name: 'Real Estate', ticker: 'VNQ', allocation: 7, change: 0.5, value: 10173.01 },
  ];

  const insights: Insight[] = [
    {
      id: 'tax-loss',
      title: 'Tax Loss Harvesting Opportunity',
      description: 'Potential $1,250 in tax savings available',
      type: 'opportunity',
      timestamp: '2 hours ago',
    },
    {
      id: 'rebalance',
      title: 'Portfolio Rebalancing Recommended',
      description: 'Your tech allocation is 8% above target',
      type: 'warning',
      timestamp: '1 day ago',
    },
    {
      id: 'dividend',
      title: 'Dividend Payment Received',
      description: '$245.30 from VTI added to your cash balance',
      type: 'info',
      timestamp: '3 days ago',
    },
  ];

  const renderMetricCard = (metric: PortfolioMetric) => (
    <Card key={metric.id} className="flex-1 min-w-[200px]">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardDescription className="text-sm font-medium">
            {metric.label}
          </CardDescription>
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
            {metric.icon}
          </div>
        </div>
        <div className="flex items-end justify-between pt-2">
          <CardTitle className="text-2xl font-bold">
            {metric.value}
          </CardTitle>
          <div className={`flex items-center text-sm ${metric.change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {metric.change >= 0 ? (
              <ArrowUpRight className="h-4 w-4 mr-1" />
            ) : (
              <ArrowDownRight className="h-4 w-4 mr-1" />
            )}
            {Math.abs(metric.change)}%
          </div>
        </div>
      </CardHeader>
    </Card>
  );

  const renderAllocationItem = (asset: AssetAllocation) => (
    <div key={asset.id} className="flex items-center justify-between py-3">
      <div className="flex items-center space-x-3">
        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
          <span className="text-sm font-medium">{asset.ticker}</span>
        </div>
        <div>
          <p className="font-medium">{asset.name}</p>
          <p className="text-sm text-muted-foreground">{asset.allocation}%</p>
        </div>
      </div>
      <div className="text-right">
        <p className="font-medium">${asset.value.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
        <div className={`text-xs flex items-center justify-end ${asset.change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
          {asset.change >= 0 ? (
            <TrendingUpIcon className="h-3 w-3 mr-1" />
          ) : (
            <TrendingDownIcon className="h-3 w-3 mr-1" />
          )}
          {Math.abs(asset.change)}%
        </div>
      </div>
    </div>
  );

  const renderInsightCard = (insight: Insight) => {
    const iconMap = {
      opportunity: <DollarSign className="h-4 w-4 text-green-500" />,
      warning: <AlertCircle className="h-4 w-4 text-yellow-500" />,
      info: <Clock className="h-4 w-4 text-blue-500" />,
    };

    return (
      <div key={insight.id} className="flex items-start space-x-3 p-3 hover:bg-muted/50 rounded-lg transition-colors cursor-pointer">
        <div className="mt-0.5">
          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
            {iconMap[insight.type]}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm">{insight.title}</p>
          <p className="text-sm text-muted-foreground truncate">{insight.description}</p>
          <p className="text-xs text-muted-foreground mt-1">{insight.timestamp}</p>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-96 md:col-span-2" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">Welcome back! Here's your portfolio overview.</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Funds
          </Button>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {portfolioMetrics.map(renderMetricCard)}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Asset Allocation */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Asset Allocation</CardTitle>
            <div className="flex items-center space-x-2">
              <TabsList>
                <TabsTrigger value="allocation">Allocation</TabsTrigger>
                <TabsTrigger value="performance">Performance</TabsTrigger>
              </TabsList>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {assetAllocations.map((asset) => (
                <div key={asset.id} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">{asset.name}</span>
                      <span className="text-muted-foreground">{asset.allocation}%</span>
                    </div>
                    <div className="text-sm">
                      ${asset.value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      <span className={`ml-2 ${asset.change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {asset.change >= 0 ? '↑' : '↓'} {Math.abs(asset.change)}%
                      </span>
                    </div>
                  </div>
                  <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
                    <div 
                      className="h-full bg-primary"
                      style={{
                        width: `${asset.allocation}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        
        {/* Market Sentiment */}
        <Card>
          <CardHeader>
            <CardTitle>Market Sentiment</CardTitle>
            <CardDescription>Current market conditions and trends</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {marketSentiment && (
              <div className="text-center">
                <div className="inline-flex items-center justify-center rounded-full px-4 py-2 bg-primary/10 text-primary mb-2">
                  {marketSentiment.overall === 'bullish' ? (
                    <TrendingUp className="h-4 w-4 mr-2" />
                  ) : (
                    <TrendingDown className="h-4 w-4 mr-2" />
                  )}
                  {marketSentiment.overall.charAt(0).toUpperCase() + marketSentiment.overall.slice(1)}
                </div>
                <div className="text-4xl font-bold my-4">{marketSentiment.score}</div>
                <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
                  <div 
                    className="h-full"
                    style={{
                      width: `${marketSentiment.score}%`,
                      backgroundColor: marketSentiment.score > 60 ? 'rgb(34, 197, 94)' : 
                                      marketSentiment.score < 40 ? 'rgb(239, 68, 68)' : 'rgb(234, 179, 8)'
                    }}
                  />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>Bearish</span>
                  <span>Neutral</span>
                  <span>Bullish</span>
                </div>
              </div>
            )}

            <div className="space-y-3 mt-6">
              <h4 className="text-sm font-medium">Key Indicators</h4>
              {marketSentiment?.indicators.map((indicator) => (
                <div key={indicator.name} className="flex items-center justify-between">
                  <span className="text-sm">{indicator.name}</span>
                  <div className="flex items-center">
                    <span className={`text-sm font-medium mr-2 ${
                      indicator.score > 60 ? 'text-green-500' : indicator.score < 40 ? 'text-red-500' : 'text-yellow-500'
                    }`}>
                      {indicator.score}
                    </span>
                    <span className={`text-xs ${
                      indicator.change >= 0 ? 'text-green-500' : 'text-red-500'
                    }`}>
                      {indicator.change >= 0 ? '+' : ''}{indicator.change}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Portfolio Performance</CardTitle>
            <CardDescription>Your portfolio's performance over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center bg-muted/50 rounded-lg">
              <p className="text-muted-foreground">Performance chart will appear here</p>
            </div>
          </CardContent>
        </Card>

        {/* Insights & Recommendations */}
        <Card>
          <CardHeader>
            <CardTitle>Insights</CardTitle>
            <CardDescription>Personalized recommendations and alerts</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {insights.map(renderInsightCard)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI-Powered Analysis */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>AI-Powered Analysis</CardTitle>
              <CardDescription>Automated insights about your portfolio</CardDescription>
            </div>
            <Button variant="outline" size="sm">
              <RefreshCw className="mr-2 h-4 w-4" />
              Generate New Analysis
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-4">
              <h4 className="font-medium">Risk Assessment</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Volatility</span>
                  <span className="text-sm font-medium">Medium</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Drawdown Risk</span>
                  <span className="text-sm font-medium">-12%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Correlation</span>
                  <span className="text-sm font-medium">0.78</span>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <h4 className="font-medium">Opportunities</h4>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">•</span>
                  <span>Tax-loss harvesting: $1,250 potential savings</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-500 mr-2">•</span>
                  <span>Rebalancing opportunity in Tech sector</span>
                </li>
                <li className="flex items-start">
                  <span className="text-purple-500 mr-2">•</span>
                  <span>Consider adding international exposure</span>
                </li>
              </ul>
            </div>
            <div className="space-y-4">
              <h4 className="font-medium">Behavioral Insights</h4>
              <div className="space-y-2 text-sm">
                <p>You tend to sell winners too quickly. Consider holding for long-term gains.</p>
                <p>Your portfolio is well-diversified, which helps manage risk.</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
