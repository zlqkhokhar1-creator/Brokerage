"use client";

import React, { useState, useEffect } from 'react';
import { motion } from '@/components/MotionWrappers';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PerformanceChart } from '@/components/PerformanceChart';
import { 
  TrendingUp, TrendingDown, PieChart, Target, Brain, Zap,
  ArrowUpRight, ArrowDownRight, DollarSign, Percent, Shield,
  BarChart3, LineChart, Activity, AlertTriangle, Sparkles,
  RefreshCw, Download, Settings, Eye, EyeOff, Filter,
  ChevronUp, ChevronDown, MoreHorizontal, Plus, Minus
} from 'lucide-react';

// Types for portfolio data
interface Holding {
  symbol: string;
  name: string;
  shares: number;
  costBasis: number;
  currentPrice: number;
  marketValue: number;
  unrealizedGain: number;
  unrealizedGainPercent: number;
  weight: number;
  sector: string;
  dividendYield: number;
  dayChange: number;
  dayChangePercent: number;
}

interface AllocationTarget {
  category: string;
  current: number;
  target: number;
  difference: number;
  recommendation: 'buy' | 'sell' | 'hold';
}

interface PortfolioMetrics {
  totalValue: number;
  totalGain: number;
  totalGainPercent: number;
  dayChange: number;
  dayChangePercent: number;
  beta: number;
  sharpeRatio: number;
  volatility: number;
  dividendYield: number;
  expenseRatio: number;
}

interface RiskMetrics {
  var95: number;
  maxDrawdown: number;
  correlation: number;
  concentration: number;
  rating: 'Conservative' | 'Moderate' | 'Aggressive';
}

// Mock data
const mockHoldings: Holding[] = [
  {
    symbol: 'AAPL',
    name: 'Apple Inc.',
    shares: 150,
    costBasis: 145.50,
    currentPrice: 175.25,
    marketValue: 26287.50,
    unrealizedGain: 4462.50,
    unrealizedGainPercent: 20.43,
    weight: 15.8,
    sector: 'Technology',
    dividendYield: 0.52,
    dayChange: 2.15,
    dayChangePercent: 1.24
  },
  {
    symbol: 'MSFT',
    name: 'Microsoft Corporation',
    shares: 85,
    costBasis: 310.20,
    currentPrice: 335.80,
    marketValue: 28543.00,
    unrealizedGain: 2176.00,
    unrealizedGainPercent: 8.25,
    weight: 17.2,
    sector: 'Technology',
    dividendYield: 0.72,
    dayChange: -1.45,
    dayChangePercent: -0.43
  },
  {
    symbol: 'GOOGL',
    name: 'Alphabet Inc.',
    shares: 45,
    costBasis: 2650.00,
    currentPrice: 2875.40,
    marketValue: 12939.30,
    unrealizedGain: 1014.30,
    unrealizedGainPercent: 8.49,
    weight: 7.8,
    sector: 'Technology',
    dividendYield: 0.00,
    dayChange: 15.25,
    dayChangePercent: 0.53
  },
  {
    symbol: 'JNJ',
    name: 'Johnson & Johnson',
    shares: 120,
    costBasis: 165.80,
    currentPrice: 158.45,
    marketValue: 19014.00,
    unrealizedGain: -882.00,
    unrealizedGainPercent: -4.43,
    weight: 11.4,
    sector: 'Healthcare',
    dividendYield: 2.91,
    dayChange: 0.85,
    dayChangePercent: 0.54
  }
];

const mockAllocationTargets: AllocationTarget[] = [
  { category: 'US Large Cap', current: 65, target: 60, difference: 5, recommendation: 'sell' },
  { category: 'International', current: 15, target: 20, difference: -5, recommendation: 'buy' },
  { category: 'Bonds', current: 12, target: 15, difference: -3, recommendation: 'buy' },
  { category: 'Cash', current: 5, target: 3, difference: 2, recommendation: 'sell' },
  { category: 'Alternatives', current: 3, target: 2, difference: 1, recommendation: 'hold' }
];

const mockMetrics: PortfolioMetrics = {
  totalValue: 485672.43,
  totalGain: 58421.32,
  totalGainPercent: 13.67,
  dayChange: 2847.21,
  dayChangePercent: 0.59,
  beta: 1.12,
  sharpeRatio: 1.84,
  volatility: 16.8,
  dividendYield: 1.23,
  expenseRatio: 0.08
};

const mockRiskMetrics: RiskMetrics = {
  var95: -12500,
  maxDrawdown: -18.4,
  correlation: 0.87,
  concentration: 23.5,
  rating: 'Moderate'
};

// Holdings table component
const HoldingsTable = ({ holdings }: { holdings: Holding[] }) => {
  const [sortField, setSortField] = useState<keyof Holding>('weight');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const sortedHoldings = [...holdings].sort((a, b) => {
    const aVal = a[sortField];
    const bVal = b[sortField];
    const direction = sortDirection === 'asc' ? 1 : -1;
    return aVal < bVal ? -direction : direction;
  });

  const handleSort = (field: keyof Holding) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5 text-teal-500" />
            <span>Holdings</span>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm">
              <Filter className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border text-sm text-muted-foreground">
                <th className="text-left p-3">Symbol</th>
                <th className="text-right p-3 cursor-pointer hover:text-foreground" onClick={() => handleSort('weight')}>
                  Weight {sortField === 'weight' && (sortDirection === 'asc' ? <ChevronUp className="inline h-3 w-3" /> : <ChevronDown className="inline h-3 w-3" />)}
                </th>
                <th className="text-right p-3 cursor-pointer hover:text-foreground" onClick={() => handleSort('marketValue')}>
                  Value
                </th>
                <th className="text-right p-3 cursor-pointer hover:text-foreground" onClick={() => handleSort('dayChangePercent')}>
                  Day Change
                </th>
                <th className="text-right p-3 cursor-pointer hover:text-foreground" onClick={() => handleSort('unrealizedGainPercent')}>
                  Total Return
                </th>
                <th className="text-center p-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {sortedHoldings.map((holding, index) => (
                <motion.tr
                  key={holding.symbol}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                >
                  <td className="p-3">
                    <div>
                      <div className="font-semibold">{holding.symbol}</div>
                      <div className="text-xs text-muted-foreground">{holding.name}</div>
                      <div className="text-xs text-muted-foreground">{holding.shares.toLocaleString()} shares</div>
                    </div>
                  </td>
                  <td className="p-3 text-right">
                    <div className="space-y-1">
                      <div className="font-medium">{holding.weight.toFixed(1)}%</div>
                      <div className="w-20 ml-auto">
                        <Progress value={holding.weight} className="h-2" />
                      </div>
                    </div>
                  </td>
                  <td className="p-3 text-right font-mono">
                    <div className="font-semibold">${holding.marketValue.toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground">
                      @ ${holding.currentPrice.toFixed(2)}
                    </div>
                  </td>
                  <td className="p-3 text-right">
                    <div className={`flex items-center justify-end space-x-1 ${
                      holding.dayChangePercent >= 0 ? 'text-green-500' : 'text-red-500'
                    }`}>
                      {holding.dayChangePercent >= 0 ? (
                        <ArrowUpRight className="h-3 w-3" />
                      ) : (
                        <ArrowDownRight className="h-3 w-3" />
                      )}
                      <span className="font-mono text-sm">
                        {holding.dayChangePercent.toFixed(2)}%
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground font-mono">
                      ${holding.dayChange.toFixed(2)}
                    </div>
                  </td>
                  <td className="p-3 text-right">
                    <div className={`${
                      holding.unrealizedGainPercent >= 0 ? 'text-green-500' : 'text-red-500'
                    }`}>
                      <div className="font-semibold font-mono">
                        {holding.unrealizedGainPercent.toFixed(2)}%
                      </div>
                      <div className="text-xs font-mono">
                        ${holding.unrealizedGain.toFixed(2)}
                      </div>
                    </div>
                  </td>
                  <td className="p-3 text-center">
                    <Button variant="ghost" size="sm">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

// Asset allocation component
const AssetAllocation = ({ targets }: { targets: AllocationTarget[] }) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <PieChart className="h-5 w-5 text-blue-500" />
          <span>Asset Allocation</span>
        </div>
        <Badge variant="secondary">Target vs Actual</Badge>
      </CardTitle>
    </CardHeader>
    <CardContent className="space-y-4">
      {targets.map((target, index) => (
        <motion.div
          key={target.category}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.1 }}
          className="space-y-2"
        >
          <div className="flex items-center justify-between">
            <span className="font-medium">{target.category}</span>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-muted-foreground">
                {target.current}% / {target.target}%
              </span>
              <Badge 
                variant={target.recommendation === 'buy' ? 'default' : target.recommendation === 'sell' ? 'destructive' : 'secondary'}
                className="text-xs"
              >
                {target.recommendation}
              </Badge>
            </div>
          </div>
          
          <div className="relative">
            <div className="flex h-6 rounded-full overflow-hidden bg-muted">
              <div 
                className="bg-teal-500 transition-all duration-500"
                style={{ width: `${target.current}%` }}
              />
              <div 
                className="bg-teal-200 dark:bg-teal-800 transition-all duration-500"
                style={{ width: `${Math.max(0, target.target - target.current)}%` }}
              />
            </div>
            <div 
              className="absolute top-0 h-6 w-0.5 bg-yellow-500"
              style={{ left: `${target.target}%` }}
            />
          </div>
          
          {Math.abs(target.difference) > 1 && (
            <div className="text-xs text-muted-foreground">
              {target.difference > 0 ? 'Overweight by' : 'Underweight by'} {Math.abs(target.difference)}%
            </div>
          )}
        </motion.div>
      ))}
    </CardContent>
  </Card>
);

// Portfolio metrics component
const PortfolioMetrics = ({ metrics }: { metrics: PortfolioMetrics }) => (
  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
    <Card className="p-4">
      <div className="flex items-center space-x-2 mb-2">
        <DollarSign className="h-4 w-4 text-teal-500" />
        <span className="text-sm text-muted-foreground">Total Value</span>
      </div>
      <div className="text-2xl font-bold font-mono">
        ${metrics.totalValue.toLocaleString()}
      </div>
      <div className={`text-sm flex items-center ${
        metrics.dayChangePercent >= 0 ? 'text-green-500' : 'text-red-500'
      }`}>
        {metrics.dayChangePercent >= 0 ? (
          <ArrowUpRight className="h-3 w-3 mr-1" />
        ) : (
          <ArrowDownRight className="h-3 w-3 mr-1" />
        )}
        {metrics.dayChangePercent.toFixed(2)}% today
      </div>
    </Card>

    <Card className="p-4">
      <div className="flex items-center space-x-2 mb-2">
        <TrendingUp className="h-4 w-4 text-green-500" />
        <span className="text-sm text-muted-foreground">Total Return</span>
      </div>
      <div className="text-2xl font-bold text-green-500">
        +{metrics.totalGainPercent.toFixed(2)}%
      </div>
      <div className="text-sm font-mono text-green-500">
        +${metrics.totalGain.toLocaleString()}
      </div>
    </Card>

    <Card className="p-4">
      <div className="flex items-center space-x-2 mb-2">
        <Activity className="h-4 w-4 text-orange-500" />
        <span className="text-sm text-muted-foreground">Sharpe Ratio</span>
      </div>
      <div className="text-2xl font-bold">
        {metrics.sharpeRatio.toFixed(2)}
      </div>
      <div className="text-sm text-muted-foreground">
        Risk-adjusted return
      </div>
    </Card>

    <Card className="p-4">
      <div className="flex items-center space-x-2 mb-2">
        <Shield className="h-4 w-4 text-blue-500" />
        <span className="text-sm text-muted-foreground">Beta</span>
      </div>
      <div className="text-2xl font-bold">
        {metrics.beta.toFixed(2)}
      </div>
      <div className="text-sm text-muted-foreground">
        vs S&P 500
      </div>
    </Card>
  </div>
);

// Main portfolio manager component
export function AdvancedPortfolioManager() {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="min-h-screen bg-background p-4 lg:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Portfolio Manager</h1>
          <p className="text-muted-foreground">
            Advanced portfolio analytics with AI-powered insights
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Sync Data
          </Button>
          <Button>
            <Brain className="h-4 w-4 mr-2" />
            AI Rebalance
          </Button>
        </div>
      </div>

      {/* Portfolio Metrics */}
      <div className="mb-8">
        <PortfolioMetrics metrics={mockMetrics} />
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-4 w-full max-w-2xl">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="allocation">Allocation</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="risk">Risk Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2">
              <HoldingsTable holdings={mockHoldings} />
            </div>
            <div className="space-y-6">
              <AssetAllocation targets={mockAllocationTargets} />
              
              {/* AI Recommendations */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Sparkles className="h-5 w-5 text-purple-500" />
                    <span>AI Recommendations</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Alert>
                    <Target className="h-4 w-4" />
                    <AlertDescription>
                      Consider rebalancing: Reduce tech allocation by 5% and increase international exposure.
                    </AlertDescription>
                  </Alert>
                  
                  <Alert>
                    <TrendingUp className="h-4 w-4" />
                    <AlertDescription>
                      Healthcare sector showing momentum. Consider increasing JNJ position or adding new healthcare ETF.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="allocation">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <AssetAllocation targets={mockAllocationTargets} />
            <Card>
              <CardHeader>
                <CardTitle>Rebalancing Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center p-2 border rounded">
                    <span>Sell 25 shares AAPL</span>
                    <Badge variant="destructive">Sell</Badge>
                  </div>
                  <div className="flex justify-between items-center p-2 border rounded">
                    <span>Buy $5,000 VTIAX</span>
                    <Badge variant="default">Buy</Badge>
                  </div>
                  <div className="flex justify-between items-center p-2 border rounded">
                    <span>Buy $3,000 BND</span>
                    <Badge variant="default">Buy</Badge>
                  </div>
                </div>
                <Button className="w-full mt-4">
                  Execute Rebalancing Plan
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Portfolio Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <PerformanceChart height={400} days={365} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="risk">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Risk Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 border rounded">
                    <div className="text-sm text-muted-foreground">Value at Risk (95%)</div>
                    <div className="text-lg font-bold text-red-500">
                      ${Math.abs(mockRiskMetrics.var95).toLocaleString()}
                    </div>
                  </div>
                  <div className="p-4 border rounded">
                    <div className="text-sm text-muted-foreground">Max Drawdown</div>
                    <div className="text-lg font-bold text-red-500">
                      {mockRiskMetrics.maxDrawdown.toFixed(1)}%
                    </div>
                  </div>
                  <div className="p-4 border rounded">
                    <div className="text-sm text-muted-foreground">Correlation to SPY</div>
                    <div className="text-lg font-bold">
                      {mockRiskMetrics.correlation.toFixed(2)}
                    </div>
                  </div>
                  <div className="p-4 border rounded">
                    <div className="text-sm text-muted-foreground">Concentration Risk</div>
                    <div className="text-lg font-bold text-orange-500">
                      {mockRiskMetrics.concentration.toFixed(1)}%
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Risk Assessment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center p-6">
                  <div className="text-3xl font-bold text-orange-500 mb-2">
                    {mockRiskMetrics.rating}
                  </div>
                  <div className="text-sm text-muted-foreground mb-4">
                    Your portfolio risk level
                  </div>
                  <div className="w-full bg-muted rounded-full h-2 mb-4">
                    <div className="bg-orange-500 h-2 rounded-full w-1/2"></div>
                  </div>
                  <p className="text-sm">
                    Your portfolio shows moderate risk with good diversification. 
                    Consider reducing concentration risk in technology sector.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}