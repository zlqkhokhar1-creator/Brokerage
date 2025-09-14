"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';

// Enhanced market data
const marketData = [
  { symbol: 'AAPL', price: 175.25, change: 1.24, volume: '45.2M', marketCap: '2.8T' },
  { symbol: 'MSFT', price: 335.80, change: -0.43, volume: '32.1M', marketCap: '2.5T' },
  { symbol: 'GOOGL', price: 2875.40, change: 0.53, volume: '28.7M', marketCap: '1.9T' },
  { symbol: 'TSLA', price: 245.80, change: -2.15, volume: '67.3M', marketCap: '780B' },
  { symbol: 'NVDA', price: 875.30, change: 3.42, volume: '89.1M', marketCap: '2.2T' }
];

// Portfolio performance data
const performanceData = [
  { date: 'Jan', value: 100000, benchmark: 98000 },
  { date: 'Feb', value: 102500, benchmark: 99500 },
  { date: 'Mar', value: 101200, benchmark: 101000 },
  { date: 'Apr', value: 105800, benchmark: 103500 },
  { date: 'May', value: 108900, benchmark: 106200 },
  { date: 'Jun', value: 112400, benchmark: 108900 }
];

// Asset allocation data
const allocationData = [
  { name: 'US Large Cap', value: 45, color: '#00E6B8' },
  { name: 'International', value: 25, color: '#FFB300' },
  { name: 'Bonds', value: 20, color: '#7FB3FF' },
  { name: 'Cash', value: 10, color: '#A855F7' }
];

// AI insights
const aiInsights = [
  {
    type: 'bullish',
    title: 'Tech Momentum Strong',
    description: 'AI models detect strong upward momentum in technology sector',
    confidence: 87,
    action: 'Consider increasing tech allocation'
  },
  {
    type: 'warning',
    title: 'Concentration Risk',
    description: 'Portfolio is 45% concentrated in tech sector',
    confidence: 92,
    action: 'Diversify into other sectors'
  },
  {
    type: 'opportunity',
    title: 'Healthcare Undervalued',
    description: 'Healthcare sector shows strong fundamentals with low valuation',
    confidence: 78,
    action: 'Consider healthcare exposure'
  }
];

export function EnhancedDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [realTimeData, setRealTimeData] = useState(marketData);

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setRealTimeData(prev => prev.map(item => ({
        ...item,
        price: item.price + (Math.random() - 0.5) * 2,
        change: item.change + (Math.random() - 0.5) * 0.5
      })));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const totalValue = 485672.43;
  const dayChange = 2847.21;
  const dayChangePercent = 0.59;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-background/95 p-4 lg:p-6">
      {/* Enhanced Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              Good morning, {user?.firstName || 'Investor'}
            </h1>
            <p className="text-muted-foreground mt-2">
              Your AI-powered investment dashboard • Last updated: {new Date().toLocaleTimeString()}
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Badge className="bg-gradient-to-r from-green-500 to-green-600">
              📊 Live Data
            </Badge>
            <Badge variant="outline">
              🤖 AI Active
            </Badge>
            <Badge variant="outline">
              🔒 SECP Compliant
            </Badge>
          </div>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="p-6 bg-gradient-to-br from-card to-card/80 border border-border/50">
          <div className="flex items-center space-x-3 mb-3">
            <span className="text-2xl">💰</span>
            <span className="text-sm text-muted-foreground font-medium">Portfolio Value</span>
          </div>
          <div className="text-3xl font-bold font-mono">
            ${totalValue.toLocaleString()}
          </div>
          <div className={`flex items-center text-sm mt-2 ${dayChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            <span className="mr-1">{dayChange >= 0 ? '↗️' : '↘️'}</span>
            ${Math.abs(dayChange).toLocaleString()} ({dayChangePercent.toFixed(2)}%)
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-card to-card/80 border border-border/50">
          <div className="flex items-center space-x-3 mb-3">
            <span className="text-2xl">📈</span>
            <span className="text-sm text-muted-foreground font-medium">Total Return</span>
          </div>
          <div className="text-3xl font-bold text-green-500">
            +12.4%
          </div>
          <div className="text-sm text-muted-foreground mt-2">
            +$60,127.43 YTD
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-card to-card/80 border border-border/50">
          <div className="flex items-center space-x-3 mb-3">
            <span className="text-2xl">⚡</span>
            <span className="text-sm text-muted-foreground font-medium">Sharpe Ratio</span>
          </div>
          <div className="text-3xl font-bold">1.84</div>
          <div className="text-sm text-muted-foreground mt-2">
            Risk-adjusted return
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-card to-card/80 border border-border/50">
          <div className="flex items-center space-x-3 mb-3">
            <span className="text-2xl">🎯</span>
            <span className="text-sm text-muted-foreground font-medium">AI Confidence</span>
          </div>
          <div className="text-3xl font-bold text-purple-500">87%</div>
          <div className="text-sm text-muted-foreground mt-2">
            Prediction accuracy
          </div>
        </Card>
      </div>

      {/* Main Dashboard */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-4 w-full max-w-2xl bg-card/50 backdrop-blur-sm">
          <TabsTrigger value="overview">📊 Overview</TabsTrigger>
          <TabsTrigger value="markets">🌐 Markets</TabsTrigger>
          <TabsTrigger value="ai">🧠 AI Insights</TabsTrigger>
          <TabsTrigger value="analytics">📈 Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Performance Chart */}
            <div className="xl:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>📈 Portfolio Performance</span>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm">1D</Button>
                      <Button variant="outline" size="sm">1W</Button>
                      <Button variant="outline" size="sm">1M</Button>
                      <Button variant="outline" size="sm">1Y</Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={performanceData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
                      <YAxis stroke="hsl(var(--muted-foreground))" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: 'var(--radius)',
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke="#00E6B8"
                        strokeWidth={2}
                        name="Portfolio"
                      />
                      <Line
                        type="monotone"
                        dataKey="benchmark"
                        stroke="#FFB300"
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        name="Benchmark"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Asset Allocation */}
            <div>
              <Card>
                <CardHeader>
                  <CardTitle>🥧 Asset Allocation</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={allocationData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {allocationData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-2 mt-4">
                    {allocationData.map((item) => (
                      <div key={item.name} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: item.color }}
                          />
                          <span className="text-sm">{item.name}</span>
                        </div>
                        <span className="text-sm font-medium">{item.value}%</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* AI Insights */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {aiInsights.map((insight, index) => (
              <Alert key={index} className={`border-l-4 ${
                insight.type === 'bullish' ? 'border-l-green-500 bg-green-50 dark:bg-green-900/20' :
                insight.type === 'warning' ? 'border-l-yellow-500 bg-yellow-50 dark:bg-yellow-900/20' :
                'border-l-blue-500 bg-blue-50 dark:bg-blue-900/20'
              }`}>
                <div className={`text-lg ${
                  insight.type === 'bullish' ? 'text-green-600' :
                  insight.type === 'warning' ? 'text-yellow-600' :
                  'text-blue-600'
                }`}>
                  {insight.type === 'bullish' ? '📈' : insight.type === 'warning' ? '⚠️' : '💡'}
                </div>
                <AlertDescription>
                  <div className="font-medium mb-1">{insight.title}</div>
                  <div className="text-sm text-muted-foreground mb-2">
                    {insight.description}
                  </div>
                  <div className="flex items-center justify-between">
                    <Badge variant="outline">{insight.confidence}% confidence</Badge>
                    <Button variant="ghost" size="sm">{insight.action}</Button>
                  </div>
                </AlertDescription>
              </Alert>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="markets">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>🌐 Live Market Data</span>
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm">Watchlist</Button>
                  <Button variant="outline" size="sm">Screener</Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left p-3 font-medium">Symbol</th>
                      <th className="text-right p-3 font-medium">Price</th>
                      <th className="text-right p-3 font-medium">Change</th>
                      <th className="text-right p-3 font-medium">Volume</th>
                      <th className="text-right p-3 font-medium">Market Cap</th>
                      <th className="text-center p-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {realTimeData.map((stock) => (
                      <tr key={stock.symbol} className="border-b border-border/50 hover:bg-muted/30">
                        <td className="p-3">
                          <div>
                            <div className="font-semibold">{stock.symbol}</div>
                            <div className="text-xs text-muted-foreground">Technology</div>
                          </div>
                        </td>
                        <td className="p-3 text-right font-mono">
                          ${stock.price.toFixed(2)}
                        </td>
                        <td className={`p-3 text-right ${stock.change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          <div className="font-medium">
                            {stock.change >= 0 ? '+' : ''}{stock.change.toFixed(2)}%
                          </div>
                        </td>
                        <td className="p-3 text-right font-mono text-sm">
                          {stock.volume}
                        </td>
                        <td className="p-3 text-right font-mono text-sm">
                          {stock.marketCap}
                        </td>
                        <td className="p-3 text-center">
                          <Button variant="ghost" size="sm">Trade</Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>🧠 AI Model Performance</CardTitle>
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
                  <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">1.84</div>
                    <div className="text-sm text-muted-foreground">Sharpe Ratio</div>
                  </div>
                  <div className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">92%</div>
                    <div className="text-sm text-muted-foreground">Risk Detection</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>🎯 AI Recommendations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 border rounded-lg bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-green-800 dark:text-green-200">📈 BUY Signal</span>
                      <Badge className="bg-green-600">92% confidence</Badge>
                    </div>
                    <p className="text-sm text-green-700 dark:text-green-300 mb-2">
                      Strong momentum in technology sector with positive earnings sentiment
                    </p>
                    <div className="text-xs text-green-600 dark:text-green-400">
                      Target: $180.00 | Stop: $170.00
                    </div>
                  </div>

                  <div className="p-4 border rounded-lg bg-gradient-to-r from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-yellow-800 dark:text-yellow-200">⚠️ Risk Alert</span>
                      <Badge variant="destructive">High</Badge>
                    </div>
                    <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-2">
                      Portfolio concentration risk detected in tech sector
                    </p>
                    <Button variant="outline" size="sm" className="w-full">
                      Rebalance Portfolio
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="analytics">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>📊 Risk Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 border rounded">
                    <span>Value at Risk (95%)</span>
                    <span className="font-mono font-bold text-red-500">$12,500</span>
                  </div>
                  <div className="flex justify-between items-center p-3 border rounded">
                    <span>Maximum Drawdown</span>
                    <span className="font-mono font-bold text-red-500">-18.4%</span>
                  </div>
                  <div className="flex justify-between items-center p-3 border rounded">
                    <span>Beta vs Market</span>
                    <span className="font-mono font-bold">1.12</span>
                  </div>
                  <div className="flex justify-between items-center p-3 border rounded">
                    <span>Volatility</span>
                    <span className="font-mono font-bold text-orange-500">15.2%</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>🎯 Performance Attribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={[
                    { sector: 'Tech', contribution: 45 },
                    { sector: 'Healthcare', contribution: 25 },
                    { sector: 'Finance', contribution: 15 },
                    { sector: 'Energy', contribution: 10 },
                    { sector: 'Other', contribution: 5 }
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="sector" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="contribution" fill="#00E6B8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}