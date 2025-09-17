"use client";

import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { 
  Brain, 
  Target, 
  TrendingUp, 
  Shield, 
  Clock, 
  BarChart3,
  ArrowRight,
  CheckCircle,
  Zap,
  PieChart,
  Settings,
  Award,
  RefreshCw,
  Eye,
  DollarSign,
  Smartphone,
  Globe,
  Calculator,
  Activity,
  Users,
  Star,
  Play,
  Pause,
  TrendingDown,
  Lightbulb,
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

interface RoboAdvisorPageProps {
  onNavigate: (page: string) => void;
}

export function RoboAdvisorPage({ onNavigate }: RoboAdvisorPageProps) {
  const [selectedPortfolio, setSelectedPortfolio] = useState(0);
  const [marketData, setMarketData] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentLanguage, setCurrentLanguage] = useState<'en' | 'ur'>('en');
  const [aiSimulation, setAiSimulation] = useState({ score: 87, status: 'optimizing' });

  // Fetch data on component mount
  useEffect(() => {
    setTimeout(() => {
      setMarketData({
        realtime: {
          kse100: { value: '45,280', change: '+1.2%', changeType: 'positive' },
          usdPkr: { value: '278.50', change: '0.8%', changeType: 'positive' }
        }
      });
    }, 1000);
  }, []);

  // AI Simulation Effect
  useEffect(() => {
    const interval = setInterval(() => {
      if (isPlaying) {
        setAiSimulation(prev => ({
          score: Math.min(100, prev.score + Math.floor(Math.random() * 3)),
          status: ['optimizing', 'analyzing', 'rebalancing'][Math.floor(Math.random() * 3)]
        }));
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [isPlaying]);

  // Language toggle function
  const toggleLanguage = () => {
    setCurrentLanguage(prev => prev === 'en' ? 'ur' : 'en');
  };

  const texts = {
    en: {
      title: 'Robo-Advisor for Smart Investing',
      subtitle: 'Let artificial intelligence manage your portfolio with advanced algorithms that optimize returns, minimize risk, and adapt to market conditions automatically.',
      livePerformance: 'Live Portfolio Performance',
      aiRecommendation: 'AI Recommendation Score'
    },
    ur: {
      title: 'ذہین سرمایہ کاری کے لیے روبو ایڈوائزر',
      subtitle: 'اعلیٰ الگورتھم کے ذریعے اپنا پورٹ فولیو منظم کرنے دیں جو واپسی کو بہتر بناتا، خطرات کم کرتا اور بازار کی صورتحال کے مطابق خودکار طور پر ایڈجسٹ ہوتا ہے۔',
      livePerformance: 'براہ راست پورٹ فولیو کارکردگی',
      aiRecommendation: 'AI تجویز کا اسکور'
    }
  };

  const roboFeatures = [
    {
      icon: Brain,
      title: 'AI-Powered Portfolio Management',
      description: 'Advanced machine learning algorithms analyze market conditions and optimize your portfolio 24/7 for maximum returns.',
      gradient: 'from-purple-500 to-purple-600'
    },
    {
      icon: Target,
      title: 'Goal-Based Investing',
      description: 'Set specific financial goals like retirement, home buying, or education and let our AI create personalized investment strategies.',
      gradient: 'from-blue-500 to-blue-600'
    },
    {
      icon: Shield,
      title: 'Automated Risk Management',
      description: 'Intelligent risk assessment and automatic rebalancing protect your investments during market volatility.',
      gradient: 'from-green-500 to-green-600'
    },
    {
      icon: RefreshCw,
      title: 'Dynamic Rebalancing',
      description: 'Your portfolio is automatically rebalanced to maintain optimal asset allocation based on market conditions and your risk profile.',
      gradient: 'from-orange-500 to-orange-600'
    },
    {
      icon: BarChart3,
      title: 'Tax-Loss Harvesting',
      description: 'Minimize tax liability through automated tax-loss harvesting strategies that maximize your after-tax returns.',
      gradient: 'from-teal-500 to-teal-600'
    },
    {
      icon: Eye,
      title: 'Transparent Reporting',
      description: 'Get detailed insights into every investment decision with comprehensive performance reports and analytics.',
      gradient: 'from-indigo-500 to-indigo-600'
    }
  ];

  const portfolioTypes = [
    {
      type: 'Conservative',
      risk: 'Low',
      expectedReturn: '6-8%',
      allocation: { stocks: 30, bonds: 60, cash: 10 },
      description: 'Focused on capital preservation with steady, predictable returns',
      color: 'from-green-500 to-green-600',
      icon: Shield
    },
    {
      type: 'Moderate',
      risk: 'Medium',
      expectedReturn: '8-12%',
      allocation: { stocks: 60, bonds: 35, cash: 5 },
      description: 'Balanced approach between growth and stability',
      color: 'from-blue-500 to-blue-600',
      icon: BarChart3
    },
    {
      type: 'Aggressive',
      risk: 'High',
      expectedReturn: '12-18%',
      allocation: { stocks: 85, bonds: 10, cash: 5 },
      description: 'Growth-focused with higher risk tolerance for maximum returns',
      color: 'from-red-500 to-red-600',
      icon: TrendingUp
    },
    {
      type: 'Shariah Compliant',
      risk: 'Medium',
      expectedReturn: '9-14%',
      allocation: { stocks: 70, sukuk: 25, cash: 5 },
      description: 'Islamic principles-compliant investments with competitive returns',
      color: 'from-emerald-500 to-emerald-600',
      icon: Award
    }
  ];

  const roboAdvantages = [
    {
      title: 'Lower Costs',
      description: 'Management fees starting from just 0.25% annually, significantly lower than traditional wealth management.',
      icon: DollarSign,
      value: '75% Lower Fees'
    },
    {
      title: '24/7 Management',
      description: 'Your investments are monitored and optimized round-the-clock, never missing market opportunities.',
      icon: Clock,
      value: 'Always Active'
    },
    {
      title: 'No Human Bias',
      description: 'Emotion-free investment decisions based purely on data and proven algorithms.',
      icon: Brain,
      value: '100% Data-Driven'
    },
    {
      title: 'Instant Execution',
      description: 'Lightning-fast trade execution and portfolio adjustments in response to market changes.',
      icon: Zap,
      value: '<100ms Response'
    }
  ];

  const performanceMetrics = [
    { metric: 'Average Annual Return', value: '14.2%', description: 'Across all portfolio types (2024)', icon: TrendingUp },
    { metric: 'Sharpe Ratio', value: '1.18', description: 'Risk-adjusted performance measure', icon: BarChart3 },
    { metric: 'Maximum Drawdown', value: '-8.5%', description: 'Worst peak-to-trough decline', icon: Shield },
    { metric: 'Win Rate', value: '78%', description: 'Percentage of profitable trades', icon: Target }
  ];

  const steps = [
    {
      step: '1',
      title: 'Risk Assessment',
      description: 'Complete our comprehensive questionnaire to determine your risk tolerance and investment goals.',
      icon: Target
    },
    {
      step: '2',
      title: 'Portfolio Creation',
      description: 'Our AI creates a personalized portfolio optimized for your specific financial objectives.',
      icon: Brain
    },
    {
      step: '3',
      title: 'Automated Investing',
      description: 'Your portfolio is automatically managed, rebalanced, and optimized without any effort from you.',
      icon: RefreshCw
    },
    {
      step: '4',
      title: 'Continuous Monitoring',
      description: 'Track performance in real-time and receive detailed reports on your investment progress.',
      icon: Activity
    }
  ];

  const aiCapabilities = [
    {
      title: 'Market Sentiment Analysis',
      description: 'AI processes news, social media, and market data to gauge investor sentiment',
      impact: '+2.1% Alpha'
    },
    {
      title: 'Volatility Prediction',
      description: 'Machine learning models predict market volatility to adjust risk exposure',
      impact: '35% Risk Reduction'
    },
    {
      title: 'Sector Rotation',
      description: 'Intelligent sector allocation based on economic cycles and market trends',
      impact: '+1.8% Outperformance'
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
              variant="default"
              onClick={() => onNavigate('landing')}
              className="flex items-center text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </MagneticButton>
            <div className="flex items-center space-x-4">
              <Button variant="outline" onClick={() => onNavigate('login')}>
                Sign In
              </Button>
              <Button onClick={() => onNavigate('signup')}>
                Get Started
              </Button>
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
                <Brain className="w-4 h-4 mr-2" />
                AI-Powered Investment Management
              </div>
              
              <h1 className="text-4xl lg:text-5xl font-bold mb-6" style={{ direction: currentLanguage === 'ur' ? 'rtl' : 'ltr' }}>
                {currentLanguage === 'en' ? (
                  <>
                    Robo-Advisor for 
                    <span className="text-secondary"> Smart Investing</span>
                  </>
                ) : (
                  <>
                    <span className="text-secondary">ذہین سرمایہ کاری</span> کے لیے 
                    روبو ایڈوائزر
                  </>
                )}
              </h1>
              
              <p className="text-xl text-white/90 mb-8" style={{ direction: currentLanguage === 'ur' ? 'rtl' : 'ltr' }}>
                {texts[currentLanguage].subtitle}
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <Button size="lg" variant="secondary" onClick={() => onNavigate('signup')}>
                  {currentLanguage === 'en' ? 'Start Free Portfolio Review' : 'مفت پورٹ فولیو ریویو شروع کریں'}
                  <ArrowRight className={`w-5 h-5 ${currentLanguage === 'ur' ? 'mr-2 rotate-180' : 'ml-2'}`} />
                </Button>
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="border-white text-white hover:bg-white hover:text-primary"
                  onClick={toggleLanguage}
                >
                  <Globe className="w-5 h-5 mr-2" />
                  {currentLanguage === 'en' ? 'اردو' : 'English'}
                </Button>
              </div>
              
              <div className="grid grid-cols-2 gap-6 text-sm">
                {[
                  '0.25% management fee',
                  'Automated rebalancing', 
                  'Tax-loss harvesting',
                  '24/7 portfolio monitoring'
                ].map((benefit, index) => (
                  <div key={index} className="flex items-center">
                    <CheckCircle className="w-4 h-4 mr-2 text-secondary" />
                    {benefit}
                  </div>
                ))}
              </div>
            </div>
            
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold flex items-center">
                  <Activity className="w-5 h-5 mr-2" />
                  {texts[currentLanguage].livePerformance}
                  <div className="w-2 h-2 bg-green-400 rounded-full ml-2 animate-pulse" />
                </h3>
                <button
                  className="p-2 hover:bg-white/10 rounded-full transition-colors"
                  onClick={() => setIsPlaying(!isPlaying)}
                >
                  {isPlaying ? (
                    <Pause className="w-4 h-4 text-white" />
                  ) : (
                    <Play className="w-4 h-4 text-white" />
                  )}
                </button>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-white/10 rounded-lg p-3">
                  <div className="flex items-center mb-2">
                    <TrendingUp className="w-4 h-4 text-secondary mr-2" />
                    <div className="text-lg font-bold text-secondary">
                      {marketData?.realtime?.kse100?.value || '45,280'}
                    </div>
                  </div>
                  <div className="text-xs text-white/70">KSE-100 Index</div>
                  <div className="text-xs text-green-400">{marketData?.realtime?.kse100?.change || '+1.2%'}</div>
                </div>
                
                <div className="bg-white/10 rounded-lg p-3">
                  <div className="flex items-center mb-2">
                    <DollarSign className="w-4 h-4 text-secondary mr-2" />
                    <div className="text-lg font-bold text-secondary">14.2%</div>
                  </div>
                  <div className="text-xs text-white/70">Avg Annual Return</div>
                  <div className="text-xs text-green-400">+2.1% vs benchmark</div>
                </div>
                
                <div className="bg-white/10 rounded-lg p-3">
                  <div className="flex items-center mb-2">
                    <Shield className="w-4 h-4 text-secondary mr-2" />
                    <div className="text-lg font-bold text-secondary">1.18</div>
                  </div>
                  <div className="text-xs text-white/70">Sharpe Ratio</div>
                  <div className="text-xs text-white/60">Risk-adjusted return</div>
                </div>
                
                <div className="bg-white/10 rounded-lg p-3">
                  <div className="flex items-center mb-2">
                    <Target className="w-4 h-4 text-secondary mr-2" />
                    <div className="text-lg font-bold text-secondary">78%</div>
                  </div>
                  <div className="text-xs text-white/70">Win Rate</div>
                  <div className="text-xs text-white/60">Successful trades</div>
                </div>
              </div>
              
              <div className="bg-white/10 rounded-lg p-4">
                <div className="text-sm text-white/80 mb-2 flex items-center">
                  <Lightbulb className="w-4 h-4 mr-2" />
                  {texts[currentLanguage].aiRecommendation}
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {aiSimulation.status}
                  </Badge>
                </div>
                <div className="flex items-center">
                  <div className="flex-1 bg-white/20 rounded-full h-2 mr-3">
                    <div 
                      className="bg-secondary h-2 rounded-full transition-all duration-1000"
                      style={{ width: `${aiSimulation.score}%` }}
                    />
                  </div>
                  <span className="text-lg font-bold text-secondary">
                    {aiSimulation.score}/100
                  </span>
                </div>
                <div className="text-xs text-white/70 mt-1">
                  {currentLanguage === 'en' ? 'Excellent portfolio optimization' : 'بہترین پورٹ فولیو آپٹیمائزیشن'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Portfolio Types */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
              Choose Your AI-Managed Portfolio
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Our AI creates personalized portfolios tailored to your risk tolerance, investment goals, and financial timeline.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {portfolioTypes.map((portfolio, index) => {
              const IconComponent = portfolio.icon;
              return (
                <Card 
                  key={index} 
                  className={`h-full cursor-pointer border-2 transition-all duration-300 hover:shadow-lg hover:-translate-y-2 ${
                    selectedPortfolio === index ? 'border-primary bg-primary/5' : 'border-transparent hover:border-primary/30'
                  }`}
                  onClick={() => setSelectedPortfolio(index)}
                >
                  <CardContent className="pt-6 text-center">
                    <div className={`w-16 h-16 bg-gradient-to-r ${portfolio.color} rounded-full flex items-center justify-center mx-auto mb-4 hover:scale-110 transition-transform duration-300`}>
                      <IconComponent className="w-8 h-8 text-white" />
                    </div>
                    
                    <h3 className="text-xl font-bold text-foreground mb-2">
                      {portfolio.type}
                    </h3>
                    
                    <div className="mb-4">
                      <Badge variant={
                        portfolio.risk === 'Low' ? 'default' :
                        portfolio.risk === 'Medium' ? 'secondary' : 'destructive'
                      }>
                        {portfolio.risk} Risk
                      </Badge>
                    </div>
                    
                    <div className="text-2xl font-bold text-primary mb-2">
                      {portfolio.expectedReturn}
                    </div>
                    <div className="text-sm text-muted-foreground mb-4">Expected Annual Return</div>
                    
                    <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                      {portfolio.description}
                    </p>
                    
                    {/* Allocation Chart */}
                    <div className="space-y-2">
                      {Object.entries(portfolio.allocation).map(([asset, percentage]) => (
                        <div key={asset} className="flex items-center justify-between text-xs">
                          <span className="capitalize">{asset}:</span>
                          <div className="flex items-center">
                            <div className="w-16 bg-muted rounded-full h-1 mr-2">
                              <div 
                                className="bg-primary h-1 rounded-full" 
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                            <span className="font-semibold">{percentage}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* AI Features */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-6">
              <Brain className="w-4 h-4 mr-2" />
              Advanced AI Technology
            </Badge>
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
              Artificial Intelligence That Never Sleeps
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Our sophisticated AI algorithms work 24/7 to optimize your portfolio, manage risk, and capitalize on market opportunities.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {roboFeatures.map((feature, index) => {
              const IconComponent = feature.icon;
              return (
                <Card key={index} className="h-full group hover:shadow-lg transition-all duration-300">
                  <CardHeader>
                    <div className={`w-12 h-12 bg-gradient-to-r ${feature.gradient} rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-all duration-300`}>
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

      {/* AI Capabilities */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
              Advanced AI Capabilities
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              See how our AI delivers superior performance through cutting-edge technology and data analysis.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {aiCapabilities.map((capability, index) => (
              <Card key={index} className="text-center h-full hover:shadow-lg transition-all duration-300">
                <CardContent className="pt-8">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6 hover:scale-110 transition-transform duration-300">
                    <Brain className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-4">
                    {capability.title}
                  </h3>
                  <p className="text-muted-foreground mb-4 leading-relaxed">
                    {capability.description}
                  </p>
                  <Badge variant="outline" className="text-primary border-primary">
                    {capability.impact}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Advantages */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
              Why Choose Robo-Advisory
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Experience the advantages of AI-powered investment management over traditional wealth management.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {roboAdvantages.map((advantage, index) => {
              const IconComponent = advantage.icon;
              return (
                <Card key={index} className="text-center h-full hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                  <CardContent className="pt-6">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 hover:scale-110 hover:rotate-180 transition-all duration-600">
                      <IconComponent className="w-8 h-8 text-primary" />
                    </div>
                    
                    <h3 className="text-xl font-bold text-foreground mb-3">
                      {advantage.title}
                    </h3>
                    
                    <div className="text-lg font-bold text-primary mb-3">
                      {advantage.value}
                    </div>
                    
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      {advantage.description}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
              How Robo-Advisory Works
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Four simple steps to start your AI-powered investment journey.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, index) => {
              const IconComponent = step.icon;
              return (
                <div key={index} className="text-center">
                  <div className="relative mb-6">
                    <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center mx-auto mb-4 hover:scale-110 hover:rotate-360 transition-all duration-600">
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

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-primary via-primary to-primary/80 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold mb-6">
            Start Your AI Investment Journey
          </h2>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            Let artificial intelligence manage your portfolio and achieve your financial goals with data-driven precision.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" variant="secondary" className="text-lg px-8" onClick={() => onNavigate('signup')}>
              <Brain className="w-5 h-5 mr-2" />
              Start Free Assessment
            </Button>
            <Button size="lg" variant="outline" className="text-lg px-8 border-white text-white hover:bg-white hover:text-primary">
              <Calculator className="w-5 h-5 mr-2" />
              Portfolio Calculator
            </Button>
          </div>
        </div>
      </section>
    </div>
    </PageTransition>
  );
}
