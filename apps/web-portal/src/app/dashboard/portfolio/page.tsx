'use client';

import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  PieChart, 
  Target, 
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  Activity,
  Shield,
  Clock,
  RefreshCw,
  Download,
  Settings,
  Eye,
  EyeOff,
  Plus,
  Minus,
  Star,
  AlertCircle,
  CheckCircle,
  Info
} from 'lucide-react';
import { useState } from 'react';

const portfolioData = {
  totalValue: 125430.50,
  dayChange: 3125.75,
  dayChangePercent: 2.56,
  totalReturn: 15430.50,
  totalReturnPercent: 14.02,
  cashBalance: 15420.30,
  buyingPower: 30840.60,
  holdings: [
    { 
      symbol: 'AAPL', 
      name: 'Apple Inc.', 
      shares: 50, 
      avgPrice: 150.00, 
      currentPrice: 175.43, 
      value: 8771.50, 
      pnl: 1271.50, 
      pnlPercent: 16.95,
      weight: 6.99,
      positive: true
    },
    { 
      symbol: 'MSFT', 
      name: 'Microsoft Corp.', 
      shares: 30, 
      avgPrice: 280.00, 
      currentPrice: 335.89, 
      value: 10076.70, 
      pnl: 1676.70, 
      pnlPercent: 19.96,
      weight: 8.03,
      positive: true
    },
    { 
      symbol: 'TSLA', 
      name: 'Tesla Inc.', 
      shares: 25, 
      avgPrice: 200.00, 
      currentPrice: 245.67, 
      value: 6141.75, 
      pnl: 1141.75, 
      pnlPercent: 22.84,
      weight: 4.90,
      positive: true
    },
    { 
      symbol: 'NVDA', 
      name: 'NVIDIA Corp.', 
      shares: 15, 
      avgPrice: 350.00, 
      currentPrice: 432.12, 
      value: 6481.80, 
      pnl: 1231.80, 
      pnlPercent: 23.49,
      weight: 5.17,
      positive: true
    },
  ]
};

const allocationData = [
  { sector: 'Technology', percentage: 65, value: 81547.75, color: 'bg-primary', positive: true },
  { sector: 'Healthcare', percentage: 20, value: 25086.10, color: 'bg-success', positive: true },
  { sector: 'Financials', percentage: 10, value: 12543.05, color: 'bg-warning', positive: false },
  { sector: 'Energy', percentage: 5, value: 6271.53, color: 'bg-info', positive: true },
];

const performanceMetrics = [
  { label: 'Sharpe Ratio', value: '1.45', description: 'Risk-adjusted returns', positive: true },
  { label: 'Max Drawdown', value: '-8.23%', description: 'Peak to trough decline', positive: false },
  { label: 'Volatility', value: '12.45%', description: 'Annualized standard deviation', positive: true },
  { label: 'Beta', value: '0.87', description: 'Market correlation', positive: true },
  { label: 'Alpha', value: '2.34%', description: 'Excess return over benchmark', positive: true },
  { label: 'Sortino Ratio', value: '1.89', description: 'Downside risk-adjusted return', positive: true },
];

export default function PortfolioPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [portfolioVisible, setPortfolioVisible] = useState(true);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: PieChart },
    { id: 'holdings', label: 'Holdings', icon: BarChart3 },
    { id: 'performance', label: 'Performance', icon: TrendingUp },
    { id: 'allocation', label: 'Allocation', icon: Target },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Professional Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-heading-1 text-foreground mb-2">Portfolio Management</h1>
            <p className="text-body-large text-muted-foreground">
              Track your investments and analyze performance with professional tools
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
            <Button variant="outline" size="sm" className="gap-2">
              <Download className="h-4 w-4" />
              Export
            </Button>
            <Button variant="outline" size="sm" className="gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </Button>
          </div>
        </div>

        {/* Portfolio Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="card-professional hover-lift">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Total Portfolio Value</p>
                  <p className="text-2xl font-bold text-foreground">
                    ${portfolioData.totalValue.toLocaleString()}
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    <ArrowUpRight className="h-4 w-4 text-success" />
                    <span className="text-sm font-medium text-success">
                      +${portfolioData.dayChange.toLocaleString()} ({portfolioData.dayChangePercent}%)
                    </span>
                  </div>
                </div>
                <div className="p-3 bg-success/10 rounded-xl">
                  <DollarSign className="h-6 w-6 text-success" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="card-professional hover-lift">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Total Return</p>
                  <p className="text-2xl font-bold text-success">
                    +${portfolioData.totalReturn.toLocaleString()}
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    <ArrowUpRight className="h-4 w-4 text-success" />
                    <span className="text-sm font-medium text-success">
                      +{portfolioData.totalReturnPercent}%
                    </span>
                  </div>
                </div>
                <div className="p-3 bg-primary/10 rounded-xl">
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="card-professional hover-lift">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Cash Balance</p>
                  <p className="text-2xl font-bold text-foreground">
                    ${portfolioData.cashBalance.toLocaleString()}
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    <Clock className="h-4 w-4 text-info" />
                    <span className="text-sm font-medium text-info">
                      Available for trading
                    </span>
                  </div>
                </div>
                <div className="p-3 bg-info/10 rounded-xl">
                  <Shield className="h-6 w-6 text-info" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="card-professional hover-lift">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Buying Power</p>
                  <p className="text-2xl font-bold text-foreground">
                    ${portfolioData.buyingPower.toLocaleString()}
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    <Activity className="h-4 w-4 text-warning" />
                    <span className="text-sm font-medium text-warning">
                      With margin
                    </span>
                  </div>
                </div>
                <div className="p-3 bg-warning/10 rounded-xl">
                  <Target className="h-6 w-6 text-warning" />
                </div>
              </div>
            </CardContent>
          </Card>
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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Portfolio Performance Chart */}
            <div className="lg:col-span-2">
              <Card className="card-professional">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-xl">Portfolio Performance</CardTitle>
                      <CardDescription>Track your investment growth over time</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">1M</Button>
                      <Button variant="default" size="sm">3M</Button>
                      <Button variant="outline" size="sm">1Y</Button>
                      <Button variant="outline" size="sm">5Y</Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="h-80 bg-muted/30 rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <BarChart3 className="h-16 w-16 mx-auto mb-4 text-primary/50" />
                      <h3 className="text-lg font-semibold mb-2 text-foreground">
                        Portfolio Performance Chart
                      </h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Interactive chart showing your portfolio's growth trajectory with benchmark comparison
                      </p>
                      <div className="flex flex-wrap gap-2 justify-center">
                        <Badge variant="secondary">Portfolio Value</Badge>
                        <Badge variant="secondary">S&P 500 Benchmark</Badge>
                        <Badge variant="secondary">Risk Metrics</Badge>
                        <Badge variant="secondary">Dividend Yield</Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Stats */}
            <div className="space-y-6">
              <Card className="card-professional">
                <CardHeader>
                  <CardTitle className="text-lg">Quick Stats</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Holdings</span>
                    <span className="font-semibold text-foreground">{portfolioData.holdings.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Avg. Return</span>
                    <span className="font-semibold text-success">+{portfolioData.totalReturnPercent}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Best Performer</span>
                    <span className="font-semibold text-success">NVDA (+23.49%)</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Risk Level</span>
                    <Badge variant="success" size="sm">Low</Badge>
                  </div>
                </CardContent>
              </Card>

              <Card className="card-professional">
                <CardHeader>
                  <CardTitle className="text-lg">Recent Activity</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    { action: 'Bought', symbol: 'AAPL', shares: 50, time: '2 hours ago', positive: true },
                    { action: 'Dividend', symbol: 'MSFT', amount: 45.50, time: '1 day ago', positive: true },
                    { action: 'Sold', symbol: 'TSLA', shares: 10, time: '2 days ago', positive: false },
                  ].map((activity, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${activity.positive ? 'bg-success' : 'bg-destructive'}`} />
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {activity.action} {activity.symbol}
                            {activity.shares && ` (${activity.shares} shares)`}
                          </p>
                          <p className="text-xs text-muted-foreground">{activity.time}</p>
                        </div>
                      </div>
                      {activity.amount && (
                        <span className="text-sm font-medium text-success">+${activity.amount}</span>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Holdings Tab */}
        {activeTab === 'holdings' && (
          <Card className="card-professional">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl">Portfolio Holdings</CardTitle>
                  <CardDescription>Detailed view of all your investments</CardDescription>
                </div>
                <Badge variant="secondary" className="gap-1">
                  <PieChart className="h-3 w-3" />
                  {portfolioData.holdings.length} positions
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {portfolioData.holdings.map((holding, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-6 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-muted rounded-xl flex items-center justify-center">
                        <span className="font-bold text-lg">{holding.symbol.slice(0, 2)}</span>
                      </div>
                      <div>
                        <p className="font-semibold text-foreground text-lg">{holding.symbol}</p>
                        <p className="text-sm text-muted-foreground">{holding.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {holding.shares} shares • Avg: ${holding.avgPrice} • Weight: {holding.weight}%
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-foreground text-xl">${holding.currentPrice}</p>
                      <p className="text-sm text-muted-foreground">Value: ${holding.value.toLocaleString()}</p>
                      <div className="flex items-center gap-1">
                        {holding.positive ? (
                          <ArrowUpRight className="h-4 w-4 text-success" />
                        ) : (
                          <ArrowDownRight className="h-4 w-4 text-destructive" />
                        )}
                        <span className={`font-semibold ${holding.positive ? 'text-success' : 'text-destructive'}`}>
                          ${holding.pnl.toLocaleString()} ({holding.pnlPercent}%)
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Performance Tab */}
        {activeTab === 'performance' && (
          <div className="space-y-8">
            {/* Performance Metrics */}
            <Card className="card-professional">
              <CardHeader>
                <CardTitle className="text-xl">Performance Metrics</CardTitle>
                <CardDescription>Risk and return analysis of your portfolio</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
                  {performanceMetrics.map((metric, index) => (
                    <div key={index} className="text-center p-4 bg-muted/30 rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">{metric.label}</p>
                      <p className={`text-xl font-bold ${metric.positive ? 'text-success' : 'text-destructive'}`}>
                        {metric.value}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">{metric.description}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Performance Comparison */}
            <Card className="card-professional">
              <CardHeader>
                <CardTitle className="text-xl">Performance Comparison</CardTitle>
                <CardDescription>How your portfolio compares to market benchmarks</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80 bg-muted/30 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <TrendingUp className="h-16 w-16 mx-auto mb-4 text-primary/50" />
                    <h3 className="text-lg font-semibold mb-2 text-foreground">
                      Performance Comparison Chart
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Compare your portfolio performance against S&P 500 and other benchmarks
                    </p>
                    <div className="flex flex-wrap gap-2 justify-center">
                      <Badge variant="secondary">Your Portfolio</Badge>
                      <Badge variant="secondary">S&P 500</Badge>
                      <Badge variant="secondary">NASDAQ</Badge>
                      <Badge variant="secondary">Russell 2000</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Allocation Tab */}
        {activeTab === 'allocation' && (
          <Card className="card-professional">
            <CardHeader>
              <CardTitle className="text-xl">Asset Allocation</CardTitle>
              <CardDescription>How your portfolio is distributed across different sectors</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {allocationData.map((allocation, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-4 h-4 rounded-full ${allocation.color}`} />
                        <span className="font-medium text-foreground">{allocation.sector}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-semibold text-foreground">{allocation.percentage}%</span>
                        <p className="text-sm text-muted-foreground">${allocation.value.toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="w-full bg-muted rounded-full h-3">
                      <div
                        className={`h-3 rounded-full ${allocation.color} transition-all duration-500`}
                        style={{ width: `${allocation.percentage}%` }}
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