"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';

// Modern market data
const marketData = [
  { symbol: 'AAPL', price: 175.25, change: 1.24, volume: '45.2M', marketCap: '2.8T', trend: 'up' },
  { symbol: 'MSFT', price: 335.80, change: -0.43, volume: '32.1M', marketCap: '2.5T', trend: 'down' },
  { symbol: 'GOOGL', price: 2875.40, change: 0.53, volume: '28.7M', marketCap: '1.9T', trend: 'up' },
  { symbol: 'TSLA', price: 245.80, change: -2.15, volume: '67.3M', marketCap: '780B', trend: 'down' },
  { symbol: 'NVDA', price: 875.30, change: 3.42, volume: '89.1M', marketCap: '2.2T', trend: 'up' }
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
  { name: 'US Large Cap', value: 45, color: '#6366F1' },
  { name: 'International', value: 25, color: '#8B5CF6' },
  { name: 'Bonds', value: 20, color: '#10B981' },
  { name: 'Cash', value: 10, color: '#F59E0B' }
];

// AI insights
const aiInsights = [
  {
    type: 'bullish',
    title: 'Tech Momentum Strong',
    description: 'AI models detect strong upward momentum in technology sector',
    confidence: 87,
    action: 'Consider increasing tech allocation',
    icon: '📈'
  },
  {
    type: 'warning',
    title: 'Concentration Risk',
    description: 'Portfolio is 45% concentrated in tech sector',
    confidence: 92,
    action: 'Diversify into other sectors',
    icon: '⚠️'
  },
  {
    type: 'opportunity',
    title: 'Healthcare Undervalued',
    description: 'Healthcare sector shows strong fundamentals with low valuation',
    confidence: 78,
    action: 'Consider healthcare exposure',
    icon: '💡'
  }
];

export function ModernDashboard() {
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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-background/95">
      {/* Modern Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              Welcome back, {user?.firstName || 'Investor'}
            </h1>
            <p className="text-muted-foreground mt-2">
              Your AI-powered investment dashboard • Last updated: {new Date().toLocaleTimeString()}
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Badge className="bg-gradient-to-r from-green-500 to-green-600">
              📊 Live Data
            </Badge>
            <Badge className="bg-gradient-to-r from-purple-500 to-pink-500">
              🤖 AI Active
            </Badge>
            <Badge variant="outline">
              🔒 SECP Compliant
            </Badge>
          </div>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="card-modern group">
          <CardContent className="p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-primary/10 rounded-xl flex items-center justify-center">
                <span className="text-2xl">💰</span>
              </div>
              <div>
                <p className="text-sm text-muted-foreground font-medium">Portfolio Value</p>
                <p className="text-3xl font-bold font-mono">
                  ${totalValue.toLocaleString()}
                </p>
              </div>
            </div>
            <div className={`flex items-center text-sm ${dayChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              <span className="mr-2">{dayChange >= 0 ? '↗️' : '↘️'}</span>
              ${Math.abs(dayChange).toLocaleString()} ({dayChangePercent.toFixed(2)}%)
            </div>
          </CardContent>
        </Card>

        <Card className="card-modern group">
          <CardContent className="p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-success/20 to-success/10 rounded-xl flex items-center justify-center">
                <span className="text-2xl">📈</span>
              </div>
              <div>
                <p className="text-sm text-muted-foreground font-medium">Total Return</p>
                <p className="text-3xl font-bold text-green-400">
                  +12.4%
                </p>
              </div>
            </div>
            <div className="text-sm text-muted-foreground">
              +$60,127.43 YTD
            </div>
          </CardContent>
        </Card>

        <Card className="card-modern group">
          <CardContent className="p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-accent/20 to-accent/10 rounded-xl flex items-center justify-center">
                <span className="text-2xl">⚡</span>
              </div>
              <div>
                <p className="text-sm text-muted-foreground font-medium">Sharpe Ratio</p>
                <p className="text-3xl font-bold">1.84</p>
              </div>
            </div>
            <div className="text-sm text-muted-foreground">
              Risk-adjusted return
            </div>
          </CardContent>
        </Card>

        <Card className="card-modern group">
          <CardContent className="p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500/20 to-pink-500/10 rounded-xl flex items-center justify-center">
                <span className="text-2xl">🤖</span>
              </div>
              <div>
                <p className="text-sm text-muted-foreground font-medium">AI Confidence</p>
                <p className="text-3xl font-bold text-purple-400">87%</p>
              </div>
            </div>
            <div className="text-sm text-muted-foreground">
              Prediction accuracy
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Dashboard */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-4 w-full max-w-2xl bg-card-secondary/50 backdrop-blur-sm border border-border/50">
          <TabsTrigger value="overview" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">📊 Overview</TabsTrigger>
          <TabsTrigger value="markets" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">🌐 Markets</TabsTrigger>
          <TabsTrigger value="ai" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">🧠 AI Insights</TabsTrigger>
          <TabsTrigger value="analytics" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">📈 Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Performance Chart */}
            <div className="xl:col-span-2">
              <Card className="card-modern">
                <CardHeader className="card-modern-header">
                  <div>
                    <CardTitle className="card-modern-title">📈 Portfolio Performance</CardTitle>
                    <p className="card-modern-subtitle">6-month performance vs benchmark</p>
                  </div>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm" className="btn-modern-secondary">1D</Button>
                    <Button variant="outline" size="sm" className="btn-modern-secondary">1W</Button>
                    <Button variant="outline" size="sm" className="btn-modern-secondary">1M</Button>
                    <Button variant="outline" size="sm" className="btn-modern-secondary">1Y</Button>
                  </div>
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
                        stroke="#6366F1"
                        strokeWidth={3}
                        name="Portfolio"
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="benchmark"
                        stroke="#8B5CF6"
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        name="Benchmark"
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Asset Allocation */}
            <div>
              <Card className="card-modern">
                <CardHeader className="card-modern-header">
                  <div>
                    <CardTitle className="card-modern-title">🥧 Asset Allocation</CardTitle>
                    <p className="card-modern-subtitle">Current portfolio breakdown</p>
                  </div>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={allocationData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
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
                  <div className="space-y-3 mt-4">
                    {allocationData.map((item) => (
                      <div key={item.name} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: item.color }}
                          />
                          <span className="text-sm font-medium">{item.name}</span>
                        </div>
                        <span className="text-sm font-bold">{item.value}%</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* AI Insights */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {aiInsights.map((insight, index) => (
              <Alert key={index} className={`border-l-4 p-6 ${
                insight.type === 'bullish' ? 'border-l-green-500 bg-green-500/5' :
                insight.type === 'warning' ? 'border-l-yellow-500 bg-yellow-500/5' :
                'border-l-blue-500 bg-blue-500/5'
              }`}>
                <div className={`text-2xl mb-3 ${
                  insight.type === 'bullish' ? 'text-green-400' :
                  insight.type === 'warning' ? 'text-yellow-400' :
                  'text-blue-400'
                }`}>
                  {insight.icon}
                </div>
                <AlertDescription>
                  <div className="font-semibold mb-2 text-foreground">{insight.title}</div>
                  <div className="text-sm text-muted-foreground mb-3">
                    {insight.description}
                  </div>
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="bg-background/50">{insight.confidence}% confidence</Badge>
                    <Button variant="outline" size="sm" className="btn-modern-secondary">
                      {insight.action}
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="markets">
          <Card className="card-modern">
            <CardHeader className="card-modern-header">
              <div>
                <CardTitle className="card-modern-title">🌐 Live Market Data</CardTitle>
                <p className="card-modern-subtitle">Real-time stock prices and market information</p>
              </div>
              <div className="flex space-x-3">
                <Button variant="outline" size="sm" className="btn-modern-secondary">Watchlist</Button>
                <Button variant="outline" size="sm" className="btn-modern-secondary">Screener</Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="table-modern">
                  <thead>
                    <tr>
                      <th className="text-left">Symbol</th>
                      <th className="text-right">Price</th>
                      <th className="text-right">Change</th>
                      <th className="text-right">Volume</th>
                      <th className="text-right">Market Cap</th>
                      <th className="text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {realTimeData.map((stock) => (
                      <tr key={stock.symbol}>
                        <td>
                          <div>
                            <div className="font-bold text-foreground">{stock.symbol}</div>
                            <div className="text-xs text-muted-foreground">Technology</div>
                          </div>
                        </td>
                        <td className="text-right font-mono font-bold">
                          ${stock.price.toFixed(2)}
                        </td>
                        <td className={`text-right ${stock.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          <div className="font-bold">
                            {stock.change >= 0 ? '+' : ''}{stock.change.toFixed(2)}%
                          </div>
                        </td>
                        <td className="text-right font-mono text-sm">
                          {stock.volume}
                        </td>
                        <td className="text-right font-mono text-sm">
                          {stock.marketCap}
                        </td>
                        <td className="text-center">
                          <Button size="sm" className="btn-modern">
                            Trade
                          </Button>
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
            <Card className="card-modern">
              <CardHeader className="card-modern-header">
                <CardTitle className="card-modern-title">🧠 AI Model Performance</CardTitle>
                <p className="card-modern-subtitle">Real-time AI accuracy and predictions</p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-6 bg-gradient-to-br from-green-500/10 to-green-500/5 rounded-xl border border-green-500/20">
                    <div className="text-3xl font-bold text-green-400 mb-2">87%</div>
                    <div className="text-sm text-muted-foreground font-medium">Prediction Accuracy</div>
                    <Progress value={87} className="mt-3 h-2" />
                  </div>
                  <div className="p-6 bg-gradient-to-br from-blue-500/10 to-blue-500/5 rounded-xl border border-blue-500/20">
                    <div className="text-3xl font-bold text-blue-400 mb-2">+2.3%</div>
                    <div className="text-sm text-muted-foreground font-medium">Alpha Generated</div>
                    <Progress value={75} className="mt-3 h-2" />
                  </div>
                  <div className="p-6 bg-gradient-to-br from-purple-500/10 to-purple-500/5 rounded-xl border border-purple-500/20">
                    <div className="text-3xl font-bold text-purple-400 mb-2">1.84</div>
                    <div className="text-sm text-muted-foreground font-medium">Sharpe Ratio</div>
                    <Progress value={65} className="mt-3 h-2" />
                  </div>
                  <div className="p-6 bg-gradient-to-br from-orange-500/10 to-orange-500/5 rounded-xl border border-orange-500/20">
                    <div className="text-3xl font-bold text-orange-400 mb-2">92%</div>
                    <div className="text-sm text-muted-foreground font-medium">Risk Detection</div>
                    <Progress value={92} className="mt-3 h-2" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="card-modern">
              <CardHeader className="card-modern-header">
                <CardTitle className="card-modern-title">🎯 AI Recommendations</CardTitle>
                <p className="card-modern-subtitle">Personalized investment insights</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-6 border border-green-500/20 rounded-xl bg-gradient-to-r from-green-500/5 to-green-500/10">
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-bold text-green-400">📈 BUY Signal</span>
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/30">92% confidence</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      Strong momentum in technology sector with positive earnings sentiment
                    </p>
                    <div className="text-xs text-green-400 mb-3">
                      Target: $180.00 | Stop: $170.00
                    </div>
                    <Button size="sm" className="btn-modern w-full">
                      Execute Trade
                    </Button>
                  </div>

                  <div className="p-6 border border-yellow-500/20 rounded-xl bg-gradient-to-r from-yellow-500/5 to-yellow-500/10">
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-bold text-yellow-400">⚠️ Risk Alert</span>
                      <Badge variant="destructive">High</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      Portfolio concentration risk detected in tech sector
                    </p>
                    <Button variant="outline" size="sm" className="btn-modern-secondary w-full">
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
            <Card className="card-modern">
              <CardHeader className="card-modern-header">
                <CardTitle className="card-modern-title">📊 Risk Analytics</CardTitle>
                <p className="card-modern-subtitle">Advanced risk metrics and analysis</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-4 border border-border/50 rounded-lg bg-card-secondary/50">
                    <span className="font-medium">Value at Risk (95%)</span>
                    <span className="font-mono font-bold text-red-400">$12,500</span>
                  </div>
                  <div className="flex justify-between items-center p-4 border border-border/50 rounded-lg bg-card-secondary/50">
                    <span className="font-medium">Maximum Drawdown</span>
                    <span className="font-mono font-bold text-red-400">-18.4%</span>
                  </div>
                  <div className="flex justify-between items-center p-4 border border-border/50 rounded-lg bg-card-secondary/50">
                    <span className="font-medium">Beta vs Market</span>
                    <span className="font-mono font-bold">1.12</span>
                  </div>
                  <div className="flex justify-between items-center p-4 border border-border/50 rounded-lg bg-card-secondary/50">
                    <span className="font-medium">Volatility</span>
                    <span className="font-mono font-bold text-orange-400">15.2%</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="card-modern">
              <CardHeader className="card-modern-header">
                <CardTitle className="card-modern-title">🎯 Performance Attribution</CardTitle>
                <p className="card-modern-subtitle">Sector contribution analysis</p>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={[
                    { sector: 'Tech', contribution: 45, color: '#6366F1' },
                    { sector: 'Healthcare', contribution: 25, color: '#8B5CF6' },
                    { sector: 'Finance', contribution: 15, color: '#10B981' },
                    { sector: 'Energy', contribution: 10, color: '#F59E0B' },
                    { sector: 'Other', contribution: 5, color: '#EF4444' }
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="sector" stroke="hsl(var(--muted-foreground))" />
                    <YAxis stroke="hsl(var(--muted-foreground))" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: 'var(--radius)',
                      }}
                    />
                    <Bar dataKey="contribution" fill="#6366F1" radius={[4, 4, 0, 0]} />
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