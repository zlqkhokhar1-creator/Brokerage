'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  BarChart3, 
  Users, 
  Activity, 
  Crown, 
  Zap, 
  Star, 
  Shield, 
  CheckCircle, 
  Settings,
  ArrowUpRight,
  ArrowDownRight,
  Eye,
  EyeOff,
  RefreshCw,
  Bell,
  Target,
  PieChart
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [showWelcome, setShowWelcome] = useState(false);
  const [portfolioVisible, setPortfolioVisible] = useState(true);

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => {
      setLoading(false);
      setShowWelcome(true);
    }, 1200);

    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-8">
          {/* Modern Skeleton Header */}
          <div className="space-y-4">
            <div className="skeleton-modern h-12 w-96 rounded-xl animate-fade-in"></div>
            <div className="skeleton-modern h-6 w-80 rounded-xl animate-fade-in" style={{ animationDelay: '0.1s' }}></div>
          </div>

          {/* Modern Skeleton Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="skeleton-card card-spacing animate-slide-up" style={{ animationDelay: `${i * 0.1}s` }}>
                <div className="flex items-center gap-4">
                  <div className="skeleton-modern h-12 w-12 rounded-xl"></div>
                  <div className="space-y-2">
                    <div className="skeleton-modern h-4 w-20 rounded-lg"></div>
                    <div className="skeleton-modern h-6 w-16 rounded-lg"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Modern Skeleton Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <div className="skeleton-card card-spacing animate-slide-up" style={{ animationDelay: '0.5s' }}>
                <div className="space-y-4">
                  <div className="skeleton-modern h-6 w-48 rounded-lg"></div>
                  <div className="skeleton-modern h-4 w-full rounded-lg"></div>
                  <div className="skeleton-modern h-4 w-3/4 rounded-lg"></div>
                </div>
              </div>
              <div className="skeleton-card card-spacing animate-slide-up" style={{ animationDelay: '0.6s' }}>
                <div className="space-y-4">
                  <div className="skeleton-modern h-6 w-40 rounded-lg"></div>
                  <div className="skeleton-modern h-32 w-full rounded-xl"></div>
                </div>
              </div>
            </div>
            <div className="space-y-8">
              <div className="skeleton-card card-spacing animate-slide-up" style={{ animationDelay: '0.7s' }}>
                <div className="space-y-3">
                  <div className="skeleton-modern h-5 w-32 rounded-lg"></div>
                  <div className="skeleton-modern h-4 w-full rounded-lg"></div>
                  <div className="skeleton-modern h-4 w-5/6 rounded-lg"></div>
                </div>
              </div>
              <div className="skeleton-card card-spacing animate-slide-up" style={{ animationDelay: '0.8s' }}>
                <div className="space-y-3">
                  <div className="skeleton-modern h-5 w-28 rounded-lg"></div>
                  <div className="skeleton-modern h-4 w-full rounded-lg"></div>
                  <div className="skeleton-modern h-4 w-4/5 rounded-lg"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <motion.div
          className="space-y-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
        >
          {/* Professional Page Header */}
          <motion.div
            className="flex items-center justify-between"
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <div>
              <h1 className="text-heading-1 text-foreground mb-2">
                Welcome back, John
              </h1>
              <p className="text-body-large text-muted-foreground">
                Here's your comprehensive financial overview with real-time insights
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button className="btn-glass gap-2 text-sm">
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>
              <button className="btn-modern gap-2 text-sm">
                <Bell className="h-4 w-4" />
                Alerts
              </button>
            </div>
          </motion.div>

          {/* Welcome Alert */}
          {showWelcome && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <div className="card-gradient p-6 animate-bounce-in">
                <div className="flex items-start gap-3">
                  <div className="status-indicator status-online">
                    <CheckCircle className="h-4 w-4" />
                    Live
                  </div>
                  <div>
                    <h3 className="font-semibold text-white mb-1">Portfolio Performing Well</h3>
                    <p className="text-sm text-white/80">
                      Your portfolio is up 2.34% today. All systems are operational and your data is up to date.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Professional Stats Cards */}
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <div className="card-modern p-6 animate-bounce-in" style={{ animationDelay: '0.1s' }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Portfolio Value</p>
                  <p className="text-2xl font-bold text-foreground">$125,430</p>
                  <div className="flex items-center gap-1 mt-1">
                    <ArrowUpRight className="h-4 w-4 text-success" />
                    <span className="text-sm font-medium text-success">+2.34%</span>
                  </div>
                </div>
                <div className="p-3 bg-gradient-to-br from-success/20 to-success/10 rounded-xl">
                  <TrendingUp className="h-6 w-6 text-success" />
                </div>
              </div>
            </div>

            <div className="card-premium p-6 animate-bounce-in" style={{ animationDelay: '0.2s' }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Today's P&L</p>
                  <p className="text-2xl font-bold text-success">+$2,340</p>
                  <div className="flex items-center gap-1 mt-1">
                    <ArrowUpRight className="h-4 w-4 text-success" />
                    <span className="text-sm font-medium text-success">+1.89%</span>
                  </div>
                </div>
                <div className="p-3 bg-gradient-to-br from-primary/20 to-primary/10 rounded-xl">
                  <BarChart3 className="h-6 w-6 text-primary" />
                </div>
              </div>
            </div>

            <div className="card-glass p-6 animate-bounce-in" style={{ animationDelay: '0.3s' }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Active Positions</p>
                  <p className="text-2xl font-bold text-foreground">12</p>
                  <div className="flex items-center gap-1 mt-1">
                    <Target className="h-4 w-4 text-info" />
                    <span className="text-sm font-medium text-info">3 new today</span>
                  </div>
                </div>
                <div className="p-3 bg-gradient-to-br from-warning/20 to-warning/10 rounded-xl">
                  <Activity className="h-6 w-6 text-warning" />
                </div>
              </div>
            </div>

            <div className="card-modern p-6 animate-bounce-in" style={{ animationDelay: '0.4s' }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Risk Score</p>
                  <p className="text-2xl font-bold text-success">Low</p>
                  <div className="flex items-center gap-1 mt-1">
                    <Shield className="h-4 w-4 text-success" />
                    <span className="text-sm font-medium text-success">Well balanced</span>
                  </div>
                </div>
                <div className="p-3 bg-gradient-to-br from-success/20 to-success/10 rounded-xl">
                  <Shield className="h-6 w-6 text-success" />
                </div>
              </div>
            </div>
          </motion.div>

          {/* Main Content Grid */}
          <motion.div
            className="grid grid-cols-1 lg:grid-cols-3 gap-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.6 }}
          >
            {/* Left Column - Charts and Analysis */}
            <div className="lg:col-span-2 space-y-8">
              {/* Portfolio Performance Chart */}
              <Card className="card-professional">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-xl">Portfolio Performance</CardTitle>
                      <CardDescription>Track your investment growth over time</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">1M</Button>
                      <Button variant="default" size="sm">3M</Button>
                      <Button variant="outline" size="sm">1Y</Button>
                      <Button variant="outline" size="sm">All</Button>
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
                        Interactive chart showing your portfolio's growth trajectory
                      </p>
                      <div className="flex flex-wrap gap-2 justify-center">
                        <Badge variant="secondary">Portfolio Value</Badge>
                        <Badge variant="secondary">S&P 500 Benchmark</Badge>
                        <Badge variant="secondary">Risk Metrics</Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Recent Activity */}
              <Card className="card-professional">
                <CardHeader>
                  <CardTitle className="text-xl">Recent Activity</CardTitle>
                  <CardDescription>Your latest trades and market updates</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { action: 'Bought', symbol: 'AAPL', shares: 50, price: 175.43, time: '2 min ago', type: 'buy' },
                      { action: 'Sold', symbol: 'TSLA', shares: 25, price: 245.67, time: '1 hour ago', type: 'sell' },
                      { action: 'Dividend', symbol: 'MSFT', amount: 45.50, time: '3 hours ago', type: 'dividend' },
                      { action: 'Bought', symbol: 'NVDA', shares: 15, price: 432.12, time: '5 hours ago', type: 'buy' },
                    ].map((activity, index) => (
                      <div key={index} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${
                            activity.type === 'buy' ? 'bg-success' : 
                            activity.type === 'sell' ? 'bg-destructive' : 'bg-info'
                          }`} />
                          <div>
                            <p className="font-medium text-foreground">
                              {activity.action} {activity.symbol}
                              {activity.shares && ` (${activity.shares} shares)`}
                            </p>
                            <p className="text-sm text-muted-foreground">{activity.time}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-foreground">
                            {activity.price ? `$${activity.price}` : `$${activity.amount}`}
                          </p>
                          <Badge variant={activity.type === 'buy' ? 'success' : activity.type === 'sell' ? 'destructive' : 'info'} size="sm">
                            {activity.type}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Sidebar Widgets */}
            <div className="space-y-8">
              {/* Quick Actions */}
              <Card className="card-professional">
                <CardHeader>
                  <CardTitle className="text-lg">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button className="w-full justify-start gap-3" size="lg">
                    <Activity className="h-5 w-5" />
                    Place Trade
                  </Button>
                  <Button variant="outline" className="w-full justify-start gap-3" size="lg">
                    <PieChart className="h-5 w-5" />
                    View Portfolio
                  </Button>
                  <Button variant="outline" className="w-full justify-start gap-3" size="lg">
                    <BarChart3 className="h-5 w-5" />
                    Market Analysis
                  </Button>
                  <Button variant="outline" className="w-full justify-start gap-3" size="lg">
                    <Target className="h-5 w-5" />
                    Set Alerts
                  </Button>
                </CardContent>
              </Card>

              {/* Top Movers */}
              <Card className="card-professional">
                <CardHeader>
                  <CardTitle className="text-lg">Top Movers</CardTitle>
                  <CardDescription>Today's biggest winners and losers</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[
                      { symbol: 'NVDA', name: 'NVIDIA Corp.', price: 432.12, change: '+8.45%', positive: true },
                      { symbol: 'TSLA', name: 'Tesla Inc.', price: 245.67, change: '+5.23%', positive: true },
                      { symbol: 'AAPL', name: 'Apple Inc.', price: 175.43, change: '+3.45%', positive: true },
                      { symbol: 'META', name: 'Meta Platforms', price: 345.67, change: '-4.23%', positive: false },
                    ].map((stock, index) => (
                      <div key={index} className="flex items-center justify-between p-3 hover:bg-muted/50 rounded-lg transition-colors">
                        <div>
                          <p className="font-medium text-foreground">{stock.symbol}</p>
                          <p className="text-sm text-muted-foreground">{stock.name}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-foreground">${stock.price}</p>
                          <p className={`text-sm font-medium ${stock.positive ? 'text-success' : 'text-destructive'}`}>
                            {stock.change}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Premium Features */}
              <Card className="card-elevated bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
                <CardContent className="p-6 text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 mb-4">
                    <Crown className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">Upgrade to Premium</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Unlock AI insights, advanced analytics, and priority support
                  </p>
                  <Button className="w-full">
                    <Zap className="h-4 w-4 mr-2" />
                    Upgrade Now
                  </Button>
                </CardContent>
              </Card>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </DashboardLayout>
  );
}