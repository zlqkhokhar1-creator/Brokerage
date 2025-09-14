"use client";

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Simplified dashboard without external icon dependencies
export function SimpleDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-background/95 p-4 lg:p-6">
      {/* Welcome Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              Good morning, {user?.firstName || 'Investor'}
            </h1>
            <p className="text-muted-foreground mt-2">
              Here's your personalized market intelligence and portfolio overview
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Badge className="bg-gradient-to-r from-green-500 to-green-600">
              📈 Markets Open
            </Badge>
            <Badge variant="outline">
              🤖 AI Active
            </Badge>
          </div>
        </div>
      </div>

      {/* Main Dashboard Grid */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-4 w-full max-w-2xl bg-card/50 backdrop-blur-sm">
          <TabsTrigger value="overview">📊 Overview</TabsTrigger>
          <TabsTrigger value="portfolio">💼 Portfolio</TabsTrigger>
          <TabsTrigger value="ai">🧠 AI Insights</TabsTrigger>
          <TabsTrigger value="markets">🌐 Markets</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Portfolio Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <span>💼 Portfolio</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold font-mono">$485,672.43</div>
                <div className="flex items-center text-sm mt-1 text-green-500">
                  ↗️ $2,847.21 (+0.59%) today
                </div>
              </CardContent>
            </Card>
            
            {/* Market Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <span>🌐 Market Overview</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span>AAPL</span>
                    <div className="text-right">
                      <div className="font-mono">$175.25</div>
                      <div className="text-green-500 text-sm">+1.24%</div>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>MSFT</span>
                    <div className="text-right">
                      <div className="font-mono">$335.80</div>
                      <div className="text-red-500 text-sm">-0.43%</div>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>GOOGL</span>
                    <div className="text-right">
                      <div className="font-mono">$2,875.40</div>
                      <div className="text-green-500 text-sm">+0.53%</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* AI Insights */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <span>🧠 AI Insights</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 rounded-lg bg-gradient-to-r from-card to-card/50 border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">🎯 Tech Sector Momentum</span>
                    <Badge>87%</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    AI models detect strong momentum in cloud computing stocks.
                  </p>
                </div>
                
                <div className="p-4 rounded-lg bg-gradient-to-r from-card to-card/50 border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">⚠️ Concentration Risk</span>
                    <Badge variant="destructive">92%</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Portfolio is 45% concentrated in tech. Consider diversification.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="portfolio">
          <div className="text-center py-20">
            <div className="text-6xl mb-4">💼</div>
            <h3 className="text-2xl font-semibold mb-2">Portfolio Management</h3>
            <p className="text-muted-foreground">
              Advanced portfolio analytics and management tools
            </p>
          </div>
        </TabsContent>

        <TabsContent value="ai">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>🧠 AI Insights</CardTitle>
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
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>🔮 AI Recommendations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="p-3 border rounded-lg">
                    <div className="font-medium text-sm">💡 Rebalance Tech Allocation</div>
                    <div className="text-xs text-muted-foreground">Reduce by 5%</div>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <div className="font-medium text-sm">📈 Healthcare Momentum</div>
                    <div className="text-xs text-muted-foreground">Consider JNJ increase</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="markets">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>📈 Market Data</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'NVDA'].map((symbol) => (
                    <div key={symbol} className="flex justify-between items-center p-3 border rounded">
                      <div>
                        <div className="font-medium">{symbol}</div>
                        <div className="text-xs text-muted-foreground">Technology</div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono">${(Math.random() * 200 + 100).toFixed(2)}</div>
                        <div className="text-green-500 text-sm">+{(Math.random() * 3).toFixed(2)}%</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>📰 Market News</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-3 border rounded-lg hover:bg-muted/50">
                    <div className="font-medium text-sm">Fed Signals Rate Cut Consideration</div>
                    <div className="text-xs text-muted-foreground">2 hours ago • Reuters</div>
                  </div>
                  <div className="p-3 border rounded-lg hover:bg-muted/50">
                    <div className="font-medium text-sm">Tech Earnings Beat Expectations</div>
                    <div className="text-xs text-muted-foreground">4 hours ago • Bloomberg</div>
                  </div>
                  <div className="p-3 border rounded-lg hover:bg-muted/50">
                    <div className="font-medium text-sm">Energy Sector Shows Strength</div>
                    <div className="text-xs text-muted-foreground">6 hours ago • WSJ</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}