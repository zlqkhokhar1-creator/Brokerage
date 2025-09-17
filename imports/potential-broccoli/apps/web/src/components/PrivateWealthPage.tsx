'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
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
  Building2,
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

interface PrivateWealthPageProps {
  onNavigate?: (page: string) => void;
}

export const PrivateWealthPage: React.FC<PrivateWealthPageProps> = ({ onNavigate }) => {
  const [selectedTier, setSelectedTier] = useState(1);
  const [marketData, setMarketData] = useState<any>(null);
  const [testimonials, setTestimonials] = useState<any[]>([]);
  const [pricingPlans, setPricingPlans] = useState<any>(null);
  const [currentLanguage, setCurrentLanguage] = useState<'en' | 'ur'>('en');
  const [portfolioAnimation, setPortfolioAnimation] = useState({
    value: 16.8,
    trend: 'up' as 'up' | 'down',
    isAnimating: true
  });

  // Animation variants
  const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const slideInLeft = {
    hidden: { opacity: 0, x: -50 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.6 } }
  };

  const slideInRight = {
    hidden: { opacity: 0, x: 50 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.6 } }
  };

  // Fetch data on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Simulate data fetching with mock data
        setMarketData({
          marketStats: {
            totalMarketCap: 'PKR 15.2B'
          }
        });
        setTestimonials([
          {
            name: 'Ahmed Hassan',
            role: 'Business Owner',
            investmentReturn: '22%',
            comment: 'InvestPro\'s private wealth team has exceeded all expectations.'
          }
        ]);
        setPricingPlans({
          plans: []
        });
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
      subtitle: 'Personalized wealth management solutions for Pakistan\'s most successful individuals and families. Dedicated expertise, exclusive opportunities, and institutional-grade investment strategies.',
      elitePerformance: 'Elite Portfolio Performance',
      scheduleConsultation: 'Schedule Private Consultation',
      callWealth: 'Call: +92-21-111-WEALTH',
      clientSatisfaction: '96% Client Satisfaction',
      averageReturn: '5-Year Average Return'
    },
    ur: {
      title: 'اعلیٰ سرمایہ کاروں کے لیے پرائیویٹ ویلتھ مینجمنٹ',
      subtitle: 'پاکستان کے سب سے زیادہ کامیاب افراد اور خاندانوں کے لیے ذاتی ویلتھ مینجمنٹ ٹیلرڈ حل۔ مخصوص مہارت، انتہائی مواقع، اور ادارتی طریقہ کار کی سرمایہ کاری کی حکمت عملیاں۔',
      elitePerformance: 'اعلیٰ پورٹ فولیو کارکردگی',
      scheduleConsultation: 'پرائیویٹ مشاورت شیڈول کریں',
      callWealth: 'فون: +92-21-111-WEALTH',
      clientSatisfaction: '96% کلائنٹ اطمینان',
      averageReturn: '5 سالہ اوسط واپسی'
    }
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-background">
        {/* Hero Section */}
        <MotionWrapper 
          className="bg-gradient-to-br from-blue-900 via-blue-800 to-purple-900 text-white py-20"
        >
          <div className="container mx-auto px-4">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <motion.div className="max-w-2xl" variants={slideInLeft}>
                <motion.div 
                  className="inline-flex items-center bg-yellow-500/20 text-yellow-300 px-4 py-2 rounded-full text-sm font-medium mb-6"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Crown className="w-4 h-4 mr-2" />
                  {currentLanguage === 'en' ? 'Exclusive Wealth Management Services' : 'خصوصی ویلتھ مینجمنٹ سروسز'}
                </motion.div>
                
                <motion.h1 
                  className="text-4xl lg:text-5xl font-bold mb-6"
                  variants={fadeIn}
                  style={{ direction: currentLanguage === 'ur' ? 'rtl' : 'ltr' }}
                >
                  {currentLanguage === 'en' ? (
                    <>
                      Private Wealth Management for 
                      <span className="text-yellow-400"> Elite Investors</span>
                    </>
                  ) : (
                    <>
                      <span className="text-yellow-400">اعلیٰ سرمایہ کاروں</span> کے لیے 
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
                  <Button 
                    size="lg" 
                    className="bg-yellow-500 hover:bg-yellow-600 text-black text-lg px-8 py-6"
                    onClick={() => onNavigate && onNavigate('contact')}
                  >
                    {texts[currentLanguage].scheduleConsultation}
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    size="lg" 
                    className="text-white border-white hover:bg-white/10 text-lg px-8 py-6"
                    onClick={toggleLanguage}
                  >
                    {currentLanguage === 'en' ? 'اردو میں دیکھیں' : 'View in English'}
                  </Button>
                </motion.div>
                
                <motion.div 
                  className="flex flex-wrap items-center gap-6 text-sm text-white/80"
                  variants={staggerContainer}
                >
                  {[
                    { icon: <Shield className="w-5 h-5 text-green-400" />, text: 'SECP Regulated' },
                    { icon: <Users className="w-5 h-5 text-blue-400" />, text: '1,200+ Clients' },
                    { icon: <Award className="w-5 h-5 text-yellow-400" />, text: 'Award Winning' },
                  ].map((item, i) => (
                    <motion.div 
                      key={i} 
                      className="flex items-center gap-2"
                      variants={fadeIn}
                    >
                      {item.icon}
                      <span>{item.text}</span>
                    </motion.div>
                  ))}
                </motion.div>
              </motion.div>
              
              <motion.div 
                className="relative"
                variants={slideInRight}
              >
                {/* Portfolio Performance Card */}
                <motion.div 
                  className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 shadow-2xl border border-white/10"
                  whileHover={{ y: -5 }}
                  transition={{ type: 'spring', stiffness: 300 }}
                >
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-semibold">
                      {texts[currentLanguage].elitePerformance}
                    </h3>
                    <div className="flex items-center">
                      <span className="text-2xl font-bold text-yellow-400">
                        <CountUp end={portfolioAnimation.value} duration={1} decimals={1} />%
                      </span>
                      {portfolioAnimation.trend === 'up' ? (
                        <TrendingUp className="w-5 h-5 ml-2 text-green-400" />
                      ) : (
                        <TrendingDown className="w-5 h-5 ml-2 text-red-400" />
                      )}
                    </div>
                  </div>
                  
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden mb-4">
                    <motion.div 
                      className="h-full bg-gradient-to-r from-yellow-400 to-yellow-600"
                      initial={{ width: '0%' }}
                      animate={{ width: `${Math.min(100, portfolioAnimation.value * 4)}%` }}
                      transition={{ duration: 1.5, ease: 'easeOut' }}
                    />
                  </div>
                  
                  <div className="flex justify-between text-xs text-white/60 mb-6">
                    <span>{currentLanguage === 'en' ? 'Low Risk' : 'کم رسک'}</span>
                    <span>{currentLanguage === 'en' ? 'High Return' : 'زیادہ منافع'}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="flex -space-x-2">
                        {[1, 2, 3, 4, 5].map((_, i) => (
                          <motion.div 
                            key={i}
                            className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center"
                            initial={{ opacity: 0, scale: 0 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.7 + i * 0.1 }}
                          >
                            <Star className="w-4 h-4 text-yellow-400 fill-current" />
                          </motion.div>
                        ))}
                      </div>
                      <span className="ml-2 text-white/80 text-sm">
                        {texts[currentLanguage].clientSatisfaction}
                      </span>
                    </div>
                    
                    <div className="flex items-center">
                      <span className="text-white/80 text-sm mr-2">
                        {texts[currentLanguage].averageReturn}
                      </span>
                      {portfolioAnimation.trend === 'up' ? (
                        <TrendingUp className="w-4 h-4 text-green-400" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-red-400" />
                      )}
                    </div>
                  </div>
                </motion.div>
                
                {/* Market Stats Card */}
                <motion.div 
                  className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 shadow-2xl border border-white/10 mt-6"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">
                      {currentLanguage === 'en' ? 'Market Overview' : 'مارکیٹ کا جائزہ'}
                    </h3>
                    <Globe className="w-5 h-5 text-blue-400" />
                  </div>
                  
                  <div className="space-y-4">
                    {[
                      { label: currentLanguage === 'en' ? 'Total Market Cap' : 'کل مارکیٹ کیپ', value: marketData?.marketStats?.totalMarketCap || 'PKR 15.2B' },
                      { label: currentLanguage === 'en' ? 'Active Clients' : 'فعال کلائنٹس', value: '1,200+' },
                      { label: currentLanguage === 'en' ? 'Years of Excellence' : 'سالوں کی مہارت', value: '12+' },
                    ].map((stat, index) => (
                      <div key={index} className="flex justify-between items-center">
                        <span className="text-white/70">{stat.label}</span>
                        <span className="font-medium">{stat.value}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              </motion.div>
            </div>
          </div>
        </MotionWrapper>
        
        {/* Services Section */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
                {currentLanguage === 'en' ? 'Comprehensive Wealth Services' : 'مکمل دولت کے خدمات'}
              </h2>
<p className="text-xl text-gray-600 max-w-3xl mx-auto">
                {currentLanguage === 'en' 
                  ? 'Our private wealth management services are designed to address every aspect of your financial life with institutional-grade expertise.'
                  : 'ہماری پرائیویٹ دولت مینجمنٹ خدمات آپ کی مالی زندگی کے ہر پہلو کو ادارتی سطح کی مہارت سے حل کرنے کے لیے تیار کی گئی ہیں۔'}
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[
                {
                  icon: <Briefcase className="w-8 h-8 text-blue-600" />,
                  title: currentLanguage === 'en' ? 'Investment Management' : 'سرمایہ کاری کا انتظام',
                  description: currentLanguage === 'en' 
                    ? 'Customized investment strategies tailored to your financial goals and risk tolerance.'
                    : 'آپ کے مالی مقاصد اور رسک برداشت کے مطابق اپنی مرضی کے مطابق سرمایہ کاری کی حکمت عملیاں۔'
                },
                {
                  icon: <Target className="w-8 h-8 text-green-600" />,
                  title: currentLanguage === 'en' ? 'Wealth Planning' : 'دولت کی منصوبہ بندی',
                  description: currentLanguage === 'en'
                    ? 'Comprehensive financial planning including retirement, education, and legacy planning.'
                    : 'ریٹائرمنٹ، تعلیم اور ورثے کی منصوبہ بندی سمیت جامع مالی منصوبہ بندی۔'
                },
                {
                  icon: <Shield className="w-8 h-8 text-purple-600" />,
                  title: currentLanguage === 'en' ? 'Risk Management' : 'رسک مینجمنٹ',
                  description: currentLanguage === 'en'
                    ? 'Advanced strategies to protect and preserve your wealth across market cycles.'
                    : 'مارکیٹ کے اتار چڑھاؤ میں آپ کی دولت کو تحفظ دینے اور اسے برقرار رکھنے کے لیے جدید حکمت عملیاں۔'
                },
                {
                  icon: <PieChart className="w-8 h-8 text-yellow-600" />,
                  title: currentLanguage === 'en' ? 'Asset Allocation' : 'اثاثوں کی مختص کرنا',
                  description: currentLanguage === 'en'
                    ? 'Strategic asset allocation across multiple asset classes for optimal returns.'
                    : 'بہترین منافع کے لیے متعدد اثاثوں کی اقسام میں اسٹریٹجک اثاثہ مختص کرنا۔'
                },
                {
                  icon: <DollarSign className="w-8 h-8 text-red-600" />,
                  title: currentLanguage === 'en' ? 'Tax Optimization' : 'ٹیکس کی بہتر کاری',
                  description: currentLanguage === 'en'
                    ? 'Tax-efficient investment strategies to maximize your after-tax returns.'
                    : 'آپ کی ٹیکس کے بعد کی واپسی کو زیادہ سے زیادہ کرنے کے لیے ٹیکس موثر سرمایہ کاری کی حکمت عملیاں۔'
                },
                {
                  icon: <Globe className="w-8 h-8 text-indigo-600" />,
                  title: currentLanguage === 'en' ? 'Global Opportunities' : 'عالمی مواقع',
                  description: currentLanguage === 'en'
                    ? 'Access to international markets and exclusive investment opportunities.'
                    : 'بین الاقوامی مارکیٹوں اور خصوصی سرمایہ کاری کے مواقع تک رسائی۔'
                }
              ].map((service, index) => (
                <motion.div
                  key={index}
                  className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow duration-300"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                >
                  <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center mb-4">
                    {service.icon}
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">{service.title}</h3>
                  <p className="text-gray-600">{service.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
        
        {/* CTA Section */}
        <section className="py-20 bg-gradient-to-br from-blue-900 via-blue-800 to-purple-900 text-white">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl lg:text-4xl font-bold mb-6">
              {currentLanguage === 'en' 
                ? 'Ready for Elite Wealth Management?' 
                : 'اعلیٰ معیار کی دولت مینجمنٹ کے لیے تیار ہیں؟'}
            </h2>
            <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
              {currentLanguage === 'en'
                ? 'Join Pakistan\'s most successful investors who trust InvestPro with their wealth management needs.'
                : 'پاکستان کے سب سے کامیاب سرمایہ کاروں میں شامل ہوں جو اپنی دولت مینجمنٹ کی ضروریات کے لیے انویسٹ پرو پر بھروسہ کرتے ہیں۔'}
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <Button 
                size="lg" 
                className="text-lg px-8 bg-yellow-500 hover:bg-yellow-600 text-black"
                onClick={() => onNavigate && onNavigate('contact')}
              >
                {currentLanguage === 'en' ? 'Schedule Private Consultation' : 'پرائیویٹ مشاورت شیڈول کریں'}
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="text-lg px-8 border-white text-white hover:bg-white hover:text-blue-900"
              >
                <Phone className="w-5 h-5 mr-2" />
                {texts[currentLanguage].callWealth}
              </Button>
            </div>
            
            <p className="text-white/80 text-sm">
              {currentLanguage === 'en'
                ? 'PKR 25M minimum • Confidential consultations • No obligation'
                : 'کم از کم 2.5 کروڑ روپے • خفیہ مشاورتیں • کوئی پابندی نہیں'
              }
            </p>
          </div>
        </section>
      </div>
    </PageTransition>
  );
};

export default PrivateWealthPage;
