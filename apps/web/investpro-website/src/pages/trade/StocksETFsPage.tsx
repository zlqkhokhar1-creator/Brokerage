import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { AnimatedCard } from '../../components/ui/AnimatedCard';
import { fadeIn, staggerContainer, slideInUp, slideInLeft, slideInRight } from '../../animations';
import { useMarketData } from '../../hooks/useData';
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
  TrendingDown
} from 'lucide-react';

export const StocksETFsPage: React.FC = () => {
  const { data: marketData, loading } = useMarketData();

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

  const popularStocks = marketData?.topStocks || [
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
                <Activity className="w-4 h-4 mr-2" />
                Live Trading Platform
              </motion.div>
              
              <motion.h1 
                className="text-4xl lg:text-5xl font-heading font-bold mb-6"
                variants={fadeIn}
              >
                Trade Stocks & ETFs with 
                <span className="text-secondary">AI Intelligence</span>
              </motion.h1>
              
              <motion.p 
                className="text-xl text-white/90 mb-8"
                variants={fadeIn}
              >
                Access Pakistan Stock Exchange and global markets with real-time data, advanced analytics, and AI-powered insights to make smarter investment decisions.
              </motion.p>
              
              <motion.div 
                className="flex flex-col sm:flex-row gap-4 mb-8"
                variants={fadeIn}
              >
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button size="lg" variant="secondary">
                    Start Trading Now
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </motion.div>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-primary">
                    View Live Demo
                  </Button>
                </motion.div>
              </motion.div>
              
              <motion.div 
                className="grid grid-cols-2 gap-6 text-sm"
                variants={staggerContainer}
              >
                {[
                  'Commission-free trading',
                  'Real-time market data', 
                  'Advanced charting tools',
                  'AI-powered insights'
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
                <TrendingUp className="w-5 h-5 mr-2" />
                Live Market Data
                {!loading && (
                  <motion.div
                    className="w-2 h-2 bg-green-400 rounded-full ml-2"
                    animate={{ opacity: [1, 0.5, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                )}
              </h3>
              
              {/* Market Stats */}
              {marketData?.realtime && (
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <motion.div 
                    className="bg-white/10 rounded-lg p-3"
                    whileHover={{ scale: 1.02 }}
                  >
                    <div className="text-lg font-bold text-secondary">
                      {marketData.realtime.kse100.value}
                    </div>
                    <div className="text-xs text-white/70">KSE-100</div>
                    <div className={`text-xs ${
                      marketData.realtime.kse100.changeType === 'positive' ? 'text-green-300' : 'text-red-300'
                    }`}>
                      {marketData.realtime.kse100.change}
                    </div>
                  </motion.div>
                  <motion.div 
                    className="bg-white/10 rounded-lg p-3"
                    whileHover={{ scale: 1.02 }}
                  >
                    <div className="text-lg font-bold text-secondary">
                      {marketData.realtime.usdPkr.value}
                    </div>
                    <div className="text-xs text-white/70">USD/PKR</div>
                    <div className={`text-xs ${
                      marketData.realtime.usdPkr.changeType === 'positive' ? 'text-green-300' : 'text-red-300'
                    }`}>
                      +{marketData.realtime.usdPkr.change}
                    </div>
                  </motion.div>
                </div>
              )}
              
              <div className="space-y-4">
                {popularStocks.slice(0, 4).map((stock, index) => (
                  <motion.div 
                    key={index} 
                    className="flex items-center justify-between py-2"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    whileHover={{ x: 4, backgroundColor: 'rgba(255,255,255,0.05)' }}
                  >
                    <div className="flex items-center">
                      <motion.div 
                        className="w-8 h-8 bg-secondary/20 rounded-lg flex items-center justify-center mr-3"
                        whileHover={{ rotate: 180 }}
                        transition={{ duration: 0.3 }}
                      >
                        {stock.change?.startsWith('+') ? (
                          <TrendingUp className="w-4 h-4 text-secondary" />
                        ) : (
                          <TrendingDown className="w-4 h-4 text-red-300" />
                        )}
                      </motion.div>
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
                  </motion.div>
                ))}
              </div>
            </motion.div>
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
              Advanced Trading Features
            </h2>
            <p className="text-xl text-muted max-w-3xl mx-auto">
              Professional-grade tools and AI-powered insights to help you make informed investment decisions in the Pakistani and global markets.
            </p>
          </motion.div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const IconComponent = feature.icon;
              return (
                <motion.div key={index} variants={slideInUp} transition={{ delay: index * 0.1 }}>
                  <AnimatedCard className="group h-full">
                    <CardHeader>
                      <motion.div 
                        className={`w-12 h-12 bg-gradient-to-r ${feature.color} rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-all duration-300`}
                        whileHover={{ rotate: 360 }}
                        transition={{ duration: 0.6 }}
                      >
                        <IconComponent className="w-6 h-6 text-white" />
                      </motion.div>
                      <CardTitle className="group-hover:text-secondary transition-colors">
                        {feature.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted leading-relaxed">{feature.description}</p>
                    </CardContent>
                  </AnimatedCard>
                </motion.div>
              );
            })}
          </div>
        </div>
      </motion.section>

      {/* AI Features Section */}
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
              <Award className="w-4 h-4 mr-2" />
              AI-Powered Intelligence
            </div>
            <h2 className="text-3xl lg:text-4xl font-heading font-bold text-primary mb-4">
              Artificial Intelligence That Works for You
            </h2>
            <p className="text-xl text-muted max-w-3xl mx-auto">
              Our advanced AI algorithms analyze market patterns, optimize your portfolio, and provide personalized recommendations to maximize your returns.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {aiFeatures.map((feature, index) => (
              <motion.div key={index} variants={slideInUp} transition={{ delay: index * 0.2 }}>
                <AnimatedCard className="text-center h-full">
                  <CardContent className="pt-8">
                    <motion.div 
                      className="w-16 h-16 bg-secondary/10 rounded-full flex items-center justify-center mx-auto mb-6"
                      whileHover={{ scale: 1.1, backgroundColor: 'rgb(0, 208, 156, 0.2)' }}
                    >
                      <Award className="w-8 h-8 text-secondary" />
                    </motion.div>
                    <h3 className="text-xl font-heading font-bold text-primary mb-4">
                      {feature.title}
                    </h3>
                    <p className="text-muted mb-4 leading-relaxed">
                      {feature.description}
                    </p>
                    <div className="bg-secondary/10 text-secondary px-3 py-2 rounded-full text-sm font-medium">
                      {feature.impact}
                    </div>
                  </CardContent>
                </AnimatedCard>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Trading Tools Section */}
      <motion.section 
        className="py-20"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={staggerContainer}
      >
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div variants={slideInLeft}>
              <h2 className="text-3xl lg:text-4xl font-heading font-bold text-primary mb-6">
                Professional Trading Tools
              </h2>
              <p className="text-xl text-muted mb-8">
                Everything you need to trade like a pro, from advanced order types to comprehensive portfolio analytics.
              </p>
              
              <div className="space-y-6">
                {tradingTools.map((tool, index) => {
                  const IconComponent = tool.icon;
                  return (
                    <motion.div 
                      key={index} 
                      className="flex items-start"
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      whileHover={{ x: 4 }}
                    >
                      <motion.div 
                        className="w-10 h-10 bg-secondary/10 rounded-lg flex items-center justify-center mr-4 flex-shrink-0"
                        whileHover={{ scale: 1.1, backgroundColor: 'rgb(0, 208, 156, 0.2)' }}
                      >
                        <IconComponent className="w-5 h-5 text-secondary" />
                      </motion.div>
                      <div>
                        <h4 className="font-semibold text-foreground mb-2">{tool.name}</h4>
                        <p className="text-muted leading-relaxed">{tool.description}</p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
              
              <motion.div className="mt-8" whileHover={{ scale: 1.02 }}>
                <Link to="/pricing">
                  <Button size="lg">
                    <Target className="w-4 h-4 mr-2" />
                    View Pricing Plans
                  </Button>
                </Link>
              </motion.div>
            </motion.div>
            
            <motion.div className="space-y-6" variants={slideInRight}>
              <AnimatedCard>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold">Today's Market Overview</h4>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    >
                      <Clock className="w-5 h-5 text-muted" />
                    </motion.div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <motion.div 
                        className="text-2xl font-bold text-secondary"
                        key={marketData?.realtime?.kse100?.value}
                        initial={{ scale: 1.1 }}
                        animate={{ scale: 1 }}
                        transition={{ duration: 0.3 }}
                      >
                        {marketData?.realtime?.kse100?.value || '45,280'}
                      </motion.div>
                      <div className="text-sm text-muted">KSE-100 Index</div>
                    </div>
                    <div className="text-center">
                      <motion.div 
                        className="text-2xl font-bold text-secondary"
                        key={marketData?.realtime?.kse100?.change}
                        initial={{ scale: 1.1 }}
                        animate={{ scale: 1 }}
                        transition={{ duration: 0.3 }}
                      >
                        {marketData?.realtime?.kse100?.change || '+1.2%'}
                      </motion.div>
                      <div className="text-sm text-muted">Daily Change</div>
                    </div>
                  </div>
                </CardContent>
              </AnimatedCard>
              
              <AnimatedCard>
                <CardContent className="p-6">
                  <h4 className="font-semibold mb-4 flex items-center">
                    <TrendingUp className="w-5 h-5 mr-2" />
                    Top Movers
                  </h4>
                  <div className="space-y-3">
                    {popularStocks.slice(0, 3).map((stock, index) => (
                      <motion.div 
                        key={index}
                        className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-background-alt transition-colors cursor-pointer"
                        whileHover={{ x: 2 }}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                      >
                        <div>
                          <div className="font-medium">{stock.symbol}</div>
                          <div className="text-sm text-muted">{stock.name}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">{stock.price}</div>
                          <div className={`text-sm ${
                            stock.change?.startsWith('+') ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {stock.change}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </AnimatedCard>
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* Benefits Section */}
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
              Why Choose InvestPro for Trading
            </h2>
            <p className="text-xl text-muted max-w-3xl mx-auto">
              Join thousands of Pakistani investors who trust our platform for superior trading experience and results.
            </p>
          </motion.div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {benefits.map((benefit, index) => {
              const IconComponent = benefit.icon;
              return (
                <motion.div 
                  key={index}
                  variants={slideInUp}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ y: -4 }}
                >
                  <div className="flex items-center space-x-4 p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow">
                    <motion.div 
                      className="w-10 h-10 bg-secondary/10 rounded-lg flex items-center justify-center flex-shrink-0"
                      whileHover={{ scale: 1.1, rotate: 360 }}
                      transition={{ duration: 0.3 }}
                    >
                      <IconComponent className="w-5 h-5 text-secondary" />
                    </motion.div>
                    <span className="text-foreground font-medium">{benefit.text}</span>
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
              Start Trading with Confidence Today
            </h2>
            <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
              Join the future of investing in Pakistan. Get started with zero fees and AI-powered insights.
            </p>
            
            <motion.div 
              className="flex flex-col sm:flex-row gap-4 justify-center"
              variants={staggerContainer}
            >
              <motion.div variants={fadeIn} whileHover={{ scale: 1.05 }}>
                <Button size="lg" variant="secondary" className="text-lg px-8">
                  Open Trading Account
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </motion.div>
              <motion.div variants={fadeIn} whileHover={{ scale: 1.05 }}>
                <Link to="/discover/investment-simulator">
                  <Button size="lg" variant="outline" className="text-lg px-8 border-white text-white hover:bg-white hover:text-primary">
                    Try Investment Simulator
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