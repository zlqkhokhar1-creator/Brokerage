"use client";

import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { 
  PieChart, 
  TrendingUp, 
  Shield, 
  Users, 
  Clock, 
  Target,
  ArrowRight,
  CheckCircle,
  BarChart3,
  DollarSign,
  Award,
  BookOpen,
  Zap,
  Star,
  Globe,
  Calculator,
  Percent,
  Activity,
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

interface MutualFundsPageProps {
  onNavigate: (page: string) => void;
}

export function MutualFundsPage({ onNavigate }: MutualFundsPageProps) {
  const [marketData, setMarketData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate loading market data
    setTimeout(() => {
      setMarketData({
        mutualFunds: [
          { name: 'UBL Growth Fund', category: 'Equity', ytdReturn: '+18.5%', risk: 'High', aum: 'PKR 12.5B', rating: 5 },
          { name: 'HBL Islamic Equity Fund', category: 'Shariah', ytdReturn: '+15.2%', risk: 'Medium-High', aum: 'PKR 8.3B', rating: 4 },
          { name: 'JS Income Fund', category: 'Income', ytdReturn: '+9.8%', risk: 'Low', aum: 'PKR 15.7B', rating: 4 },
          { name: 'Meezan Balanced Fund', category: 'Balanced', ytdReturn: '+12.4%', risk: 'Medium', aum: 'PKR 6.9B', rating: 5 },
          { name: 'MCB Pakistan Stock Fund', category: 'Equity', ytdReturn: '+16.7%', risk: 'High', aum: 'PKR 4.2B', rating: 4 }
        ]
      });
      setLoading(false);
    }, 1000);
  }, []);

  const benefits = [
    {
      icon: PieChart,
      title: 'Professional Management',
      description: 'Expert fund managers with proven track records manage your investments across diversified portfolios.',
      gradient: 'from-blue-500 to-blue-600'
    },
    {
      icon: Shield,
      title: 'Risk Diversification',
      description: 'Spread risk across multiple securities, sectors, and asset classes to protect your investments.',
      gradient: 'from-green-500 to-green-600'
    },
    {
      icon: DollarSign,
      title: 'Low Minimum Investment',
      description: 'Start investing in mutual funds with as little as PKR 500 and build wealth systematically.',
      gradient: 'from-purple-500 to-purple-600'
    },
    {
      icon: TrendingUp,
      title: 'Consistent Returns',
      description: 'Access to professionally managed portfolios designed to deliver steady long-term growth.',
      gradient: 'from-orange-500 to-orange-600'
    },
    {
      icon: Clock,
      title: 'Systematic Investment',
      description: 'Set up automatic monthly investments to benefit from rupee-cost averaging and compound growth.',
      gradient: 'from-teal-500 to-teal-600'
    },
    {
      icon: Award,
      title: 'Top-Rated Funds',
      description: 'Choose from carefully selected, high-performing mutual funds from leading asset management companies.',
      gradient: 'from-yellow-500 to-yellow-600'
    }
  ];

  const fundCategories = [
    {
      name: 'Equity Funds',
      description: 'High growth potential through stock market investments',
      riskLevel: 'High',
      avgReturn: '15-20%',
      minInvestment: 'PKR 500',
      icon: TrendingUp,
      color: 'from-red-500 to-red-600'
    },
    {
      name: 'Islamic Funds',
      description: 'Shariah-compliant investments following Islamic principles',
      riskLevel: 'Medium',
      avgReturn: '12-18%',
      minInvestment: 'PKR 500',
      icon: Award,
      color: 'from-emerald-500 to-emerald-600'
    },
    {
      name: 'Balanced Funds',
      description: 'Moderate risk with mixed equity and debt investments',
      riskLevel: 'Medium',
      avgReturn: '8-12%',
      minInvestment: 'PKR 1,000',
      icon: BarChart3,
      color: 'from-blue-500 to-blue-600'
    },
    {
      name: 'Income Funds',
      description: 'Stable income through debt securities and bonds',
      riskLevel: 'Low',
      avgReturn: '6-10%',
      minInvestment: 'PKR 1,000',
      icon: Shield,
      color: 'from-gray-500 to-gray-600'
    }
  ];

  const topFunds = marketData?.mutualFunds || [];

  const investmentSteps = [
    {
      step: '1',
      title: 'Choose Your Fund',
      description: 'Browse our curated selection of top-performing mutual funds based on your risk appetite and investment goals.',
      icon: Target
    },
    {
      step: '2',
      title: 'Set Investment Amount',
      description: 'Start with as little as PKR 500 or set up systematic investment plans for regular contributions.',
      icon: Calculator
    },
    {
      step: '3',
      title: 'Monitor Performance',
      description: 'Track your investments in real-time with detailed performance analytics and portfolio insights.',
      icon: Activity
    },
    {
      step: '4',
      title: 'Optimize Returns',
      description: 'Receive AI-powered recommendations to rebalance and optimize your mutual fund portfolio.',
      icon: Zap
    }
  ];

  const features = [
    { text: 'Zero entry and exit loads on select funds', icon: DollarSign },
    { text: 'Real-time NAV updates and performance tracking', icon: Activity },
    { text: 'Systematic Investment Plan (SIP) automation', icon: Clock },
    { text: 'Expert fund research and analysis', icon: BookOpen },
    { text: 'Tax-efficient investment strategies', icon: Percent },
    { text: 'Portfolio diversification recommendations', icon: Globe }
  ];

  const sipCalculator = {
    monthlyAmount: 5000,
    duration: 10,
    expectedReturn: 15,
    totalInvestment: 5000 * 12 * 10,
    estimatedReturns: Math.round((5000 * ((Math.pow(1 + 15/100/12, 10*12) - 1) / (15/100/12))) - (5000 * 12 * 10))
  };

  const marketStats = {
    totalAUM: 'PKR 890B',
    activeFunds: '180+',
    avgReturn: '12.5%',
    investors: '2.1M+'
  };

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
                <PieChart className="w-4 h-4 mr-2" />
                Professional Fund Management
              </div>
              
              <h1 className="text-4xl lg:text-5xl font-bold mb-6">
                Build Wealth with 
                <span className="text-secondary"> Mutual Funds</span>
              </h1>
              
              <p className="text-xl text-white/90 mb-8">
                Access professionally managed investment portfolios designed to deliver consistent returns while minimizing risk through intelligent diversification.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <Button size="lg" variant="secondary" onClick={() => onNavigate('signup')}>
                  Start SIP Investment
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
                <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-primary">
                  Explore Top Funds
                </Button>
              </div>
              
              <div className="grid grid-cols-2 gap-6 text-sm">
                {[
                  'Professional management',
                  'Low minimum investment', 
                  'Systematic investment plans',
                  'Tax-efficient strategies'
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
                <Calculator className="w-5 h-5 mr-2" />
                SIP Calculator
              </h3>
              
              <div className="space-y-4">
                <div className="bg-white/10 rounded-lg p-4">
                  <div className="text-sm text-white/80 mb-1">Monthly Investment</div>
                  <div className="text-2xl font-bold text-secondary">
                    PKR {sipCalculator.monthlyAmount.toLocaleString()}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/10 rounded-lg p-3">
                    <div className="text-xs text-white/70">Duration</div>
                    <div className="text-lg font-bold">{sipCalculator.duration} years</div>
                  </div>
                  <div className="bg-white/10 rounded-lg p-3">
                    <div className="text-xs text-white/70">Expected Return</div>
                    <div className="text-lg font-bold">{sipCalculator.expectedReturn}% p.a.</div>
                  </div>
                </div>
                
                <div className="border-t border-white/20 pt-4">
                  <div className="text-sm text-white/80 mb-2">Investment Summary</div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm">Total Invested:</span>
                    <span className="font-semibold">PKR {(sipCalculator.totalInvestment/100000).toFixed(1)}L</span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm">Est. Returns:</span>
                    <span className="font-semibold text-secondary">PKR {(sipCalculator.estimatedReturns/100000).toFixed(1)}L</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold border-t border-white/20 pt-2">
                    <span>Final Value:</span>
                    <span className="text-secondary">PKR {((sipCalculator.totalInvestment + sipCalculator.estimatedReturns)/100000).toFixed(1)}L</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Market Stats */}
      <section className="py-12 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { label: 'Total AUM', value: marketStats.totalAUM, icon: DollarSign },
              { label: 'Active Funds', value: marketStats.activeFunds, icon: PieChart },
              { label: 'Avg Returns', value: marketStats.avgReturn, icon: TrendingUp },
              { label: 'Investors', value: marketStats.investors, icon: Users }
            ].map((stat, index) => {
              const IconComponent = stat.icon;
              return (
                <Card key={index} className="text-center hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                  <CardContent className="pt-6">
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-3">
                      <IconComponent className="w-6 h-6 text-primary" />
                    </div>
                    <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                    <div className="text-sm text-muted-foreground">{stat.label}</div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Fund Categories */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
              Choose the Right Fund for You
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              From conservative income funds to aggressive growth funds, find the perfect match for your investment goals and risk tolerance.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {fundCategories.map((category, index) => {
              const IconComponent = category.icon || PieChart;
              return (
                <Card key={index} className="h-full text-center group border-2 border-transparent hover:border-primary hover:shadow-lg transition-all duration-300 hover:-translate-y-2">
                  <CardContent className="pt-6">
                    <div className={`w-16 h-16 bg-gradient-to-r ${category.color} rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300`}>
                      <IconComponent className="w-8 h-8 text-white" />
                    </div>
                    
                    <h3 className="text-xl font-bold text-foreground mb-3 group-hover:text-primary transition-colors">
                      {category.name}
                    </h3>
                    
                    <p className="text-muted-foreground text-sm mb-4 leading-relaxed">
                      {category.description}
                    </p>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Risk Level:</span>
                        <span className={`font-semibold ${
                          category.riskLevel === 'Low' ? 'text-green-600' :
                          category.riskLevel === 'Medium' ? 'text-yellow-600' :
                          'text-red-600'
                        }`}>
                          {category.riskLevel}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Expected Return:</span>
                        <span className="font-semibold text-primary">{category.avgReturn}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Min Investment:</span>
                        <span className="font-semibold">{category.minInvestment}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Top Performing Funds */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-6">
              <Star className="w-4 h-4 mr-2" />
              Top Performing Funds
            </Badge>
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
              Award-Winning Mutual Funds
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Invest in Pakistan's best-performing mutual funds with consistent track records and professional management.
            </p>
          </div>
          
          <div className="space-y-4">
            {topFunds.map((fund, index) => (
              <Card key={index} className="p-6 hover:shadow-lg transition-all duration-300 hover:translate-x-1">
                <div className="grid md:grid-cols-6 gap-4 items-center">
                  <div className="md:col-span-2">
                    <h3 className="text-lg font-bold text-foreground mb-1">
                      {fund.name}
                    </h3>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className="text-primary border-primary">
                        {fund.category}
                      </Badge>
                      {fund.rating && (
                        <div className="flex items-center">
                          {[...Array(5)].map((_, i) => (
                            <Star 
                              key={i} 
                              className={`w-3 h-3 ${
                                i < fund.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
                              }`} 
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-lg font-bold text-primary">{fund.ytdReturn}</div>
                    <div className="text-xs text-muted-foreground">YTD Return</div>
                  </div>
                  
                  <div className="text-center">
                    <div className={`font-semibold ${
                      fund.risk === 'Low' ? 'text-green-600' :
                      fund.risk?.includes('Medium') ? 'text-yellow-600' :
                      'text-red-600'
                    }`}>
                      {fund.risk}
                    </div>
                    <div className="text-xs text-muted-foreground">Risk Level</div>
                  </div>
                  
                  <div className="text-center">
                    <div className="font-semibold">{fund.aum}</div>
                    <div className="text-xs text-muted-foreground">AUM</div>
                  </div>
                  
                  <div className="text-center">
                    <Button size="sm" className="w-full" onClick={() => onNavigate('signup')}>
                      Invest Now
                      <ArrowRight className="w-3 h-3 ml-1" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
              Why Choose Mutual Funds
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Professional management, diversification, and systematic investment plans make mutual funds ideal for building long-term wealth.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {benefits.map((benefit, index) => {
              const IconComponent = benefit.icon;
              return (
                <Card key={index} className="h-full group hover:shadow-lg transition-all duration-300">
                  <CardHeader>
                    <div className={`w-12 h-12 bg-gradient-to-r ${benefit.gradient} rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-all duration-300`}>
                      <IconComponent className="w-6 h-6 text-white" />
                    </div>
                    <CardTitle className="group-hover:text-primary transition-colors">
                      {benefit.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground leading-relaxed">{benefit.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Investment Steps */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
              Start Your Investment Journey
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Four simple steps to begin building wealth through professionally managed mutual funds.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {investmentSteps.map((step, index) => {
              const IconComponent = step.icon;
              return (
                <div key={index} className="text-center">
                  <div className="relative mb-6">
                    <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center mx-auto mb-4 hover:scale-110 transition-transform duration-300">
                      <IconComponent className="w-10 h-10 text-white" />
                    </div>
                    <div className="absolute -top-2 -right-2 w-8 h-8 bg-secondary text-white rounded-full flex items-center justify-center text-sm font-bold">
                      {step.step}
                    </div>
                  </div>
                  
                  <h3 className="text-xl font-bold text-foreground mb-3">
                    {step.title}
                  </h3>
                  
                  <p className="text-muted-foreground leading-relaxed">
                    {step.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
              Platform Features
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Advanced tools and features to maximize your mutual fund investment experience.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => {
              const IconComponent = feature.icon;
              return (
                <div key={index} className="flex items-center space-x-4 p-4 bg-background rounded-lg shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <IconComponent className="w-5 h-5 text-primary" />
                  </div>
                  <span className="text-foreground font-medium">{feature.text}</span>
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
            Start Your SIP Journey Today
          </h2>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            Begin your systematic investment plan with as little as PKR 500 per month and watch your wealth grow through the power of compounding.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" variant="secondary" className="text-lg px-8" onClick={() => onNavigate('signup')}>
              <Calculator className="w-5 h-5 mr-2" />
              Start SIP Calculator
            </Button>
            <Button size="lg" variant="outline" className="text-lg px-8 border-white text-white hover:bg-white hover:text-primary">
              <Target className="w-5 h-5 mr-2" />
              Find Right Fund
            </Button>
          </div>
        </div>
      </section>
    </div>
    </PageTransition>
  );
}
