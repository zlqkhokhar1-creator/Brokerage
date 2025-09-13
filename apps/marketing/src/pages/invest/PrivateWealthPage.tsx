import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { AnimatedCard } from '../../components/ui/AnimatedCard';
import { fadeIn, staggerContainer, slideInUp, slideInLeft, slideInRight } from '../../animations';
import { 
  Crown, 
  Users, 
  Shield, 
  TrendingUp, 
  TrendingDown,
  Clock, 
  Award,
  ArrowRight,
  CheckCircle,
  Phone,
  Briefcase,
  Target,
  Globe,
  PieChart,
  Star,
  DollarSign,
  Activity,
  Zap,
  Eye,
  BarChart3,
  Smartphone,
  Building2
} from 'lucide-react';

export const PrivateWealthPage: React.FC = () => {
  const [selectedTier, setSelectedTier] = useState(1);
  const [marketData, setMarketData] = useState<any>(null);
  const [testimonials, setTestimonials] = useState<any[]>([]);
  const [pricingPlans, setPricingPlans] = useState<any>(null);
  const [currentLanguage, setCurrentLanguage] = useState<'en' | 'ur'>('en');
  const [portfolioAnimation, setPortfolioAnimation] = useState({
    value: 16.8,
    trend: 'up',
    isAnimating: true
  });

  // Fetch data on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [marketResponse, testimonialsResponse, pricingResponse] = await Promise.all([
          fetch('/data/market-data.json'),
          fetch('/data/testimonials.json'),
          fetch('/data/pricing-plans.json')
        ]);
        
        const marketData = await marketResponse.json();
        const testimonialsData = await testimonialsResponse.json();
        const pricingData = await pricingResponse.json();
        
        setMarketData(marketData);
        setTestimonials(testimonialsData.testimonials?.filter(t => 
          t.role.includes('Business Owner') || t.role.includes('Medical') || t.investmentReturn === '22%'
        ).slice(0, 3) || []);
        setPricingPlans(pricingData);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();
  }, []);

  // Portfolio animation effect
  useEffect(() => {
    const interval = setInterval(() => {
      if (portfolioAnimation.isAnimating) {
        setPortfolioAnimation(prev => ({
          ...prev,
          value: Number((prev.value + (Math.random() - 0.5) * 0.5).toFixed(1)),
          trend: Math.random() > 0.7 ? (prev.trend === 'up' ? 'down' : 'up') : prev.trend
        }));
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [portfolioAnimation.isAnimating]);

  // Language toggle function
  const toggleLanguage = () => {
    setCurrentLanguage(prev => prev === 'en' ? 'ur' : 'en');
  };

  const texts = {
    en: {
      title: 'Private Wealth Management for Elite Investors',
      subtitle: 'Personalized wealth management solutions for Pakistan’s most successful individuals and families. Dedicated expertise, exclusive opportunities, and institutional-grade investment strategies.',
      elitePerformance: 'Elite Portfolio Performance',
      scheduleConsultation: 'Schedule Private Consultation',
      callWealth: 'Call: +92-21-111-WEALTH'
    },
    ur: {
      title: 'اعلیٰ سرمایہ کاروں کے لیے پرائیویٹ ویلتھ مینجمنٹ',
      subtitle: 'پاکستان کے سب سے زیادہ کامیاب افراد اور خاندانوں کے لیے ذاتی ویلتھ مینجمنٹ ٹیلرڈ حل۔ مخصوص مہارت، انتہائی مواقع، اور ادارتی طریقہ کار کی سرمایہ کاری کی حکمت عملیاں۔',
      elitePerformance: 'اعلیٰ پورٹ فولیو کارکردگی',
      scheduleConsultation: 'پرائیویٹ مشاورت شیڈول کریں',
      callWealth: 'فون: +92-21-111-WEALTH'
    }
  };
  const services = [
    {
      icon: PieChart,
      title: 'Portfolio Management',
      description: 'Dedicated portfolio managers create and manage customized investment strategies aligned with your wealth goals and risk tolerance.'
    },
    {
      icon: Target,
      title: 'Financial Planning',
      description: 'Comprehensive financial planning including retirement, estate planning, tax optimization, and generational wealth transfer strategies.'
    },
    {
      icon: Globe,
      title: 'Alternative Investments',
      description: 'Access to exclusive investment opportunities including private equity, real estate, commodities, and international markets.'
    },
    {
      icon: Shield,
      title: 'Wealth Preservation',
      description: 'Advanced risk management strategies to protect and preserve wealth across market cycles and economic conditions.'
    },
    {
      icon: Briefcase,
      title: 'Corporate Advisory',
      description: 'Specialized services for business owners including succession planning, corporate restructuring, and liquidity events.'
    },
    {
      icon: Award,
      title: 'Shariah Advisory',
      description: 'Dedicated Islamic wealth management services ensuring all investments comply with Shariah principles and guidelines.'
    }
  ];

  const wealthTiers = [
    {
      tier: 'Preferred',
      minimum: 'PKR 25 Million',
      features: [
        'Dedicated relationship manager',
        'Quarterly portfolio reviews',
        'Access to exclusive funds',
        'Priority customer support',
        'Basic tax optimization'
      ],
      fee: '0.75% annually'
    },
    {
      tier: 'Private',
      minimum: 'PKR 100 Million',
      features: [
        'Senior portfolio manager',
        'Monthly portfolio reviews',
        'Alternative investments access',
        'Comprehensive financial planning',
        'Advanced tax strategies',
        'Estate planning services'
      ],
      fee: '0.50% annually'
    },
    {
      tier: 'Ultra High Net Worth',
      minimum: 'PKR 500 Million',
      features: [
        'Chief Investment Officer access',
        'Weekly strategy sessions',
        'Bespoke investment solutions',
        'Multi-generational planning',
        'Corporate advisory services',
        'Concierge banking services',
        'Family office solutions'
      ],
      fee: 'Negotiable'
    }
  ];

  const wealthMetrics = [
    { metric: 'Assets Under Management', value: 'PKR 15.2B', description: 'Total client wealth managed' },
    { metric: 'Average Annual Return', value: '16.8%', description: 'Net of fees (5-year average)' },
    { metric: 'Client Retention Rate', value: '96%', description: 'Long-term client satisfaction' },
    { metric: 'Average Portfolio Value', value: 'PKR 180M', description: 'Median client portfolio size' }
  ];

  const teamExpertise = [
    {
      role: 'Chief Investment Officer',
      name: 'Sarah Ahmed, CFA',
      experience: '15+ years Wall Street & regional markets',
      expertise: 'Portfolio Strategy & Risk Management'
    },
    {
      role: 'Senior Portfolio Manager',
      name: 'Ahmed Khan, CAIA',
      experience: '12+ years alternative investments',
      expertise: 'Private Equity & Real Estate'
    },
    {
      role: 'Wealth Planning Director',
      name: 'Fatima Ali, CFP',
      experience: '10+ years wealth planning',
      expertise: 'Tax Optimization & Estate Planning'
    },
    {
      role: 'Shariah Advisory Head',
      name: 'Dr. Mohammad Hassan',
      experience: '20+ years Islamic finance',
      expertise: 'Shariah Compliance & Structuring'
    }
  ];

  const exclusiveOpportunities = [
    {
      type: 'Private Real Estate',
      description: 'Prime commercial and residential developments in Karachi, Lahore, and Islamabad',
      minInvestment: 'PKR 50M',
      expectedReturn: '12-18%'
    },
    {
      type: 'Private Equity Funds',
      description: 'Direct investments in high-growth Pakistani companies and regional expansion',
      minInvestment: 'PKR 25M',
      expectedReturn: '20-30%'
    },
    {
      type: 'International Funds',
      description: 'Diversified exposure to global markets through offshore fund structures',
      minInvestment: 'PKR 100M',
      expectedReturn: '8-15%'
    },
    {
      type: 'Structured Products',
      description: 'Custom-designed investment solutions for specific risk-return profiles',
      minInvestment: 'PKR 75M',
      expectedReturn: '10-25%'
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
                <Crown className="w-4 h-4 mr-2" />
                {currentLanguage === 'en' ? 'Exclusive Wealth Management Services' : 'خصوصی ویلتھ مینجمنٹ سروسز'}
              </motion.div>
              
              <motion.h1 
                className="text-4xl lg:text-5xl font-heading font-bold mb-6"
                variants={fadeIn}
                style={{ direction: currentLanguage === 'ur' ? 'rtl' : 'ltr' }}
              >
                {currentLanguage === 'en' ? (
                  <>
                    Private Wealth Management for 
                    <span className="text-secondary">Elite Investors</span>
                  </>
                ) : (
                  <>
                    <span className="text-secondary">اعلیٰ سرمایہ کاروں</span> کے لیے 
                    پرائیویٹ ویلتھ مینجمنٹ
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
                    {texts[currentLanguage].scheduleConsultation}
                    <ArrowRight className={`w-5 h-5 ${currentLanguage === 'ur' ? 'mr-2 rotate-180' : 'ml-2'}`} />
                  </Button>
                </motion.div>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-primary">
                    <Phone className="w-5 h-5 mr-2" />
                    {texts[currentLanguage].callWealth}
                  </Button>
                </motion.div>
              </motion.div>
              
              <motion.div 
                className="flex items-center justify-between mb-4"
                variants={staggerContainer}
              >
                <motion.button
                  onClick={toggleLanguage}
                  className="flex items-center px-4 py-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Globe className="w-4 h-4 mr-2" />
                  <span className="text-sm">{currentLanguage === 'en' ? 'اردو' : 'English'}</span>
                </motion.button>
              </motion.div>
              
            </motion.div>
            
            <motion.div 
              className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20"
              variants={slideInRight}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold">
                  {texts[currentLanguage].elitePerformance}
                </h3>
                <motion.button
                  className="p-2 hover:bg-white/10 rounded-full transition-colors"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setPortfolioAnimation(prev => ({ ...prev, isAnimating: !prev.isAnimating }))}
                >
                  {portfolioAnimation.isAnimating ? (
                    <Activity className="w-4 h-4 text-green-400" />
                  ) : (
                    <Activity className="w-4 h-4 text-white/60" />
                  )}
                </motion.button>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-6">
                <motion.div 
                  className="bg-white/10 rounded-lg p-4"
                  whileHover={{ scale: 1.02 }}
                  animate={{
                    backgroundColor: portfolioAnimation.trend === 'up' ? 
                      'rgba(0, 208, 156, 0.1)' : 'rgba(255, 255, 255, 0.1)'
                  }}
                >
                  <div className="flex items-center">
                    <motion.div 
                      className="text-secondary text-2xl font-bold"
                      animate={{ 
                        color: portfolioAnimation.trend === 'up' ? '#00D09C' : '#ff6b6b',
                        scale: portfolioAnimation.isAnimating ? [1, 1.05, 1] : 1
                      }}
                      transition={{ duration: 2, repeat: portfolioAnimation.isAnimating ? Infinity : 0 }}
                    >
                      +{portfolioAnimation.value}%
                    </motion.div>
                    {portfolioAnimation.trend === 'up' ? (
                      <TrendingUp className="w-4 h-4 ml-2 text-green-400" />
                    ) : (
                      <TrendingDown className="w-4 h-4 ml-2 text-red-400" />
                    )}
                  </div>
                  <div className="text-white/80 text-sm">
                    {currentLanguage === 'en' ? '5-Year Average Return' : '5 سالہ اوسط واپسی'}
                  </div>
                </motion.div>
                
                <motion.div 
                  className="bg-white/10 rounded-lg p-4"
                  whileHover={{ scale: 1.02 }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <div className="text-secondary text-2xl font-bold">
                    {marketData?.marketStats?.totalMarketCap || 'PKR 15.2B'}
                  </div>
                  <div className="text-white/80 text-sm">
                    {currentLanguage === 'en' ? 'Assets Under Management' : 'زیر انتظام اثاثہ'}
                  </div>
                </motion.div>
              </div>
              
              <div className="space-y-3">
                <motion.div 
                  className="flex items-center justify-between"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <span className="text-white/90">
                    {currentLanguage === 'en' ? 'Client Portfolio Avg' : 'کلائنٹ پورٹ فولیو اوسط'}
                  </span>
                  <span className="text-secondary">PKR 180M</span>
                </motion.div>
                <motion.div 
                  className="flex items-center justify-between"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <span className="text-white/90">
                    {currentLanguage === 'en' ? 'Global Diversification' : 'عالمی تنوع'}
                  </span>
                  <span className="text-secondary">35%</span>
                </motion.div>
                <motion.div 
                  className="flex items-center justify-between"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  <span className="text-white/90">
                    {currentLanguage === 'en' ? 'Risk-Adjusted Return' : 'خطرہ کے حساب سے واپسی'}
                  </span>
                  <span className="text-secondary">Sharpe: 1.4</span>
                </motion.div>
              </div>
              
              <motion.div 
                className="mt-6 pt-4 border-t border-white/20"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
              >
                <div className="flex items-center justify-center">
                  <div className="flex space-x-1">
                    {[...Array(5)].map((_, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.7 + i * 0.1 }}
                      >
                        <Star className="w-4 h-4 text-yellow-400 fill-current" />
                      </motion.div>
                    ))}
                  </div>
                  <span className="ml-2 text-white/80 text-sm">
                    {currentLanguage === 'en' ? '96% Client Satisfaction' : '96% کلائنٹ اطمینان'}
                  </span>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* Services Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-heading font-bold text-primary mb-4">
              Comprehensive Wealth Services
            </h2>
            <p className="text-xl text-muted max-w-3xl mx-auto">
              Our private wealth management services are designed to address every aspect of your financial life with institutional-grade expertise.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {services.map((service, index) => {
              const IconComponent = service.icon;
              return (
                <Card key={index} hover className="group">
                  <CardHeader>
                    <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center mb-4 group-hover:bg-secondary group-hover:scale-110 transition-all duration-300">
                      <IconComponent className="w-6 h-6 text-secondary group-hover:text-white" />
                    </div>
                    <CardTitle>{service.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted">{service.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Wealth Tiers Section */}
      <section className="py-20 bg-background-alt">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-heading font-bold text-primary mb-4">
              Wealth Management Tiers
            </h2>
            <p className="text-xl text-muted max-w-3xl mx-auto">
              Tailored service levels designed to meet the unique needs of different wealth segments with progressively enhanced benefits.
            </p>
          </div>
          
          <div className="grid lg:grid-cols-3 gap-8">
            {wealthTiers.map((tier, index) => (
              <Card key={index} hover className={`group relative ${
                index === 1 ? 'ring-2 ring-secondary border-secondary' : ''
              }`}>
                {index === 1 && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <div className="bg-secondary text-white px-4 py-1 rounded-full text-sm font-medium">
                      Most Popular
                    </div>
                  </div>
                )}
                
                <CardHeader>
                  <div className="text-center mb-6">
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 ${
                      index === 0 ? 'bg-blue-100' : index === 1 ? 'bg-secondary/10' : 'bg-purple-100'
                    }`}>
                      <Crown className={`w-8 h-8 ${
                        index === 0 ? 'text-blue-600' : index === 1 ? 'text-secondary' : 'text-purple-600'
                      }`} />
                    </div>
                    <CardTitle className="text-2xl mb-2">{tier.tier}</CardTitle>
                    <div className="text-3xl font-bold text-primary mb-2">{tier.minimum}</div>
                    <div className="text-muted">Minimum Investment</div>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div className="space-y-4 mb-8">
                    {tier.features.map((feature, featureIndex) => (
                      <div key={featureIndex} className="flex items-center">
                        <CheckCircle className="w-5 h-5 text-secondary mr-3 flex-shrink-0" />
                        <span className="text-foreground">{feature}</span>
                      </div>
                    ))}
                  </div>
                  
                  <div className="border-t pt-6">
                    <div className="text-center mb-6">
                      <div className="text-lg font-semibold text-primary">Management Fee</div>
                      <div className="text-2xl font-bold text-secondary">{tier.fee}</div>
                    </div>
                    
                    <Button className={`w-full ${
                      index === 1 ? 'bg-secondary hover:bg-accent' : ''
                    }`}>
                      Learn More
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Team Expertise Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-heading font-bold text-primary mb-4">
              Meet Your Wealth Management Team
            </h2>
            <p className="text-xl text-muted max-w-3xl mx-auto">
              Our senior investment professionals bring decades of experience from leading financial institutions worldwide.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            {teamExpertise.map((member, index) => (
              <Card key={index} hover>
                <CardHeader>
                  <div className="flex items-start space-x-4">
                    <div className="w-16 h-16 bg-secondary/10 rounded-2xl flex items-center justify-center flex-shrink-0">
                      <Users className="w-8 h-8 text-secondary" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-lg mb-1">{member.name}</CardTitle>
                      <div className="text-secondary font-medium mb-2">{member.role}</div>
                      <div className="text-sm text-muted mb-2">{member.experience}</div>
                      <div className="text-sm font-medium text-foreground">{member.expertise}</div>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Exclusive Opportunities Section */}
      <section className="py-20 bg-background-alt">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-heading font-bold text-primary mb-4">
              Exclusive Investment Opportunities
            </h2>
            <p className="text-xl text-muted max-w-3xl mx-auto">
              Access unique investment opportunities typically reserved for institutional investors and ultra-high-net-worth individuals.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            {exclusiveOpportunities.map((opportunity, index) => (
              <Card key={index} hover className="group">
                <CardHeader>
                  <CardTitle className="text-xl mb-4">{opportunity.type}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted mb-6">{opportunity.description}</p>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-muted mb-1">Minimum Investment</div>
                      <div className="font-semibold text-primary">{opportunity.minInvestment}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted mb-1">Expected Return</div>
                      <div className="font-semibold text-secondary">{opportunity.expectedReturn}</div>
                    </div>
                  </div>
                  
                  <Button className="w-full mt-6 group-hover:bg-secondary group-hover:scale-105 transition-all duration-300">
                    Request Information
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Performance Metrics Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-heading font-bold text-primary mb-4">
              Proven Wealth Creation
            </h2>
            <p className="text-xl text-muted max-w-3xl mx-auto">
              Our track record speaks for itself. Consistent outperformance and client satisfaction across all market conditions.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {wealthMetrics.map((metric, index) => (
              <div key={index} className="text-center">
                <div className="w-20 h-20 bg-secondary/10 rounded-3xl flex items-center justify-center mx-auto mb-6">
                  <TrendingUp className="w-10 h-10 text-secondary" />
                </div>
                <div className="text-4xl font-bold text-primary mb-2">{metric.value}</div>
                <div className="font-semibold text-foreground mb-2">{metric.metric}</div>
                <div className="text-sm text-muted">{metric.description}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-primary text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl lg:text-4xl font-heading font-bold mb-6">
            Ready for Elite Wealth Management?
          </h2>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            Join Pakistan's most successful investors who trust InvestPro with their wealth management needs.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <Button size="lg" variant="secondary" className="text-lg px-8">
              Schedule Private Consultation
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button size="lg" variant="outline" className="text-lg px-8 border-white text-white hover:bg-white hover:text-primary">
              <Phone className="w-5 h-5 mr-2" />
              Call +92-21-111-WEALTH
            </Button>
          </div>
          
          <p className="text-white/80 text-sm">
            PKR 25M minimum • Confidential consultations • No obligation
          </p>
        </div>
      </section>
    </div>
  );
};