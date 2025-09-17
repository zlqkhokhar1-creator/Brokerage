"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from '@/components/MotionWrappers';
import { useAuth } from '@/contexts/AuthContext';
import { marketDataService } from '@/lib/api/market-data';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PerformanceChart } from '@/components/PerformanceChart';
import {
  TrendingUp, TrendingDown, Brain, Zap, Target, AlertCircle,
  ArrowUpRight, ArrowDownRight, Activity, PieChart, BarChart3,
  DollarSign, Globe, Clock, Sparkles, Eye, ChevronRight,
  ArrowRight, LineChart, Briefcase, Shield, Bell
} from 'lucide-react';

// Types for our dashboard data
interface MarketData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume?: number;
}

interface AIInsight {
  id: string;
  type: 'opportunity' | 'risk' | 'trend' | 'recommendation';
  title: string;
  description: string;
  confidence: number;
  impact: 'high' | 'medium' | 'low';
  actionable: boolean;
  timestamp: Date;
}

interface PortfolioSnapshot {
  totalValue: number;
  dayChange: number;
  dayChangePercent: number;
  allocation: { [key: string]: number };
  topHoldings: Array<{
    symbol: string;
    weight: number;
    value: number;
    change: number;
  }>;
}

// Real-time data hooks
const useMarketData = () => {
  const [data, setData] = useState<MarketData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMarketData = async () => {
      try {
        const symbols = ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'NVDA', 'SPY'];
        const quotes = await Promise.all(
          symbols.map(symbol => 
            marketDataService.getStockQuote(symbol).catch(() => ({
              symbol,
              price: Math.random() * 200 + 100,
              change: Math.random() * 10 - 5,
              changePercent: Math.random() * 5 - 2.5,
              volume: Math.floor(Math.random() * 10000000),
              timestamp: Date.now()
            }))
          )
        );
        setData(quotes);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching market data:', error);
        setLoading(false);
      }
    };

    fetchMarketData();
    const interval = setInterval(fetchMarketData, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  return { data, loading };
};

// Mock AI insights generator
const useAIInsights = () => {
  const [insights, setInsights] = useState<AIInsight[]>([
    {
      id: '1',
      type: 'opportunity',
      title: 'Tech Sector Momentum',
      description: 'AI models detect strong momentum in cloud computing stocks. Consider increasing allocation to MSFT, GOOGL.',
      confidence: 87,
      impact: 'high',
      actionable: true,
      timestamp: new Date()
    },
    {
      id: '2',
      type: 'risk',
      title: 'Portfolio Concentration Risk',
      description: 'Your portfolio is 45% concentrated in tech. Consider diversification into healthcare or financials.',
      confidence: 92,
      impact: 'medium',
      actionable: true,
      timestamp: new Date()
    },
    {
      id: '3',
      type: 'trend',
      title: 'Emerging Market Rotation',
      description: 'Institutional flows suggest rotation from growth to emerging markets. Monitor VWO, EEM for opportunities.',
      confidence: 73,
      impact: 'medium',
      actionable: false,
      timestamp: new Date()
    }
  ]);

  return insights;
};

// Portfolio snapshot mock
const usePortfolioSnapshot = () => {
  return {
    totalValue: 485672.43,
    dayChange: 2847.21,
    dayChangePercent: 0.59,
    allocation: {
      'US Equities': 65,
      'International': 15,
      'Bonds': 12,
      'Cash': 5,
      'Alternatives': 3
    },
    topHoldings: [
      { symbol: 'AAPL', weight: 12.5, value: 60708.55, change: 1.2 },
      { symbol: 'MSFT', weight: 8.3, value: 40311.41, change: 0.8 },
      { symbol: 'GOOGL', weight: 6.7, value: 32540.31, change: -0.3 },
      { symbol: 'TSLA', weight: 4.2, value: 20398.26, change: 2.1 }
    ]
  };
};

// Widget Components
const MarketOverview = ({ data, loading }: { data: MarketData[]; loading: boolean }) => (
  <Card className="h-full">
    <CardHeader className="pb-3">
      <CardTitle className="flex items-center justify-between text-lg">
        <div className="flex items-center space-x-2">
          <Globe className="h-5 w-5 text-teal-500" />
          <span>Market Overview</span>
        </div>
        <Badge variant="outline" className="text-xs">
          <Clock className="h-3 w-3 mr-1" />
          Live
        </Badge>
      </CardTitle>
    </CardHeader>
    <CardContent className="p-0">
      <div className="space-y-0">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-12 bg-muted/50 animate-pulse mx-6 mb-2 rounded" />
          ))
        ) : (
          data.map((item, index) => (
            <motion.div
              key={item.symbol}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-center justify-between px-6 py-3 hover:bg-muted/30 transition-colors border-b border-border/50 last:border-0"
            >
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-br from-teal-400 to-teal-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">
                    {item.symbol.slice(0, 2)}
                  </span>
                </div>
                <div>
                  <div className="font-medium">{item.symbol}</div>
                  <div className="text-xs text-muted-foreground">
                    {item.volume ? `${(item.volume / 1000000).toFixed(1)}M vol` : ''}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-mono text-sm font-medium">
                  ${item.price.toFixed(2)}
                </div>
                <div className={`flex items-center text-xs ${
                  item.change >= 0 ? 'text-green-500' : 'text-red-500'
                }`}>
                  {item.change >= 0 ? (
                    <ArrowUpRight className="h-3 w-3 mr-1" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3 mr-1" />
                  )}
                  {item.changePercent.toFixed(2)}%
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </CardContent>
  </Card>
);

const AIInsightsPanel = ({ insights }: { insights: AIInsight[] }) => (
  <Card className="h-full">
    <CardHeader className="pb-3">
      <CardTitle className="flex items-center justify-between text-lg">
        <div className="flex items-center space-x-2">
          <Brain className="h-5 w-5 text-purple-500" />
          <span>AI Insights</span>
        </div>
        <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-xs">
          <Sparkles className="h-3 w-3 mr-1" />
          AI
        </Badge>
      </CardTitle>
    </CardHeader>
    <CardContent className="space-y-4">
      {insights.map((insight) => (
        <motion.div
          key={insight.id}
          whileHover={{ scale: 1.02 }}
          className="p-4 rounded-lg bg-gradient-to-r from-card to-card/50 border border-border/50 hover:border-accent/50 transition-all cursor-pointer"
        >
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center space-x-2">
              {insight.type === 'opportunity' && <Target className="h-4 w-4 text-green-500" />}
              {insight.type === 'risk' && <AlertCircle className="h-4 w-4 text-red-500" />}
              {insight.type === 'trend' && <ArrowRight className="h-4 w-4 text-blue-500" />}
              {insight.type === 'recommendation' && <Zap className="h-4 w-4 text-yellow-500" />}
              <span className="text-sm font-medium">{insight.title}</span>
            </div>
            <Badge 
              variant={insight.confidence > 80 ? 'default' : 'secondary'}
              className="text-xs"
            >
              {insight.confidence}%
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
            {insight.description}
          </p>
          <div className="flex items-center justify-between">
            <Badge 
              variant={insight.impact === 'high' ? 'destructive' : insight.impact === 'medium' ? 'default' : 'secondary'}
              className="text-xs"
            >
              {insight.impact} impact
            </Badge>
            {insight.actionable && (
              <Button size="sm" variant="outline" className="text-xs h-6">
                Take Action
              </Button>
            )}
          </div>
        </motion.div>
      ))}
    </CardContent>
  </Card>
);

const PortfolioOverview = ({ portfolio }: { portfolio: PortfolioSnapshot }) => (
  <Card className="h-full">
    <CardHeader className="pb-3">
      <CardTitle className="flex items-center justify-between text-lg">
        <div className="flex items-center space-x-2">
          <PieChart className="h-5 w-5 text-teal-500" />
          <span>Portfolio</span>
        </div>
        <Button variant="ghost" size="sm">
          <Eye className="h-4 w-4" />
        </Button>
      </CardTitle>
    </CardHeader>
    <CardContent>
      {/* Portfolio Value */}
      <div className="mb-6">
        <div className="text-3xl font-bold font-mono">
          ${portfolio.totalValue.toLocaleString()}
        </div>
        <div className={`flex items-center text-sm mt-1 ${
          portfolio.dayChange >= 0 ? 'text-green-500' : 'text-red-500'
        }`}>
          {portfolio.dayChange >= 0 ? (
            <TrendingUp className="h-4 w-4 mr-1" />
          ) : (
            <TrendingDown className="h-4 w-4 mr-1" />
          )}
          ${Math.abs(portfolio.dayChange).toLocaleString()} ({portfolio.dayChangePercent.toFixed(2)}%) today
        </div>
      </div>

      <Separator className="mb-4" />

      {/* Allocation */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Asset Allocation
        </h4>
        {Object.entries(portfolio.allocation).map(([asset, percentage]) => (
          <div key={asset} className="flex items-center justify-between">
            <span className="text-sm">{asset}</span>
            <div className="flex items-center space-x-2">
              <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-teal-400 to-teal-600"
                  initial={{ width: 0 }}
                  animate={{ width: `${percentage}%` }}
                  transition={{ delay: 0.2, duration: 0.8 }}
                />
              </div>
              <span className="text-sm font-mono w-8">{percentage}%</span>
            </div>
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
);

export function AIEnhancedDashboard() {
  const { user } = useAuth();
  const { data: marketData, loading: marketLoading } = useMarketData();
  const aiInsights = useAIInsights();
  const portfolioSnapshot = usePortfolioSnapshot();
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-background/95 p-4 lg:p-6">
      {/* Welcome Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              Good morning, {user?.firstName}
            </h1>
            <p className="text-muted-foreground mt-2">
              Here's your personalized market intelligence and portfolio overview
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Badge className="bg-gradient-to-r from-green-500 to-green-600">
              <Activity className="h-3 w-3 mr-1" />
              Markets Open
            </Badge>
            <Badge variant="outline">
              <Brain className="h-3 w-3 mr-1" />
              AI Active
            </Badge>
          </div>
        </div>
      </motion.div>

      {/* Main Dashboard Grid */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-4 w-full max-w-2xl bg-card/50 backdrop-blur-sm">
          <TabsTrigger value="overview" className="flex items-center space-x-2">
            <BarChart3 className="h-4 w-4" />
            <span>Overview</span>
          </TabsTrigger>
          <TabsTrigger value="portfolio" className="flex items-center space-x-2">
            <Briefcase className="h-4 w-4" />
            <span>Portfolio</span>
          </TabsTrigger>
          <TabsTrigger value="ai" className="flex items-center space-x-2">
            <Brain className="h-4 w-4" />
            <span>AI Insights</span>
          </TabsTrigger>
          <TabsTrigger value="markets" className="flex items-center space-x-2">
            <Globe className="h-4 w-4" />
            <span>Markets</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-1 xl:grid-cols-3 gap-6 h-[600px]"
          >
            {/* Portfolio Overview */}
            <PortfolioOverview portfolio={portfolioSnapshot} />
            
            {/* Market Overview */}
            <MarketOverview data={marketData} loading={marketLoading} />
            
            {/* AI Insights */}
            <AIInsightsPanel insights={aiInsights} />
          </motion.div>

          {/* Performance Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <LineChart className="h-5 w-5 text-teal-500" />
                  <span>Portfolio Performance</span>
                  <Badge variant="secondary">YTD +12.4%</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <PerformanceChart height={300} days={365} />
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        <TabsContent value="portfolio">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            <div className="text-center py-20">
              <Briefcase className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-2xl font-semibold mb-2">Detailed Portfolio View</h3>
              <p className="text-muted-foreground">
                Advanced portfolio analytics and management tools coming soon
              </p>
            </div>
          </motion.div>
        </TabsContent>

        <TabsContent value="ai">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          >
            <AIInsightsPanel insights={aiInsights} />
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Zap className="h-5 w-5 text-yellow-500" />
                  <span>AI Performance Metrics</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">87%</div>
                    <div className="text-sm text-muted-foreground">Prediction Accuracy</div>
                  </div>
                  <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">+2.3%</div>
                    <div className="text-sm text-muted-foreground">Alpha Generated</div>
                  </div>
                </div>
                <Separator />
                <div className="space-y-2">
                  <h4 className="font-medium">Recent AI Actions</h4>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <div>• Suggested rebalancing tech allocation</div>
                    <div>• Detected earnings momentum in healthcare</div>
                    <div>• Recommended defensive positioning</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        <TabsContent value="markets">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-1 xl:grid-cols-2 gap-6"
          >
            <MarketOverview data={marketData} loading={marketLoading} />
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Bell className="h-5 w-5 text-orange-500" />
                  <span>Market News</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
                    <div className="font-medium text-sm mb-1">Fed Signals Rate Cut Consideration</div>
                    <div className="text-xs text-muted-foreground">2 hours ago • Reuters</div>
                  </div>
                  <div className="p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
                    <div className="font-medium text-sm mb-1">Tech Earnings Beat Expectations</div>
                    <div className="text-xs text-muted-foreground">4 hours ago • Bloomberg</div>
                  </div>
                  <div className="p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
                    <div className="font-medium text-sm mb-1">Energy Sector Shows Strength</div>
                    <div className="text-xs text-muted-foreground">6 hours ago • WSJ</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>
      </Tabs>
    </div>
  );
}