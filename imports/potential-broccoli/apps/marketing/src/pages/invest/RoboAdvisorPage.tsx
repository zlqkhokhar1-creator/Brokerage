import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { AnimatedCard } from '../../components/ui/AnimatedCard';
import { fadeIn, staggerContainer, slideInUp, slideInLeft, slideInRight } from '../../animations';
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
  Lightbulb
} from 'lucide-react';

export const RoboAdvisorPage: React.FC = () => {
  const [selectedPortfolio, setSelectedPortfolio] = useState(0);
  const [marketData, setMarketData] = useState<any>(null);
  const [testimonials, setTestimonials] = useState<any[]>([]);
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentLanguage, setCurrentLanguage] = useState<'en' | 'ur'>('en');
  const [aiSimulation, setAiSimulation] = useState({ score: 87, status: 'optimizing' });

  // Fetch data on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [marketResponse, testimonialsResponse] = await Promise.all([
          fetch('/data/market-data.json'),
          fetch('/data/testimonials.json')
        ]);
        
        const marketData = await marketResponse.json();
        const testimonialsData = await testimonialsResponse.json();
        
        setMarketData(marketData);
        setTestimonials(testimonialsData.testimonials?.slice(0, 3) || []);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();
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
                <Brain className="w-4 h-4 mr-2" />
                AI-Powered Investment Management
              </motion.div>
              
              <motion.h1 
                className="text-4xl lg:text-5xl font-heading font-bold mb-6"
                variants={fadeIn}
                style={{ direction: currentLanguage === 'ur' ? 'rtl' : 'ltr' }}
              >
                {currentLanguage === 'en' ? (
                  <>
                    Robo-Advisor for 
                    <span className="text-secondary">Smart Investing</span>
                  </>
                ) : (
                  <>
                    <span className="text-secondary">ذہین سرمایہ کاری</span> کے لیے 
                    روبو ایڈوائزر
                  </>
                )}
              </motion.h1>
              
              <motion.p 
                className="text-xl text-white/90 mb-8"
                variants={fadeIn}
                style={{ direction: currentLanguage === 'ur' ? 'rtl' : 'ltr' }}
              >
                {texts[currentLanguage].subtitle}
              </motion.p>
              
              <motion.div 
                className="flex flex-col sm:flex-row gap-4 mb-8"
                variants={fadeIn}
              >
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button size="lg" variant="secondary">
                    {currentLanguage === 'en' ? 'Start Free Portfolio Review' : 'مفت پورٹ فولیو ریویو شروع کریں'}
                    <ArrowRight className={`w-5 h-5 ${currentLanguage === 'ur' ? 'mr-2 rotate-180' : 'ml-2'}`} />
                  </Button>
                </motion.div>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button 
                    size="lg" 
                    variant="outline" 
                    className="border-white text-white hover:bg-white hover:text-primary"
                    onClick={toggleLanguage}
                  >
                    <Globe className="w-5 h-5 mr-2" />
                    {currentLanguage === 'en' ? 'اردو' : 'English'}
                  </Button>
                </motion.div>
              </motion.div>
              
              <motion.div 
                className="grid grid-cols-2 gap-6 text-sm"
                variants={staggerContainer}
              >
                {[
                  '0.25% management fee',
                  'Automated rebalancing', 
                  'Tax-loss harvesting',
                  '24/7 portfolio monitoring'
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
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold flex items-center">
                  <Activity className="w-5 h-5 mr-2" />
                  {texts[currentLanguage].livePerformance}
                  <motion.div
                    className="w-2 h-2 bg-green-400 rounded-full ml-2"
                    animate={{ opacity: [1, 0.5, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                </h3>
                <motion.button
                  className="p-2 hover:bg-white/10 rounded-full transition-colors"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setIsPlaying(!isPlaying)}
                >
                  {isPlaying ? (
                    <Pause className="w-4 h-4 text-white" />
                  ) : (
                    <Play className="w-4 h-4 text-white" />
                  )}
                </motion.button>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-6">
                {marketData && marketData.realtime ? (
                  <>
                    <motion.div 
                      className="bg-white/10 rounded-lg p-3"
                      whileHover={{ scale: 1.02 }}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                    >
                      <div className="flex items-center mb-2">
                        <TrendingUp className="w-4 h-4 text-secondary mr-2" />
                        <div className="text-lg font-bold text-secondary">
                          {marketData.realtime.kse100.value}
                        </div>
                      </div>
                      <div className="text-xs text-white/70">KSE-100 Index</div>
                      <div className="text-xs text-green-400">{marketData.realtime.kse100.change}</div>
                    </motion.div>
                    
                    <motion.div 
                      className="bg-white/10 rounded-lg p-3"
                      whileHover={{ scale: 1.02 }}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                    >
                      <div className="flex items-center mb-2">
                        <DollarSign className="w-4 h-4 text-secondary mr-2" />
                        <div className="text-lg font-bold text-secondary">
                          14.2%
                        </div>
                      </div>
                      <div className="text-xs text-white/70">Avg Annual Return</div>
                      <div className="text-xs text-green-400">+2.1% vs benchmark</div>
                    </motion.div>
                    
                    <motion.div 
                      className="bg-white/10 rounded-lg p-3"
                      whileHover={{ scale: 1.02 }}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                    >
                      <div className="flex items-center mb-2">
                        <Shield className="w-4 h-4 text-secondary mr-2" />
                        <div className="text-lg font-bold text-secondary">
                          1.18
                        </div>
                      </div>
                      <div className="text-xs text-white/70">Sharpe Ratio</div>
                      <div className="text-xs text-white/60">Risk-adjusted return</div>
                    </motion.div>
                    
                    <motion.div 
                      className="bg-white/10 rounded-lg p-3"
                      whileHover={{ scale: 1.02 }}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                    >
                      <div className="flex items-center mb-2">
                        <Target className="w-4 h-4 text-secondary mr-2" />
                        <div className="text-lg font-bold text-secondary">
                          78%
                        </div>
                      </div>
                      <div className="text-xs text-white/70">Win Rate</div>
                      <div className="text-xs text-white/60">Successful trades</div>
                    </motion.div>
                  </>
                ) : (
                  [...Array(4)].map((_, index) => (
                    <motion.div 
                      key={index}
                      className="bg-white/10 rounded-lg p-3 animate-pulse"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <div className="h-4 bg-white/20 rounded mb-2" />
                      <div className="h-3 bg-white/10 rounded" />
                    </motion.div>
                  ))
                )}
              </div>
              
              <motion.div 
                className="bg-white/10 rounded-lg p-4"
                animate={{ 
                  backgroundColor: isPlaying ? 'rgba(0, 208, 156, 0.1)' : 'rgba(255, 255, 255, 0.1)' 
                }}
                transition={{ duration: 0.3 }}
              >
                <div className="text-sm text-white/80 mb-2 flex items-center">
                  <Lightbulb className="w-4 h-4 mr-2" />
                  {texts[currentLanguage].aiRecommendation}
                  <span className="ml-2 text-xs px-2 py-1 bg-secondary/20 text-secondary rounded-full">
                    {aiSimulation.status}
                  </span>
                </div>
                <div className="flex items-center">
                  <div className="flex-1 bg-white/20 rounded-full h-2 mr-3">
                    <motion.div 
                      className="bg-secondary h-2 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${aiSimulation.score}%` }}
                      transition={{ duration: 1 }}
                    />
                  </div>
                  <motion.span 
                    className="text-lg font-bold text-secondary"
                    animate={{ 
                      scale: isPlaying ? [1, 1.1, 1] : 1,
                      color: isPlaying ? ['#00D09C', '#16FFB9', '#00D09C'] : '#00D09C'
                    }}
                    transition={{ duration: 2, repeat: isPlaying ? Infinity : 0 }}
                  >
                    {aiSimulation.score}/100
                  </motion.span>
                </div>
                <div className="text-xs text-white/70 mt-1">
                  {currentLanguage === 'en' ? 'Excellent portfolio optimization' : 'بہترین پورٹ فولیو آپٹیمائزیشن'}
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* Portfolio Types */}
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
              Choose Your AI-Managed Portfolio
            </h2>
            <p className="text-xl text-muted max-w-3xl mx-auto">
              Our AI creates personalized portfolios tailored to your risk tolerance, investment goals, and financial timeline.
            </p>
          </motion.div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {portfolioTypes.map((portfolio, index) => {
              const IconComponent = portfolio.icon;
              return (
                <motion.div
                  key={index}
                  variants={slideInUp}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ y: -8 }}
                  onClick={() => setSelectedPortfolio(index)}
                >
                  <AnimatedCard className={`h-full cursor-pointer border-2 transition-all duration-300 ${
                    selectedPortfolio === index ? 'border-secondary bg-secondary/5' : 'border-transparent hover:border-secondary/30'
                  }`}>
                    <CardContent className="pt-6 text-center">
                      <motion.div 
                        className={`w-16 h-16 bg-gradient-to-r ${portfolio.color} rounded-full flex items-center justify-center mx-auto mb-4`}
                        whileHover={{ scale: 1.1, rotate: 360 }}
                        transition={{ duration: 0.6 }}
                      >
                        <IconComponent className="w-8 h-8 text-white" />
                      </motion.div>
                      
                      <h3 className="text-xl font-heading font-bold text-primary mb-2">
                        {portfolio.type}
                      </h3>
                      
                      <div className="mb-4">
                        <div className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                          portfolio.risk === 'Low' ? 'bg-green-100 text-green-700' :
                          portfolio.risk === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {portfolio.risk} Risk
                        </div>
                      </div>
                      
                      <div className="text-2xl font-bold text-secondary mb-2">
                        {portfolio.expectedReturn}
                      </div>
                      <div className="text-sm text-muted mb-4">Expected Annual Return</div>
                      
                      <p className="text-sm text-muted leading-relaxed mb-4">
                        {portfolio.description}
                      </p>
                      
                      {/* Allocation Chart */}
                      <div className="space-y-2">
                        {Object.entries(portfolio.allocation).map(([asset, percentage]) => (
                          <div key={asset} className="flex items-center justify-between text-xs">
                            <span className="capitalize">{asset}:</span>
                            <div className="flex items-center">
                              <div className="w-16 bg-gray-200 rounded-full h-1 mr-2">
                                <div 
                                  className="bg-secondary h-1 rounded-full" 
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                              <span className="font-semibold">{percentage}%</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </AnimatedCard>
                </motion.div>
              );
            })}
          </div>
        </div>
      </motion.section>

      {/* AI Features */}
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
              <Brain className="w-4 h-4 mr-2" />
              Advanced AI Technology
            </div>
            <h2 className="text-3xl lg:text-4xl font-heading font-bold text-primary mb-4">
              Artificial Intelligence That Never Sleeps
            </h2>
            <p className="text-xl text-muted max-w-3xl mx-auto">
              Our sophisticated AI algorithms work 24/7 to optimize your portfolio, manage risk, and capitalize on market opportunities.
            </p>
          </motion.div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {roboFeatures.map((feature, index) => {
              const IconComponent = feature.icon;
              return (
                <motion.div
                  key={index}
                  variants={slideInUp}
                  transition={{ delay: index * 0.1 }}
                >
                  <AnimatedCard className="h-full group">
                    <CardHeader>
                      <motion.div 
                        className={`w-12 h-12 bg-gradient-to-r ${feature.gradient} rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-all duration-300`}
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

      {/* AI Capabilities */}
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
              Advanced AI Capabilities
            </h2>
            <p className="text-xl text-muted max-w-3xl mx-auto">
              See how our AI delivers superior performance through cutting-edge technology and data analysis.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {aiCapabilities.map((capability, index) => (
              <motion.div key={index} variants={slideInUp} transition={{ delay: index * 0.2 }}>
                <AnimatedCard className="text-center h-full">
                  <CardContent className="pt-8">
                    <motion.div 
                      className="w-16 h-16 bg-secondary/10 rounded-full flex items-center justify-center mx-auto mb-6"
                      whileHover={{ scale: 1.1, backgroundColor: 'rgb(0, 208, 156, 0.2)' }}
                    >
                      <Brain className="w-8 h-8 text-secondary" />
                    </motion.div>
                    <h3 className="text-xl font-heading font-bold text-primary mb-4">
                      {capability.title}
                    </h3>
                    <p className="text-muted mb-4 leading-relaxed">
                      {capability.description}
                    </p>
                    <div className="bg-secondary/10 text-secondary px-3 py-2 rounded-full text-sm font-medium">
                      {capability.impact}
                    </div>
                  </CardContent>
                </AnimatedCard>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Advantages */}
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
              Why Choose Robo-Advisory
            </h2>
            <p className="text-xl text-muted max-w-3xl mx-auto">
              Experience the advantages of AI-powered investment management over traditional wealth management.
            </p>
          </motion.div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {roboAdvantages.map((advantage, index) => {
              const IconComponent = advantage.icon;
              return (
                <motion.div
                  key={index}
                  variants={slideInUp}
                  transition={{ delay: index * 0.1 }}
                >
                  <AnimatedCard className="text-center h-full">
                    <CardContent className="pt-6">
                      <motion.div 
                        className="w-16 h-16 bg-secondary/10 rounded-full flex items-center justify-center mx-auto mb-4"
                        whileHover={{ scale: 1.1, rotate: 360 }}
                        transition={{ duration: 0.6 }}
                      >
                        <IconComponent className="w-8 h-8 text-secondary" />
                      </motion.div>
                      
                      <h3 className="text-xl font-heading font-bold text-primary mb-3">
                        {advantage.title}
                      </h3>
                      
                      <div className="text-lg font-bold text-secondary mb-3">
                        {advantage.value}
                      </div>
                      
                      <p className="text-muted text-sm leading-relaxed">
                        {advantage.description}
                      </p>
                    </CardContent>
                  </AnimatedCard>
                </motion.div>
              );
            })}
          </div>
        </div>
      </motion.section>

      {/* How It Works */}
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
              How Robo-Advisory Works
            </h2>
            <p className="text-xl text-muted max-w-3xl mx-auto">
              Four simple steps to start your AI-powered investment journey.
            </p>
          </motion.div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, index) => {
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

      {/* Testimonials */}
      {testimonials.length > 0 && (
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
                What Our Investors Say
              </h2>
              <p className="text-xl text-muted max-w-3xl mx-auto">
                Real experiences from Pakistani investors using our robo-advisory service.
              </p>
            </motion.div>
            
            <div className="grid md:grid-cols-3 gap-8">
              {testimonials.map((testimonial, index) => (
                <motion.div
                  key={index}
                  variants={slideInUp}
                  transition={{ delay: index * 0.2 }}
                >
                  <AnimatedCard className="h-full">
                    <CardContent className="pt-6">
                      <div className="flex items-center mb-4">
                        {[...Array(testimonial.rating || 5)].map((_, i) => (
                          <Star key={i} className="w-4 h-4 text-yellow-400 fill-current" />
                        ))}
                      </div>
                      
                      <p className="text-muted italic mb-6 leading-relaxed">
                        "{testimonial.content}"
                      </p>
                      
                      <div className="flex items-center">
                        <div className="w-12 h-12 bg-secondary/10 rounded-full flex items-center justify-center mr-4">
                          <Users className="w-6 h-6 text-secondary" />
                        </div>
                        <div>
                          <div className="font-semibold text-foreground">{testimonial.name}</div>
                          <div className="text-sm text-muted">{testimonial.role}</div>
                          {testimonial.investmentReturn && (
                            <div className="text-sm text-secondary font-medium">
                              +{testimonial.investmentReturn} returns
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </AnimatedCard>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.section>
      )}

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
              Ready to Let AI Manage Your Portfolio?
            </h2>
            <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
              Start your free portfolio review today and see how our AI can optimize your investments for better returns.
            </p>
            
            <motion.div 
              className="flex flex-col sm:flex-row gap-4 justify-center"
              variants={staggerContainer}
            >
              <motion.div variants={fadeIn} whileHover={{ scale: 1.05 }}>
                <Button size="lg" variant="secondary" className="text-lg px-8">
                  <Brain className="w-5 h-5 mr-2" />
                  Start Free Review
                </Button>
              </motion.div>
              <motion.div variants={fadeIn} whileHover={{ scale: 1.05 }}>
                <Link to="/discover/risk-assessment">
                  <Button size="lg" variant="outline" className="text-lg px-8 border-white text-white hover:bg-white hover:text-primary">
                    <Calculator className="w-5 h-5 mr-2" />
                    Take Risk Assessment
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