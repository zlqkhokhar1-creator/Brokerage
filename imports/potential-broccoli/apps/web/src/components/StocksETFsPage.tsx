"use client";

import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { 
  TrendingUp, 
  BarChart3, 
  Activity, 
  Globe, 
  Zap, 
  Shield, 
  Clock, 
  Target,
  ArrowRight,
  CheckCircle,
  LineChart,
  PieChart,
  DollarSign,
  Award,
  Smartphone,
  Bell,
  TrendingDown,
  ArrowLeft
} from 'lucide-react';

// Animation Components
import { 
  MotionWrapper, 
  StaggerWrapper, 
  Floating, 
  PageTransition 
} from './animations/MotionWrapper';
import { CountUp } from './animations/CountUp';
import { EnhancedCard, MagneticButton } from './ui/EnhancedCard';
import { EnhancedArrow, CTAButton } from './ui/EnhancedArrow';

interface StocksETFsPageProps {
  onNavigate: (page: string) => void;
}

export function StocksETFsPage({ onNavigate }: StocksETFsPageProps) {
  const [marketData, setMarketData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate loading market data
    setTimeout(() => {
      setMarketData({
        realtime: {
          kse100: { value: '45,280', change: '+1.2%', changeType: 'positive' },
          usdPkr: { value: '278.50', change: '0.8%', changeType: 'positive' }
        }
      });
      setLoading(false);
    }, 1000);
  }, []);

  const features = [
    {
      icon: Activity,
      title: 'Real-Time Market Data',
      description: 'Access live stock prices, market movements, and trading volumes updated every second across PSX and international markets.',
      color: 'from-blue-500 to-blue-600'
    },
    {
      icon: BarChart3,
      title: 'Advanced Charting',
      description: 'Professional-grade technical analysis tools with 50+ indicators, pattern recognition, and customizable chart layouts.',
      color: 'from-green-500 to-green-600'
    },
    {
      icon: Target,
      title: 'AI Stock Screener',
      description: 'Intelligent stock screening powered by machine learning to find investment opportunities that match your criteria.',
      color: 'from-purple-500 to-purple-600'
    },
    {
      icon: Globe,
      title: 'Global ETFs Access',
      description: 'Invest in international ETFs and diversify your portfolio with exposure to global markets and sectors.',
      color: 'from-orange-500 to-orange-600'
    },
    {
      icon: Zap,
      title: 'Lightning Fast Execution',
      description: 'Trade execution in under 100ms with our high-performance trading infrastructure and smart order routing.',
      color: 'from-yellow-500 to-yellow-600'
    },
    {
      icon: Shield,
      title: 'Risk Management',
      description: 'Automated stop-loss orders, position sizing recommendations, and portfolio risk assessment tools.',
      color: 'from-red-500 to-red-600'
    }
  ];

  const tradingTools = [
    {
      name: 'Smart Order Types',
      description: 'Market, Limit, Stop-Loss, and Trailing Stop orders with advanced execution algorithms',
      icon: Target
    },
    {
      name: 'Portfolio Analytics',
      description: 'Comprehensive performance tracking, risk metrics, and asset allocation analysis',
      icon: PieChart
    },
    {
      name: 'News & Research',
      description: 'Real-time market news, analyst reports, and company fundamentals from trusted sources',
      icon: BarChart3
    },
    {
      name: 'Mobile Trading App',
      description: 'Full-featured mobile app for iOS and Android with biometric authentication and push notifications',
      icon: Smartphone
    }
  ];

  const popularStocks = [
    { symbol: 'TRG', name: 'TRG Pakistan Limited', price: 'PKR 142.50', change: '+5.2%', trend: 'up' },
    { symbol: 'HBL', name: 'Habib Bank Limited', price: 'PKR 95.75', change: '+2.8%', trend: 'up' },
    { symbol: 'ENGRO', name: 'Engro Corporation', price: 'PKR 285.00', change: '-1.5%', trend: 'down' },
    { symbol: 'LUCKY', name: 'Lucky Cement', price: 'PKR 650.25', change: '+3.7%', trend: 'up' },
    { symbol: 'PSO', name: 'Pakistan State Oil', price: 'PKR 180.90', change: '+1.9%', trend: 'up' },
    { symbol: 'OGDC', name: 'Oil & Gas Development', price: 'PKR 85.40', change: '-0.8%', trend: 'down' }
  ];

  const benefits = [
    { text: 'Zero brokerage fees for first 30 days', icon: DollarSign },
    { text: 'Fractional share investing from PKR 100', icon: Target },
    { text: 'Advanced AI-powered market insights', icon: Award },
    { text: 'Real-time portfolio performance tracking', icon: Activity },
    { text: 'Expert research and analysis', icon: BarChart3 },
    { text: 'Tax-loss harvesting recommendations', icon: Shield }
  ];

  const aiFeatures = [
    {
      title: 'Smart Portfolio Rebalancing',
      description: 'AI automatically suggests rebalancing based on market conditions and your goals',
      impact: '+3.2% avg return improvement'
    },
    {
      title: 'Risk-Adjusted Stock Picks',
      description: 'Machine learning identifies stocks with optimal risk-return profiles',
      impact: '68% success rate on recommendations'
    },
    {
      title: 'Market Timing Insights',
      description: 'Predictive analytics help identify optimal entry and exit points',
      impact: '24% reduction in timing errors'
    }
  ];

  return (
    <PageTransition>
      <div className="min-h-screen bg-background">
        {/* Navigation */}
        <nav className="bg-background/80 backdrop-blur-xl border-b border-border/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <MagneticButton
                variant="ghost"
                onClick={() => onNavigate('landing')}
                className="flex items-center text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
              </MagneticButton>
              <div className="flex items-center space-x-4">
                <MagneticButton variant="outline" onClick={() => onNavigate('login')}>
                  Sign In
                </MagneticButton>
                <CTAButton onClick={() => onNavigate('signup')}>
                  Get Started
                </CTAButton>
              </div>
            </div>
          </div>
        </nav>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary via-primary to-primary/80 text-white py-20">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="max-w-2xl">
              <div className="inline-flex items-center bg-secondary/20 text-secondary px-4 py-2 rounded-full text-sm font-medium mb-6">
                <Activity className="w-4 h-4 mr-2" />
                Live Trading Platform
              </div>
              
              <h1 className="text-4xl lg:text-5xl font-bold mb-6">
                Trade Stocks & ETFs with 
                <span className="text-secondary"> AI Intelligence</span>
              </h1>
              
              <p className="text-xl text-white/90 mb-8">
                Access Pakistan Stock Exchange and global markets with real-time data, advanced analytics, and AI-powered insights to make smarter investment decisions.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <Button size="lg" variant="secondary" onClick={() => onNavigate('signup')}>
                  Start Trading Now
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
                <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-primary">
                  View Live Demo
                </Button>
              </div>
              
              <div className="grid grid-cols-2 gap-6 text-sm">
                {[
                  'Commission-free trading',
                  'Real-time market data', 
                  'Advanced charting tools',
                  'AI-powered insights'
                ].map((benefit, index) => (
                  <div key={index} className="flex items-center">
                    <CheckCircle className="w-4 h-4 mr-2 text-secondary" />
                    {benefit}
                  </div>
                ))}
              </div>
            </div>
            
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
              <h3 className="text-xl font-semibold mb-6 flex items-center">
                <TrendingUp className="w-5 h-5 mr-2" />
                Live Market Data
                {!loading && (
                  <div className="w-2 h-2 bg-green-400 rounded-full ml-2 animate-pulse" />
                )}
              </h3>
              
              {/* Market Stats */}
              {marketData?.realtime && (
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-white/10 rounded-lg p-3">
                    <div className="text-lg font-bold text-secondary">
                      {marketData.realtime.kse100.value}
                    </div>
                    <div className="text-xs text-white/70">KSE-100</div>
                    <div className="text-xs text-green-300">
                      {marketData.realtime.kse100.change}
                    </div>
                  </div>
                  <div className="bg-white/10 rounded-lg p-3">
                    <div className="text-lg font-bold text-secondary">
                      {marketData.realtime.usdPkr.value}
                    </div>
                    <div className="text-xs text-white/70">USD/PKR</div>
                    <div className="text-xs text-green-300">
                      +{marketData.realtime.usdPkr.change}
                    </div>
                  </div>
                </div>
              )}
              
              <div className="space-y-4">
                {popularStocks.slice(0, 4).map((stock, index) => (
                  <div key={index} className="flex items-center justify-between py-2 hover:bg-white/5 rounded-lg px-2 transition-colors">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-secondary/20 rounded-lg flex items-center justify-center mr-3">
                        {stock.change?.startsWith('+') ? (
                          <TrendingUp className="w-4 h-4 text-secondary" />
                        ) : (
                          <TrendingDown className="w-4 h-4 text-red-300" />
                        )}
                      </div>
                      <div>
                        <div className="font-semibold">{stock.symbol}</div>
                        <div className="text-xs text-white/70">{stock.name}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">{stock.price}</div>
                      <div className={`text-xs ${
                        stock.change?.startsWith('+') ? 'text-secondary' : 'text-red-300'
                      }`}>
                        {stock.change}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
              Advanced Trading Features
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Professional-grade tools and AI-powered insights to help you make informed investment decisions in the Pakistani and global markets.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const IconComponent = feature.icon;
              return (
                <Card key={index} className="group h-full hover:shadow-lg transition-all duration-300">
                  <CardHeader>
                    <div className={`w-12 h-12 bg-gradient-to-r ${feature.color} rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-all duration-300`}>
                      <IconComponent className="w-6 h-6 text-white" />
                    </div>
                    <CardTitle className="group-hover:text-primary transition-colors">
                      {feature.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* AI Features Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-6">
              <Award className="w-4 h-4 mr-2" />
              AI-Powered Intelligence
            </Badge>
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
              Artificial Intelligence That Works for You
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Our advanced AI algorithms analyze market patterns, optimize your portfolio, and provide personalized recommendations to maximize your returns.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {aiFeatures.map((feature, index) => (
              <Card key={index} className="text-center h-full hover:shadow-lg transition-all duration-300">
                <CardContent className="pt-8">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Award className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-4">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground mb-4 leading-relaxed">
                    {feature.description}
                  </p>
                  <Badge variant="outline" className="text-primary">
                    {feature.impact}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Trading Tools Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-6">
                Professional Trading Tools
              </h2>
              <p className="text-xl text-muted-foreground mb-8">
                Everything you need to trade like a pro, from advanced order types to comprehensive portfolio analytics.
              </p>
              
              <div className="space-y-6">
                {tradingTools.map((tool, index) => {
                  const IconComponent = tool.icon;
                  return (
                    <div key={index} className="flex items-start hover:translate-x-2 transition-transform duration-200">
                      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center mr-4 flex-shrink-0">
                        <IconComponent className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-foreground mb-2">{tool.name}</h4>
                        <p className="text-muted-foreground leading-relaxed">{tool.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              <div className="mt-8">
                <Button size="lg" onClick={() => onNavigate('pricing')}>
                  <Target className="w-4 h-4 mr-2" />
                  View Pricing Plans
                </Button>
              </div>
            </div>
            
            <div className="space-y-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold">Today's Market Overview</h4>
                    <Clock className="w-5 h-5 text-muted-foreground animate-spin" style={{animationDuration: '20s'}} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">
                        {marketData?.realtime?.kse100?.value || '45,280'}
                      </div>
                      <div className="text-sm text-muted-foreground">KSE-100 Index</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">
                        {marketData?.realtime?.kse100?.change || '+1.2%'}
                      </div>
                      <div className="text-sm text-muted-foreground">Daily Change</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <h4 className="font-semibold mb-4 flex items-center">
                    <TrendingUp className="w-5 h-5 mr-2" />
                    Top Movers
                  </h4>
                  <div className="space-y-3">
                    {popularStocks.slice(0, 3).map((stock, index) => (
                      <div key={index} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                        <div>
                          <div className="font-medium">{stock.symbol}</div>
                          <div className="text-sm text-muted-foreground">{stock.name}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">{stock.price}</div>
                          <div className={`text-sm ${
                            stock.change?.startsWith('+') ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {stock.change}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
              Why Choose InvestPro for Trading
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Join thousands of Pakistani investors who trust our platform for superior trading experience and results.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {benefits.map((benefit, index) => {
              const IconComponent = benefit.icon;
              return (
                <div key={index} className="flex items-center space-x-4 p-4 bg-background rounded-lg shadow-sm hover:shadow-md transition-shadow hover:-translate-y-1">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <IconComponent className="w-5 h-5 text-primary" />
                  </div>
                  <span className="text-foreground font-medium">{benefit.text}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-primary via-primary to-primary/80 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold mb-6">
            Start Trading with Confidence Today
          </h2>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            Join the future of investing in Pakistan. Get started with zero fees and AI-powered insights.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" variant="secondary" className="text-lg px-8" onClick={() => onNavigate('signup')}>
              Open Trading Account
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button size="lg" variant="outline" className="text-lg px-8 border-white text-white hover:bg-white hover:text-primary">
              Try Investment Simulator
            </Button>
          </div>
        </div>
      </section>
    </div>
    </PageTransition>
  );
}
