"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { PerformanceChart } from '@/components/PerformanceChart';

// Mock portfolio data
const mockHoldings = [
  {
    symbol: 'AAPL',
    name: 'Apple Inc.',
    shares: 150,
    currentPrice: 175.25,
    marketValue: 26287.50,
    unrealizedGain: 4462.50,
    unrealizedGainPercent: 20.43,
    weight: 15.8,
    dayChangePercent: 1.24
  },
  {
    symbol: 'MSFT',
    name: 'Microsoft Corporation',
    shares: 85,
    currentPrice: 335.80,
    marketValue: 28543.00,
    unrealizedGain: 2176.00,
    unrealizedGainPercent: 8.25,
    weight: 17.2,
    dayChangePercent: -0.43
  },
  {
    symbol: 'GOOGL',
    name: 'Alphabet Inc.',
    shares: 45,
    currentPrice: 2875.40,
    marketValue: 129393.00,
    unrealizedGain: 10143.00,
    unrealizedGainPercent: 8.49,
    weight: 7.8,
    dayChangePercent: 0.53
  }
];

const mockAllocation = [
  { category: 'US Large Cap', current: 65, target: 60 },
  { category: 'International', current: 15, target: 20 },
  { category: 'Bonds', current: 12, target: 15 },
  { category: 'Cash', current: 5, target: 3 },
  { category: 'Alternatives', current: 3, target: 2 }
];

export function SimplePortfolio() {
  const [activeTab, setActiveTab] = useState('overview');

  const totalValue = mockHoldings.reduce((sum, holding) => sum + holding.marketValue, 0);
  const totalGain = mockHoldings.reduce((sum, holding) => sum + holding.unrealizedGain, 0);
  const totalGainPercent = (totalGain / (totalValue - totalGain)) * 100;

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
          <Button variant="outline">🔄 Sync Data</Button>
          <Button>🧠 AI Rebalance</Button>
        </div>
      </div>

      {/* Portfolio Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="p-4">
          <div className="flex items-center space-x-2 mb-2">
            <span>💰</span>
            <span className="text-sm text-muted-foreground">Total Value</span>
          </div>
          <div className="text-2xl font-bold font-mono">
            ${totalValue.toLocaleString()}
          </div>
          <div className="text-sm text-green-500">
            ↗️ +0.59% today
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-2 mb-2">
            <span>📈</span>
            <span className="text-sm text-muted-foreground">Total Return</span>
          </div>
          <div className="text-2xl font-bold text-green-500">
            +{totalGainPercent.toFixed(2)}%
          </div>
          <div className="text-sm font-mono text-green-500">
            +${totalGain.toLocaleString()}
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-2 mb-2">
            <span>⚡</span>
            <span className="text-sm text-muted-foreground">Sharpe Ratio</span>
          </div>
          <div className="text-2xl font-bold">1.84</div>
          <div className="text-sm text-muted-foreground">Risk-adjusted return</div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-2 mb-2">
            <span>🛡️</span>
            <span className="text-sm text-muted-foreground">Beta</span>
          </div>
          <div className="text-2xl font-bold">1.12</div>
          <div className="text-sm text-muted-foreground">vs S&P 500</div>
        </Card>
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
            {/* Holdings Table */}
            <div className="xl:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>📊 Holdings</span>
                    <Button variant="ghost" size="sm">📥 Export</Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border text-sm text-muted-foreground">
                          <th className="text-left p-3">Symbol</th>
                          <th className="text-right p-3">Weight</th>
                          <th className="text-right p-3">Value</th>
                          <th className="text-right p-3">Day Change</th>
                          <th className="text-right p-3">Total Return</th>
                        </tr>
                      </thead>
                      <tbody>
                        {mockHoldings.map((holding) => (
                          <tr key={holding.symbol} className="border-b border-border/50 hover:bg-muted/30">
                            <td className="p-3">
                              <div>
                                <div className="font-semibold">{holding.symbol}</div>
                                <div className="text-xs text-muted-foreground">{holding.name}</div>
                                <div className="text-xs text-muted-foreground">{holding.shares} shares</div>
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
                              <div className="text-xs text-muted-foreground">@ ${holding.currentPrice.toFixed(2)}</div>
                            </td>
                            <td className="p-3 text-right">
                              <div className={`${holding.dayChangePercent >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                {holding.dayChangePercent >= 0 ? '↗️' : '↘️'} {holding.dayChangePercent.toFixed(2)}%
                              </div>
                            </td>
                            <td className="p-3 text-right">
                              <div className={`${holding.unrealizedGainPercent >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                <div className="font-semibold">{holding.unrealizedGainPercent.toFixed(2)}%</div>
                                <div className="text-xs">${holding.unrealizedGain.toFixed(2)}</div>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Asset Allocation */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>🥧 Asset Allocation</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {mockAllocation.map((allocation) => (
                    <div key={allocation.category} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{allocation.category}</span>
                        <span className="text-sm text-muted-foreground">
                          {allocation.current}% / {allocation.target}%
                        </span>
                      </div>
                      <div className="relative">
                        <div className="flex h-6 rounded-full overflow-hidden bg-muted">
                          <div 
                            className="bg-teal-500 transition-all duration-500"
                            style={{ width: `${allocation.current}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* AI Recommendations */}
              <Card>
                <CardHeader>
                  <CardTitle>✨ AI Recommendations</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-3 border rounded-lg bg-yellow-50 dark:bg-yellow-900/20">
                    <div className="font-medium text-sm">⚠️ Rebalance Needed</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Reduce tech allocation by 5% and increase international exposure
                    </div>
                  </div>
                  
                  <div className="p-3 border rounded-lg bg-blue-50 dark:bg-blue-900/20">
                    <div className="font-medium text-sm">📈 Healthcare Momentum</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Consider increasing healthcare sector allocation
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="allocation">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>🎯 Target Allocation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {mockAllocation.map((allocation) => (
                  <div key={allocation.category} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{allocation.category}</span>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-muted-foreground">
                          {allocation.current}% → {allocation.target}%
                        </span>
                        <Badge variant={allocation.current > allocation.target ? 'destructive' : allocation.current < allocation.target ? 'default' : 'secondary'}>
                          {allocation.current > allocation.target ? 'Reduce' : allocation.current < allocation.target ? 'Increase' : 'On Target'}
                        </Badge>
                      </div>
                    </div>
                    <Progress value={allocation.current} className="h-3" />
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>🔄 Rebalancing Actions</CardTitle>
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
                <Button className="w-full mt-4">Execute Rebalancing Plan</Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance">
          <Card>
            <CardHeader>
              <CardTitle>📈 Portfolio Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <PerformanceChart height={400} days={365} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="risk">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>🛡️ Risk Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 border rounded">
                    <div className="text-sm text-muted-foreground">Value at Risk (95%)</div>
                    <div className="text-lg font-bold text-red-500">$12,500</div>
                  </div>
                  <div className="p-4 border rounded">
                    <div className="text-sm text-muted-foreground">Max Drawdown</div>
                    <div className="text-lg font-bold text-red-500">-18.4%</div>
                  </div>
                  <div className="p-4 border rounded">
                    <div className="text-sm text-muted-foreground">Beta</div>
                    <div className="text-lg font-bold">1.12</div>
                  </div>
                  <div className="p-4 border rounded">
                    <div className="text-sm text-muted-foreground">Sharpe Ratio</div>
                    <div className="text-lg font-bold">1.84</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>📊 Risk Assessment</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center p-6">
                  <div className="text-3xl font-bold text-orange-500 mb-2">Moderate</div>
                  <div className="text-sm text-muted-foreground mb-4">Your portfolio risk level</div>
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