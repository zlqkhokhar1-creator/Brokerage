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

  // Debug theme variables on mount
  useEffect(() => {
    const checkThemeVariables = () => {
      const root = document.documentElement;
      const computedStyle = getComputedStyle(root);

      console.log('CSS Variables Check:', {
        primary: computedStyle.getPropertyValue('--primary'),
        background: computedStyle.getPropertyValue('--background'),
        foreground: computedStyle.getPropertyValue('--foreground'),
        dataTheme: root.getAttribute('data-theme')
      });
    };

    // Check immediately
    checkThemeVariables();

    // Check after a delay
    setTimeout(checkThemeVariables, 500);
  }, []);

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
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6"
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
            className="grid grid-cols-1 xl:grid-cols-3 gap-6 md:gap-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.6 }}
          >
            {/* Left Column - Charts and Analysis */}
            <div className="xl:col-span-2 space-y-6 md:space-y-8">
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
                  <div className="h-80 bg-gradient-to-br from-background to-muted/20 rounded-lg p-6 border border-border/50 relative overflow-hidden">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h4 className="text-lg font-semibold text-foreground">Portfolio Performance</h4>
                        <p className="text-sm text-muted-foreground">6-month performance comparison</p>
                      </div>
                      <div className="flex gap-4">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-primary rounded-full animate-pulse"></div>
                          <span className="text-sm text-foreground font-medium">Portfolio</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-muted-foreground/60 rounded-full"></div>
                          <span className="text-sm text-muted-foreground">S&P 500</span>
                        </div>
                      </div>
                    </div>

                    {/* Enhanced SVG Chart */}
                    <div className="relative h-48">
                      <svg viewBox="0 0 500 180" className="w-full h-full">
                        {/* Background gradient */}
                        <defs>
                          <linearGradient id="chartBg" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="hsl(var(--background))" stopOpacity="0.1"/>
                            <stop offset="100%" stopColor="hsl(var(--background))" stopOpacity="0.05"/>
                          </linearGradient>
                          <linearGradient id="portfolioArea" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.4"/>
                            <stop offset="50%" stopColor="hsl(var(--primary))" stopOpacity="0.2"/>
                            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.02"/>
                          </linearGradient>
                          <filter id="glow">
                            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                            <feMerge>
                              <feMergeNode in="coloredBlur"/>
                              <feMergeNode in="SourceGraphic"/>
                            </feMerge>
                          </filter>
                        </defs>

                        {/* Grid background */}
                        <rect width="100%" height="100%" fill="url(#chartBg)" rx="8"/>

                        {/* Grid lines */}
                        <g stroke="hsl(var(--border))" strokeWidth="0.5" opacity="0.3">
                          <line x1="0" y1="30" x2="500" y2="30"/>
                          <line x1="0" y1="60" x2="500" y2="60"/>
                          <line x1="0" y1="90" x2="500" y2="90"/>
                          <line x1="0" y1="120" x2="500" y2="120"/>
                          <line x1="0" y1="150" x2="500" y2="150"/>
                        </g>

                        {/* Market benchmark line */}
                        <path
                          d="M 0 140 Q 60 130 120 125 Q 180 120 240 115 Q 300 110 360 105 Q 420 100 480 95"
                          fill="none"
                          stroke="hsl(var(--muted-foreground))"
                          strokeWidth="2.5"
                          opacity="0.7"
                          strokeDasharray="5,5"
                        />

                        {/* Portfolio performance line */}
                        <path
                          d="M 0 150 Q 60 135 120 130 Q 180 125 240 120 Q 300 115 360 110 Q 420 105 480 100"
                          fill="none"
                          stroke="hsl(var(--primary))"
                          strokeWidth="4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          filter="url(#glow)"
                        />

                        {/* Area fill under portfolio line */}
                        <path
                          d="M 0 150 Q 60 135 120 130 Q 180 125 240 120 Q 300 115 360 110 Q 420 105 480 100 L 480 180 L 0 180 Z"
                          fill="url(#portfolioArea)"
                        />

                        {/* Interactive data points */}
                        <g>
                          {[80, 160, 240, 320, 400].map((x, i) => {
                            const y = 150 - (i * 10);
                            return (
                              <g key={i}>
                                <circle
                                  cx={x}
                                  cy={y}
                                  r="4"
                                  fill="hsl(var(--primary))"
                                  stroke="hsl(var(--background))"
                                  strokeWidth="2"
                                  className="hover:r-6 transition-all duration-200 cursor-pointer"
                                />
                                <circle
                                  cx={x}
                                  cy={y}
                                  r="12"
                                  fill="transparent"
                                  className="hover:fill-primary/10 transition-all duration-200"
                                />
                              </g>
                            );
                          })}
                        </g>

                        {/* Y-axis labels */}
                        <g fill="hsl(var(--muted-foreground))" fontSize="10" fontFamily="Inter">
                          <text x="-10" y="35" textAnchor="end">+15%</text>
                          <text x="-10" y="65" textAnchor="end">+10%</text>
                          <text x="-10" y="95" textAnchor="end">+5%</text>
                          <text x="-10" y="125" textAnchor="end">0%</text>
                          <text x="-10" y="155" textAnchor="end">-5%</text>
                        </g>

                        {/* X-axis labels */}
                        <g fill="hsl(var(--muted-foreground))" fontSize="10" fontFamily="Inter">
                          <text x="60" y="175" textAnchor="middle">Jan</text>
                          <text x="140" y="175" textAnchor="middle">Mar</text>
                          <text x="220" y="175" textAnchor="middle">May</text>
                          <text x="300" y="175" textAnchor="middle">Jul</text>
                          <text x="380" y="175" textAnchor="middle">Sep</text>
                          <text x="460" y="175" textAnchor="middle">Nov</text>
                        </g>
                      </svg>

                      {/* Enhanced performance indicators */}
                      <div className="absolute top-4 right-4 bg-card/90 backdrop-blur-xl rounded-xl p-3 border border-border/50 shadow-lg">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <TrendingUp className="h-5 w-5 text-success"/>
                            <div>
                              <div className="text-sm font-bold text-success">+12.4%</div>
                              <div className="text-xs text-muted-foreground">vs Market</div>
                            </div>
                          </div>
                          <div className="w-px h-6 bg-border"></div>
                          <div className="text-right">
                            <div className="text-sm font-bold text-foreground">$125,430</div>
                            <div className="text-xs text-success">+$2,340</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Enhanced time period selector */}
                    <div className="flex gap-1 mt-6 p-1 bg-muted/50 rounded-xl backdrop-blur-sm border border-border/30">
                      {[
                        { label: '1W', active: false },
                        { label: '1M', active: false },
                        { label: '3M', active: false },
                        { label: '6M', active: true },
                        { label: '1Y', active: false },
                        { label: 'All', active: false }
                      ].map((period) => (
                        <button
                          key={period.label}
                          className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                            period.active
                              ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25 scale-105'
                              : 'text-muted-foreground hover:text-foreground hover:bg-background/80 hover:scale-105'
                          }`}
                        >
                          {period.label}
                        </button>
                      ))}
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
                      <div
                        key={index}
                        className="group flex items-center justify-between p-4 bg-muted/30 rounded-lg hover:bg-muted/50 transition-all duration-300 hover:shadow-sm hover:scale-[1.02] border border-transparent hover:border-border/50 cursor-pointer"
                        style={{ animationDelay: `${index * 0.1}s` }}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full transition-all duration-300 group-hover:scale-125 ${
                            activity.type === 'buy' ? 'bg-success shadow-success/50 shadow-lg' :
                            activity.type === 'sell' ? 'bg-destructive shadow-destructive/50 shadow-lg' : 'bg-info shadow-info/50 shadow-lg'
                          }`} />
                          <div>
                            <p className="font-medium text-foreground group-hover:text-primary transition-colors duration-200">
                              {activity.action} {activity.symbol}
                              {activity.shares && ` (${activity.shares} shares)`}
                            </p>
                            <p className="text-sm text-muted-foreground group-hover:text-muted-foreground/80 transition-colors duration-200">{activity.time}</p>
                          </div>
                        </div>
                        <div className="text-right flex flex-col items-end gap-2">
                          <p className="font-medium text-foreground group-hover:text-primary transition-colors duration-200">
                            {activity.price ? `$${activity.price}` : `$${activity.amount}`}
                          </p>
                          <Badge
                            variant={activity.type === 'buy' ? 'success' : activity.type === 'sell' ? 'destructive' : 'info'}
                            size="sm"
                            className="group-hover:scale-105 transition-transform duration-200"
                          >
                            {activity.type}
                          </Badge>
                        </div>

                        {/* Subtle arrow indicator */}
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 ml-2">
                          <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
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
                  <Button className="w-full justify-start gap-3 group hover:scale-105 transition-all duration-300 hover:shadow-lg btn-modern" size="lg">
                    <Activity className="h-5 w-5 group-hover:rotate-12 transition-transform duration-300" />
                    Place Trade
                    <ArrowUpRight className="h-4 w-4 ml-auto opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                  </Button>
                  <Button variant="outline" className="w-full justify-start gap-3 group hover:scale-105 transition-all duration-300 hover:shadow-md hover:border-primary/50" size="lg">
                    <PieChart className="h-5 w-5 group-hover:rotate-12 transition-transform duration-300" />
                    View Portfolio
                    <ArrowUpRight className="h-4 w-4 ml-auto opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                  </Button>
                  <Button variant="outline" className="w-full justify-start gap-3 group hover:scale-105 transition-all duration-300 hover:shadow-md hover:border-primary/50" size="lg">
                    <BarChart3 className="h-5 w-5 group-hover:rotate-12 transition-transform duration-300" />
                    Market Analysis
                    <ArrowUpRight className="h-4 w-4 ml-auto opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                  </Button>
                  <Button variant="outline" className="w-full justify-start gap-3 group hover:scale-105 transition-all duration-300 hover:shadow-md hover:border-primary/50" size="lg">
                    <Target className="h-5 w-5 group-hover:rotate-12 transition-transform duration-300" />
                    Set Alerts
                    <ArrowUpRight className="h-4 w-4 ml-auto opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
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
                      <div
                        key={index}
                        className="group flex items-center justify-between p-3 hover:bg-muted/50 rounded-lg transition-all duration-300 hover:shadow-sm hover:scale-[1.01] cursor-pointer border border-transparent hover:border-border/30"
                        style={{ animationDelay: `${index * 0.05}s` }}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full transition-all duration-300 group-hover:scale-150 ${
                            stock.positive ? 'bg-success shadow-success/50 shadow-lg' : 'bg-destructive shadow-destructive/50 shadow-lg'
                          }`} />
                          <div>
                            <p className="font-medium text-foreground group-hover:text-primary transition-colors duration-200">{stock.symbol}</p>
                            <p className="text-sm text-muted-foreground group-hover:text-muted-foreground/80 transition-colors duration-200">{stock.name}</p>
                          </div>
                        </div>
                        <div className="text-right flex flex-col items-end gap-1">
                          <p className="font-medium text-foreground group-hover:text-primary transition-colors duration-200">${stock.price}</p>
                          <div className="flex items-center gap-1">
                            <TrendingUp className={`h-3 w-3 ${stock.positive ? 'text-success' : 'text-destructive'} group-hover:scale-110 transition-transform duration-200`} />
                            <p className={`text-sm font-medium ${stock.positive ? 'text-success' : 'text-destructive'} group-hover:scale-105 transition-transform duration-200`}>
                              {stock.change}
                            </p>
                          </div>
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

        {/* Floating Action Button */}
        <motion.div
          className="fixed bottom-8 right-8 z-50"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 1, type: "spring", stiffness: 200 }}
        >
          <div className="relative group">
            <button className="w-16 h-16 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary rounded-full shadow-2xl hover:shadow-glow transition-all duration-300 hover:scale-110 flex items-center justify-center group-hover:rotate-12">
              <Activity className="h-7 w-7 text-primary-foreground" />
            </button>

            {/* Tooltip */}
            <div className="absolute bottom-full right-0 mb-2 px-3 py-1 bg-card border border-border rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap text-sm font-medium">
              Quick Trade
              <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-card"></div>
            </div>

            {/* Ripple effect */}
            <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping opacity-0 group-hover:opacity-100"></div>
          </div>
        </motion.div>

        {/* Enhanced spacing for better visual hierarchy */}
        <div className="h-24"></div> {/* Space for FAB */}
      </div>
    </DashboardLayout>
  );
}