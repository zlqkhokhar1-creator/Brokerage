import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { AnimatedCard } from '../../components/ui/AnimatedCard';
import { fadeIn, staggerContainer, slideInUp, slideInLeft, slideInRight } from '../../animations';
import { useMarketData, useInvestmentProducts } from '../../hooks/useData';
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
  Activity
} from 'lucide-react';

export const MutualFundsPage: React.FC = () => {
  const { data: marketData } = useMarketData();
  const { data: productsData } = useInvestmentProducts();

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

  const fundCategories = productsData?.mutualFunds?.categories || [
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

  const topFunds = marketData?.mutualFunds || [
    { name: 'UBL Growth Fund', category: 'Equity', ytdReturn: '+18.5%', risk: 'High', aum: 'PKR 12.5B', rating: 5 },
    { name: 'HBL Islamic Equity Fund', category: 'Shariah', ytdReturn: '+15.2%', risk: 'Medium-High', aum: 'PKR 8.3B', rating: 4 },
    { name: 'JS Income Fund', category: 'Income', ytdReturn: '+9.8%', risk: 'Low', aum: 'PKR 15.7B', rating: 4 },
    { name: 'Meezan Balanced Fund', category: 'Balanced', ytdReturn: '+12.4%', risk: 'Medium', aum: 'PKR 6.9B', rating: 5 },
    { name: 'MCB Pakistan Stock Fund', category: 'Equity', ytdReturn: '+16.7%', risk: 'High', aum: 'PKR 4.2B', rating: 4 }
  ];

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
    <div className="min-h-screen">
      {/* Hero Section */}
      <motion.section 
        className="bg-gradient-primary text-white py-20"
        initial="hidden"
        animate="visible"
        variants={staggerContainer}
      >
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div className="max-w-2xl" variants={slideInLeft}>
              <motion.div 
                className="inline-flex items-center bg-secondary/20 text-secondary px-4 py-2 rounded-full text-sm font-medium mb-6"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <PieChart className="w-4 h-4 mr-2" />
                Professional Fund Management
              </motion.div>
              
              <motion.h1 
                className="text-4xl lg:text-5xl font-heading font-bold mb-6"
                variants={fadeIn}
              >
                Build Wealth with 
                <span className="text-secondary">Mutual Funds</span>
              </motion.h1>
              
              <motion.p 
                className="text-xl text-white/90 mb-8"
                variants={fadeIn}
              >
                Access professionally managed investment portfolios designed to deliver consistent returns while minimizing risk through intelligent diversification.
              </motion.p>
              
              <motion.div 
                className="flex flex-col sm:flex-row gap-4 mb-8"
                variants={fadeIn}
              >
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button size="lg" variant="secondary">
                    Start SIP Investment
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </motion.div>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-primary">
                    Explore Top Funds
                  </Button>
                </motion.div>
              </motion.div>
              
              <motion.div 
                className="grid grid-cols-2 gap-6 text-sm"
                variants={staggerContainer}
              >
                {[
                  'Professional management',
                  'Low minimum investment', 
                  'Systematic investment plans',
                  'Tax-efficient strategies'
                ].map((benefit, index) => (
                  <motion.div 
                    key={index}
                    className="flex items-center"
                    variants={fadeIn}
                    transition={{ delay: index * 0.1 }}
                  >
                    <CheckCircle className="w-4 h-4 mr-2 text-secondary" />
                    {benefit}
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>
            
            <motion.div 
              className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20"
              variants={slideInRight}
            >
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
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* Market Stats */}
      <motion.section 
        className="py-12 bg-background-alt"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={staggerContainer}
      >
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
                <motion.div
                  key={index}
                  variants={fadeIn}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ y: -2 }}
                >
                  <AnimatedCard className="text-center">
                    <CardContent className="pt-6">
                      <motion.div 
                        className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center mx-auto mb-3"
                        whileHover={{ scale: 1.1, rotate: 360 }}
                        transition={{ duration: 0.3 }}
                      >
                        <IconComponent className="w-6 h-6 text-secondary" />
                      </motion.div>
                      <div className="text-2xl font-bold text-primary">{stat.value}</div>
                      <div className="text-sm text-muted">{stat.label}</div>
                    </CardContent>
                  </AnimatedCard>
                </motion.div>
              );
            })}
          </div>
        </div>
      </motion.section>

      {/* Fund Categories */}
      <motion.section 
        className="py-20"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={staggerContainer}
      >
        <div className="container mx-auto px-4">
          <motion.div className="text-center mb-16" variants={fadeIn}>
            <h2 className="text-3xl lg:text-4xl font-heading font-bold text-primary mb-4">
              Choose the Right Fund for You
            </h2>
            <p className="text-xl text-muted max-w-3xl mx-auto">
              From conservative income funds to aggressive growth funds, find the perfect match for your investment goals and risk tolerance.
            </p>
          </motion.div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {fundCategories.map((category, index) => {
              const IconComponent = category.icon || PieChart;
              return (
                <motion.div
                  key={index}
                  variants={slideInUp}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ y: -8 }}
                >
                  <AnimatedCard className="h-full text-center group border-2 border-transparent hover:border-secondary">
                    <CardContent className="pt-6">
                      <motion.div 
                        className={`w-16 h-16 bg-gradient-to-r ${category.color || 'from-secondary to-accent'} rounded-full flex items-center justify-center mx-auto mb-4`}
                        whileHover={{ scale: 1.1, rotate: 360 }}
                        transition={{ duration: 0.6 }}
                      >
                        <IconComponent className="w-8 h-8 text-white" />
                      </motion.div>
                      
                      <h3 className="text-xl font-heading font-bold text-primary mb-3 group-hover:text-secondary transition-colors">
                        {category.name}
                      </h3>
                      
                      <p className="text-muted text-sm mb-4 leading-relaxed">
                        {category.description}
                      </p>
                      
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted">Risk Level:</span>
                          <span className={`font-semibold ${
                            category.riskLevel === 'Low' ? 'text-green-600' :
                            category.riskLevel === 'Medium' ? 'text-yellow-600' :
                            'text-red-600'
                          }`}>
                            {category.riskLevel}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted">Expected Return:</span>
                          <span className="font-semibold text-secondary">{category.avgReturn || category.expectedReturn}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted">Min Investment:</span>
                          <span className="font-semibold">{category.minInvestment}</span>
                        </div>
                      </div>
                    </CardContent>
                  </AnimatedCard>
                </motion.div>
              );
            })}
          </div>
        </div>
      </motion.section>

      {/* Top Performing Funds */}
      <motion.section 
        className="py-20 bg-background-alt"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={staggerContainer}
      >
        <div className="container mx-auto px-4">
          <motion.div className="text-center mb-16" variants={fadeIn}>
            <div className="inline-flex items-center bg-secondary/20 text-secondary px-4 py-2 rounded-full text-sm font-medium mb-6">
              <Star className="w-4 h-4 mr-2" />
              Top Performing Funds
            </div>
            <h2 className="text-3xl lg:text-4xl font-heading font-bold text-primary mb-4">
              Award-Winning Mutual Funds
            </h2>
            <p className="text-xl text-muted max-w-3xl mx-auto">
              Invest in Pakistan's best-performing mutual funds with consistent track records and professional management.
            </p>
          </motion.div>
          
          <div className="space-y-4">
            {topFunds.map((fund, index) => (
              <motion.div
                key={index}
                variants={slideInUp}
                transition={{ delay: index * 0.1 }}
                whileHover={{ x: 4 }}
              >
                <AnimatedCard className="p-6">
                  <div className="grid md:grid-cols-6 gap-4 items-center">
                    <div className="md:col-span-2">
                      <h3 className="text-lg font-heading font-bold text-primary mb-1">
                        {fund.name}
                      </h3>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm bg-secondary/10 text-secondary px-2 py-1 rounded">
                          {fund.category}
                        </span>
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
                      <div className="text-lg font-bold text-secondary">{fund.ytdReturn || fund.return}</div>
                      <div className="text-xs text-muted">YTD Return</div>
                    </div>
                    
                    <div className="text-center">
                      <div className={`font-semibold ${
                        fund.risk === 'Low' ? 'text-green-600' :
                        fund.risk?.includes('Medium') ? 'text-yellow-600' :
                        'text-red-600'
                      }`}>
                        {fund.risk}
                      </div>
                      <div className="text-xs text-muted">Risk Level</div>
                    </div>
                    
                    <div className="text-center">
                      <div className="font-semibold">{fund.aum}</div>
                      <div className="text-xs text-muted">AUM</div>
                    </div>
                    
                    <div className="text-center">
                      <motion.div whileHover={{ scale: 1.05 }}>
                        <Button size="sm" className="w-full">
                          Invest Now
                          <ArrowRight className="w-3 h-3 ml-1" />
                        </Button>
                      </motion.div>
                    </div>
                  </div>
                </AnimatedCard>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Benefits Section */}
      <motion.section 
        className="py-20"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={staggerContainer}
      >
        <div className="container mx-auto px-4">
          <motion.div className="text-center mb-16" variants={fadeIn}>
            <h2 className="text-3xl lg:text-4xl font-heading font-bold text-primary mb-4">
              Why Choose Mutual Funds
            </h2>
            <p className="text-xl text-muted max-w-3xl mx-auto">
              Professional management, diversification, and systematic investment plans make mutual funds ideal for building long-term wealth.
            </p>
          </motion.div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {benefits.map((benefit, index) => {
              const IconComponent = benefit.icon;
              return (
                <motion.div
                  key={index}
                  variants={slideInUp}
                  transition={{ delay: index * 0.1 }}
                >
                  <AnimatedCard className="h-full group">
                    <CardHeader>
                      <motion.div 
                        className={`w-12 h-12 bg-gradient-to-r ${benefit.gradient} rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-all duration-300`}
                        whileHover={{ rotate: 360 }}
                        transition={{ duration: 0.6 }}
                      >
                        <IconComponent className="w-6 h-6 text-white" />
                      </motion.div>
                      <CardTitle className="group-hover:text-secondary transition-colors">
                        {benefit.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted leading-relaxed">{benefit.description}</p>
                    </CardContent>
                  </AnimatedCard>
                </motion.div>
              );
            })}
          </div>
        </div>
      </motion.section>

      {/* Investment Steps */}
      <motion.section 
        className="py-20 bg-background-alt"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={staggerContainer}
      >
        <div className="container mx-auto px-4">
          <motion.div className="text-center mb-16" variants={fadeIn}>
            <h2 className="text-3xl lg:text-4xl font-heading font-bold text-primary mb-4">
              Start Your Investment Journey
            </h2>
            <p className="text-xl text-muted max-w-3xl mx-auto">
              Four simple steps to begin building wealth through professionally managed mutual funds.
            </p>
          </motion.div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {investmentSteps.map((step, index) => {
              const IconComponent = step.icon;
              return (
                <motion.div
                  key={index}
                  variants={slideInUp}
                  transition={{ delay: index * 0.2 }}
                  className="text-center"
                >
                  <motion.div 
                    className="relative mb-6"
                    whileHover={{ scale: 1.05 }}
                  >
                    <motion.div 
                      className="w-20 h-20 bg-secondary rounded-full flex items-center justify-center mx-auto mb-4"
                      whileHover={{ rotate: 360 }}
                      transition={{ duration: 0.6 }}
                    >
                      <IconComponent className="w-10 h-10 text-white" />
                    </motion.div>
                    <div className="absolute -top-2 -right-2 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center text-sm font-bold">
                      {step.step}
                    </div>
                  </motion.div>
                  
                  <h3 className="text-xl font-heading font-bold text-primary mb-3">
                    {step.title}
                  </h3>
                  
                  <p className="text-muted leading-relaxed">
                    {step.description}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </motion.section>

      {/* Features Section */}
      <motion.section 
        className="py-20"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={staggerContainer}
      >
        <div className="container mx-auto px-4">
          <motion.div className="text-center mb-16" variants={fadeIn}>
            <h2 className="text-3xl lg:text-4xl font-heading font-bold text-primary mb-4">
              Platform Features
            </h2>
            <p className="text-xl text-muted max-w-3xl mx-auto">
              Advanced tools and features to maximize your mutual fund investment experience.
            </p>
          </motion.div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => {
              const IconComponent = feature.icon;
              return (
                <motion.div
                  key={index}
                  variants={slideInUp}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ y: -2 }}
                >
                  <div className="flex items-center space-x-4 p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow">
                    <motion.div 
                      className="w-10 h-10 bg-secondary/10 rounded-lg flex items-center justify-center flex-shrink-0"
                      whileHover={{ scale: 1.1, rotate: 360 }}
                      transition={{ duration: 0.3 }}
                    >
                      <IconComponent className="w-5 h-5 text-secondary" />
                    </motion.div>
                    <span className="text-foreground font-medium">{feature.text}</span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </motion.section>

      {/* CTA Section */}
      <motion.section 
        className="py-20 bg-gradient-primary text-white"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={fadeIn}
      >
        <div className="container mx-auto px-4 text-center">
          <motion.div variants={fadeIn}>
            <h2 className="text-3xl lg:text-4xl font-heading font-bold mb-6">
              Start Your SIP Journey Today
            </h2>
            <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
              Begin your systematic investment plan with as little as PKR 500 per month and watch your wealth grow through the power of compounding.
            </p>
            
            <motion.div 
              className="flex flex-col sm:flex-row gap-4 justify-center"
              variants={staggerContainer}
            >
              <motion.div variants={fadeIn} whileHover={{ scale: 1.05 }}>
                <Button size="lg" variant="secondary" className="text-lg px-8">
                  <Calculator className="w-5 h-5 mr-2" />
                  Start SIP Calculator
                </Button>
              </motion.div>
              <motion.div variants={fadeIn} whileHover={{ scale: 1.05 }}>
                <Link to="/discover/risk-assessment">
                  <Button size="lg" variant="outline" className="text-lg px-8 border-white text-white hover:bg-white hover:text-primary">
                    <Target className="w-5 h-5 mr-2" />
                    Find Right Fund
                  </Button>
                </Link>
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
      </motion.section>
    </div>
  );
};