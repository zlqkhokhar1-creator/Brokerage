/**
 * 📊 ENHANCED TRADING DASHBOARD
 * 
 * This component provides a comprehensive overview of the user's trading portfolio.
 * It displays real-time data including:
 * - Portfolio value and performance metrics
 * - Individual stock positions with P&L
 * - AI-powered insights and recommendations
 * - Market overview with key indices
 * - Live financial news with sentiment analysis
 * 
 * The dashboard updates in real-time to provide traders with current information
 * for making informed investment decisions.
 */

"use client"; // Render on client side for real-time updates

// Import React hooks for state management and side effects
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Progress } from './ui/progress';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  BarChart3, 
  PieChart, 
  Activity,
  Globe,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Eye,
  Bell,
  RefreshCw,
  Calendar,
  Target,
  Zap,
  Brain,
  Shield
} from 'lucide-react';

// 📋 DATA STRUCTURE DEFINITIONS
// These interfaces define the shape of data used throughout the dashboard

/**
 * 📈 Position Interface
 * Represents a single stock position in the user's portfolio
 */
interface Position {
  symbol: string;              // Stock ticker (e.g., "AAPL")
  shares: number;              // Number of shares owned
  avgPrice: number;            // Average purchase price per share
  currentPrice: number;        // Current market price per share
  marketValue: number;         // Total value (shares × current price)
  unrealizedPL: number;        // Profit/Loss if sold now
  unrealizedPLPercent: number; // P&L as percentage
  dayChange: number;           // Today's dollar change
  dayChangePercent: number;    // Today's percentage change
}

/**
 * 📰 News Item Interface
 * Represents a financial news article with AI sentiment analysis
 */
interface NewsItem {
  id: string;                           // Unique identifier
  title: string;                        // News headline
  summary: string;                      // Brief description
  source: string;                       // News provider (Reuters, Bloomberg, etc.)
  timestamp: string;                    // When published
  sentiment: 'positive' | 'negative' | 'neutral'; // AI-analyzed sentiment
  relevantSymbols: string[];           // Related stock symbols
}

/**
 * 📊 Market Data Interface
 * Represents market index or ETF data
 */
interface MarketData {
  symbol: string;        // Market symbol (SPY, QQQ, etc.)
  price: number;         // Current price
  change: number;        // Dollar change today
  changePercent: number; // Percentage change today
  volume: number;        // Trading volume
  marketCap: string;     // Market capitalization
}

/**
 * 🎯 MAIN DASHBOARD COMPONENT
 * 
 * This is the heart of the trading dashboard that manages all the data
 * and renders the user interface components.
 */
export function EnhancedTradingDashboard() {
  
  // 💰 PORTFOLIO DATA STATE
  // This stores the user's overall portfolio information
  const [portfolioData, setPortfolioData] = useState({
    totalValue: 125847.32,        // Total portfolio value in USD
    dayChange: 2847.21,           // How much gained/lost today
    dayChangePercent: 2.31,       // Today's percentage change
    totalReturn: 15847.32,        // Total profit since start
    totalReturnPercent: 14.4,     // Total return percentage
    buyingPower: 45230.18,        // Available cash to trade
    marginUsed: 12500.00          // Amount borrowed on margin
  });

  const [positions, setPositions] = useState<Position[]>([
    {
      symbol: 'AAPL',
      shares: 50,
      avgPrice: 185.20,
      currentPrice: 192.45,
      marketValue: 9622.50,
      unrealizedPL: 362.50,
      unrealizedPLPercent: 3.91,
      dayChange: 125.00,
      dayChangePercent: 1.32
    },
    {
      symbol: 'TSLA',
      shares: 25,
      avgPrice: 245.80,
      currentPrice: 238.15,
      marketValue: 5953.75,
      unrealizedPL: -191.25,
      unrealizedPLPercent: -3.11,
      dayChange: -87.50,
      dayChangePercent: -1.45
    },
    {
      symbol: 'NVDA',
      shares: 15,
      avgPrice: 520.30,
      currentPrice: 587.92,
      marketValue: 8818.80,
      unrealizedPL: 1014.30,
      unrealizedPLPercent: 13.00,
      dayChange: 234.75,
      dayChangePercent: 2.74
    },
    {
      symbol: 'MSFT',
      shares: 30,
      avgPrice: 342.15,
      currentPrice: 358.90,
      marketValue: 10767.00,
      unrealizedPL: 502.50,
      unrealizedPLPercent: 4.90,
      dayChange: 89.70,
      dayChangePercent: 0.84
    }
  ]);

  const [marketData, setMarketData] = useState<MarketData[]>([
    { symbol: 'SPY', price: 445.23, change: 3.21, changePercent: 0.73, volume: 45234567, marketCap: '412.5B' },
    { symbol: 'QQQ', price: 378.45, change: -1.87, changePercent: -0.49, volume: 32145678, marketCap: '198.7B' },
    { symbol: 'IWM', price: 198.76, change: 2.45, changePercent: 1.25, volume: 18765432, marketCap: '32.1B' },
    { symbol: 'VIX', price: 16.42, change: -0.87, changePercent: -5.04, volume: 0, marketCap: 'N/A' }
  ]);

  const [news, setNews] = useState<NewsItem[]>([
    {
      id: '1',
      title: 'Federal Reserve Signals Potential Rate Cut in Q2',
      summary: 'Fed officials hint at monetary policy easing amid cooling inflation data, potentially boosting equity markets.',
      source: 'Reuters',
      timestamp: '2 hours ago',
      sentiment: 'positive',
      relevantSymbols: ['SPY', 'QQQ', 'TLT']
    },
    {
      id: '2',
      title: 'Tech Earnings Season Shows Mixed Results',
      summary: 'Major technology companies report varied quarterly results with AI investments driving future growth expectations.',
      source: 'Bloomberg',
      timestamp: '4 hours ago',
      sentiment: 'neutral',
      relevantSymbols: ['AAPL', 'MSFT', 'NVDA']
    },
    {
      id: '3',
      title: 'Electric Vehicle Sales Surge in Q1',
      summary: 'EV manufacturers report record deliveries, with Tesla leading market share despite increased competition.',
      source: 'CNBC',
      timestamp: '6 hours ago',
      sentiment: 'positive',
      relevantSymbols: ['TSLA', 'RIVN', 'LCID']
    }
  ]);

  const [aiInsights, setAiInsights] = useState([
    {
      type: 'Portfolio Optimization',
      message: 'Consider rebalancing: Tech allocation at 68% vs target 55%',
      confidence: 87,
      action: 'Reduce NVDA position by 15%'
    },
    {
      type: 'Risk Alert',
      message: 'Correlation risk detected: AAPL and MSFT moving in tandem',
      confidence: 92,
      action: 'Diversify into defensive sectors'
    },
    {
      type: 'Opportunity',
      message: 'Mean reversion signal on TSLA after recent decline',
      confidence: 74,
      action: 'Consider dollar-cost averaging'
    }
  ]);

  // Simulated real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setPortfolioData(prev => ({
        ...prev,
        totalValue: prev.totalValue + (Math.random() - 0.5) * 100,
        dayChange: prev.dayChange + (Math.random() - 0.5) * 50
      }));
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Trading Dashboard
            </h1>
            <p className="text-muted-foreground mt-1">
              Real-time portfolio management and market insights
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button variant="outline" size="sm">
              <Bell className="h-4 w-4 mr-2" />
              Alerts
            </Button>
          </div>
        </div>

        {/* Portfolio Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Total Portfolio Value</p>
                  <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                    {formatCurrency(portfolioData.totalValue)}
                  </p>
                </div>
                <div className="h-12 w-12 bg-blue-500 rounded-full flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="flex items-center mt-4">
                {portfolioData.dayChange >= 0 ? (
                  <ArrowUpRight className="h-4 w-4 text-green-500 mr-1" />
                ) : (
                  <ArrowDownRight className="h-4 w-4 text-red-500 mr-1" />
                )}
                <span className={`text-sm font-medium ${portfolioData.dayChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(Math.abs(portfolioData.dayChange))} ({formatPercent(portfolioData.dayChangePercent)})
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-600 dark:text-green-400">Total Return</p>
                  <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                    {formatCurrency(portfolioData.totalReturn)}
                  </p>
                </div>
                <div className="h-12 w-12 bg-green-500 rounded-full flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="flex items-center mt-4">
                <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100">
                  {formatPercent(portfolioData.totalReturnPercent)}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200 dark:border-purple-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-600 dark:text-purple-400">Buying Power</p>
                  <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                    {formatCurrency(portfolioData.buyingPower)}
                  </p>
                </div>
                <div className="h-12 w-12 bg-purple-500 rounded-full flex items-center justify-center">
                  <Target className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="mt-4">
                <p className="text-xs text-muted-foreground">
                  Margin Used: {formatCurrency(portfolioData.marginUsed)}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border-orange-200 dark:border-orange-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-orange-600 dark:text-orange-400">AI Insights</p>
                  <p className="text-2xl font-bold text-orange-900 dark:text-orange-100">
                    {aiInsights.length}
                  </p>
                </div>
                <div className="h-12 w-12 bg-orange-500 rounded-full flex items-center justify-center">
                  <Brain className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="flex items-center mt-4">
                <Badge variant="secondary" className="bg-orange-100 text-orange-800 dark:bg-orange-800 dark:text-orange-100">
                  Active Alerts
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Dashboard Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Portfolio Positions */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Portfolio Positions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {positions.map((position) => (
                    <div key={position.symbol} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                          <span className="text-white font-semibold text-sm">{position.symbol.slice(0, 2)}</span>
                        </div>
                        <div>
                          <h4 className="font-semibold">{position.symbol}</h4>
                          <p className="text-sm text-muted-foreground">
                            {position.shares} shares @ {formatCurrency(position.avgPrice)}
                          </p>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <p className="font-semibold">{formatCurrency(position.marketValue)}</p>
                        <div className="flex items-center gap-2">
                          <span className={`text-sm ${position.unrealizedPL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatCurrency(position.unrealizedPL)} ({formatPercent(position.unrealizedPLPercent)})
                          </span>
                          {position.unrealizedPL >= 0 ? (
                            <TrendingUp className="h-4 w-4 text-green-500" />
                          ) : (
                            <TrendingDown className="h-4 w-4 text-red-500" />
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* AI Insights */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  AI Insights
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {aiInsights.map((insight, index) => (
                    <div key={index} className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="secondary" className="text-xs">
                          {insight.type}
                        </Badge>
                        <div className="flex items-center gap-1">
                          <Shield className="h-3 w-3 text-green-500" />
                          <span className="text-xs text-muted-foreground">{insight.confidence}%</span>
                        </div>
                      </div>
                      <p className="text-sm mb-2">{insight.message}</p>
                      <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                        → {insight.action}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Market Data and News */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Market Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Market Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {marketData.map((market) => (
                  <div key={market.symbol} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <div>
                      <h4 className="font-semibold">{market.symbol}</h4>
                      <p className="text-sm text-muted-foreground">Vol: {market.volume.toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(market.price)}</p>
                      <div className="flex items-center gap-1">
                        <span className={`text-sm ${market.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatPercent(market.changePercent)}
                        </span>
                        {market.change >= 0 ? (
                          <ArrowUpRight className="h-3 w-3 text-green-500" />
                        ) : (
                          <ArrowDownRight className="h-3 w-3 text-red-500" />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Market News */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Market News
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {news.map((item) => (
                  <div key={item.id} className="p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                    <div className="flex items-start justify-between mb-2">
                      <Badge 
                        variant={item.sentiment === 'positive' ? 'default' : item.sentiment === 'negative' ? 'destructive' : 'secondary'}
                        className="text-xs"
                      >
                        {item.sentiment}
                      </Badge>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {item.timestamp}
                      </div>
                    </div>
                    <h4 className="font-semibold text-sm mb-1">{item.title}</h4>
                    <p className="text-xs text-muted-foreground mb-2">{item.summary}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-blue-600">{item.source}</span>
                      <div className="flex gap-1">
                        {item.relevantSymbols.map((symbol) => (
                          <Badge key={symbol} variant="outline" className="text-xs px-1 py-0">
                            {symbol}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Performance Chart Placeholder */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Portfolio Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg flex items-center justify-center border-2 border-dashed border-blue-200 dark:border-blue-700">
              <div className="text-center">
                <BarChart3 className="h-12 w-12 text-blue-500 mx-auto mb-4" />
                <p className="text-lg font-semibold text-blue-600 dark:text-blue-400">Interactive Chart</p>
                <p className="text-sm text-muted-foreground">Real-time portfolio performance visualization</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
