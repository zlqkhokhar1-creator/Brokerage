'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  ArrowRight, CheckCircle, Menu, X, Play, Award, Smartphone, Clock, 
  ChevronDown, Phone, Mail, MapPin, Check, ChevronRight, Eye, RefreshCw,
  TrendingUp, Shield, Users, Star, Globe, BarChart3, PieChart, DollarSign, 
  Target, Zap, Brain
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { EnhancedCard } from "./ui/EnhancedCard";
import AIAnalyticsDemo from "./AIAnalyticsDemo";
import { EnhancedArrow, CTAButton } from './ui/EnhancedArrow';
import { AppDownloadButtons } from './ui/AppDownloadButtons';
import { MagneticButton } from './ui/MagneticButton';
import { Badge } from '@/components/ui/badge';

// Animation wrapper components with TypeScript types
interface MotionWrapperProps {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  direction?: 'up' | 'down' | 'left' | 'right';
}

const MotionWrapper: React.FC<MotionWrapperProps> = ({ 
  children, 
  delay = 0, 
  className = '',
  direction = 'up'
}) => {
  const directionMap = {
    up: { y: 20 },
    down: { y: -20 },
    left: { x: 20 },
    right: { x: -20 }
  };

  return (
    <motion.div
      initial={{ opacity: 0, ...(directionMap[direction] || { y: 20 }) }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

interface StaggerWrapperProps {
  children: React.ReactNode;
  className?: string;
  staggerDelay?: number;
}

const StaggerWrapper: React.FC<StaggerWrapperProps> = ({ 
  children, 
  className = '',
  staggerDelay = 0.1 
}) => (
  <motion.div
    initial="hidden"
    animate="show"
    variants={{
      hidden: { opacity: 0 },
      show: {
        opacity: 1,
        transition: {
          staggerChildren: staggerDelay
        }
      }
    }}
    className={className}
  >
    {children}
  </motion.div>
);

interface PageTransitionProps {
  children: React.ReactNode;
}

const PageTransition: React.FC<PageTransitionProps> = ({ children }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.3 }}
  >
    {children}
  </motion.div>
);

interface InvestProLandingPageProps {
  onNavigate: (page: string) => void;
}

export default function InvestProLandingPage({ onNavigate }: InvestProLandingPageProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const stats = [
    { value: 50000, label: 'Active Investors', suffix: '+' },
    { value: 2.5, label: 'Billion PKR Invested', suffix: 'B+' },
    { value: 15, label: 'Average Annual Return', suffix: '%' },
    { value: 99.9, label: 'Platform Uptime', suffix: '%' }
  ];

  const features = [
    {
      icon: <TrendingUp className="w-6 h-6" />,
      title: 'Smart Portfolio Management',
      description: 'AI-powered investment strategies tailored to Pakistani market conditions and your risk profile.'
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: 'SECP Regulated & Secure',
      description: 'Fully licensed by SECP with bank-grade security and investor protection guarantees.'
    },
    {
      icon: <Users className="w-6 h-6" />,
      title: 'Expert Pakistani Advisors',
      description: 'Local market expertise with dedicated support in Urdu and English languages.'
    },
    {
      icon: <BarChart3 className="w-6 h-6" />,
      title: 'Real-time Market Data',
      description: 'Live PSX data, advanced charts, and comprehensive market analysis tools.'
    },
    {
      icon: <PieChart className="w-6 h-6" />,
      title: 'Diversified Investment Options',
      description: 'Stocks, mutual funds, bonds, and Shariah-compliant investment opportunities.'
    },
    {
      icon: <Smartphone className="w-6 h-6" />,
      title: 'Mobile-First Trading',
      description: 'Trade on-the-go with our award-winning mobile app designed for Pakistani investors.'
    }
  ];

  const testimonials = [
    {
      name: 'Ahmed Hassan',
      role: 'Software Engineer, Karachi',
      content: 'InvestPro helped me start investing with just PKR 5,000. Now I have a diversified portfolio worth over PKR 2 lakhs!',
      rating: 5
    },
    {
      name: 'Fatima Khan',
      role: 'Teacher, Lahore',
      content: 'The Shariah-compliant options and expert guidance made investing accessible for me as a beginner.',
      rating: 5
    },
    {
      name: 'Muhammad Ali',
      role: 'Business Owner, Islamabad',
      content: 'Excellent platform with real-time PSX data. The mobile app is incredibly user-friendly.',
      rating: 5
    }
  ];

  const pricingPlans = [
    {
      name: 'Basic',
      price: 'Free',
      description: 'Perfect for beginners',
      features: ['Free account opening', 'Basic market data', 'Educational resources', 'Mobile app access']
    },
    {
      name: 'Premium',
      price: 'PKR 500/month',
      description: 'For active traders',
      features: ['Everything in Basic', 'Real-time data', 'Advanced charts', 'Priority support', 'Research reports']
    },
    {
      name: 'Professional',
      price: 'PKR 1,500/month',
      description: 'For serious investors',
      features: ['Everything in Premium', 'API access', 'Custom alerts', 'Portfolio analytics', 'Dedicated advisor']
    }
  ];

  const benefits = [
    'Zero account opening fees',
    'Real-time market data',
    'Expert Pakistani market insights',
    'Shariah-compliant investment options',
    '24/7 customer support in Urdu/English',
    'Advanced risk management tools'
  ];

  return (
    <PageTransition>
      <div className="min-h-screen bg-background">
        {/* Navigation */}
        <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border shadow-sm">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between h-16">
              {/* Logo */}
              <Link href="/" className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary/70 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">IP</span>
                </div>
                <span className="text-2xl font-bold text-primary">InvestPro</span>
              </Link>

              {/* Desktop Navigation */}
              <nav className="hidden md:flex items-center space-x-8">
                <Button variant="ghost" onClick={() => onNavigate('stocks')}>Trade</Button>
                <Button variant="ghost" onClick={() => onNavigate('robo-advisor')}>Invest</Button>
                <Button variant="ghost" onClick={() => onNavigate('pricing')}>Pricing</Button>
                <Button variant="ghost" onClick={() => onNavigate('blog')}>Learn</Button>
                <div className="flex items-center space-x-2">
                  <Button variant="ghost" onClick={() => onNavigate('login')}>Log In</Button>
                  <Button onClick={() => onNavigate('signup')}>Get Started</Button>
                </div>
              </nav>

              {/* Mobile Menu Button */}
              <button
                className="md:hidden p-2"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
              >
                {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>

            {/* Mobile Navigation */}
            {isMenuOpen && (
              <nav className="md:hidden py-4 border-t border-border">
                <div className="flex flex-col space-y-2">
                  <Button variant="ghost" size="sm" className="w-full justify-start" onClick={() => onNavigate('stocks')}>Trade</Button>
                  <Button variant="ghost" size="sm" className="w-full justify-start" onClick={() => onNavigate('robo-advisor')}>Invest</Button>
                  <Button variant="ghost" size="sm" className="w-full justify-start" onClick={() => onNavigate('pricing')}>Pricing</Button>
                  <Button variant="ghost" size="sm" className="w-full justify-start" onClick={() => onNavigate('blog')}>Learn</Button>
                  <Button variant="ghost" size="sm" className="w-full" onClick={() => onNavigate('login')}>Log In</Button>
                  <Button variant="default" size="sm" className="w-full" onClick={() => onNavigate('signup')}>Sign Up</Button>
                </div>
              </nav>
            )}
          </div>
        </header>

        {/* Hero Section */}
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-primary via-primary/90 to-secondary">
          {/* Background Elements */}
          <div className="absolute inset-0 bg-grid-white/[0.02] bg-grid" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
          
          <div className="container mx-auto px-4 py-20 text-white relative z-10">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="max-w-2xl mx-auto lg:mx-0">
                <MotionWrapper>
                  <div className="inline-flex items-center bg-white/10 text-white px-4 py-2 rounded-full text-sm font-medium mb-6">
                    <Award className="w-4 h-4 mr-2" />
                    Pakistan's First AI-Driven Digital Brokerage
                  </div>
                </MotionWrapper>
                
                <MotionWrapper delay={0.2}>
                  <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
                    Invest Smarter with
                    <span className="block bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
                      AI Technology
                    </span>
                  </h1>
                </MotionWrapper>
                
                <MotionWrapper delay={0.4}>
                  <p className="text-xl text-white/90 mb-8 leading-relaxed">
                    Join thousands of Pakistani investors who trust InvestPro's advanced AI algorithms to maximize their returns. Start with as little as PKR 1,000.
                  </p>
                </MotionWrapper>
                
                <MotionWrapper delay={0.6}>
                  <div className="flex flex-col sm:flex-row gap-4 mb-8">
                    <Button
                      onClick={() => onNavigate('signup')}
                      size="lg"
                      className="group flex items-center gap-2 px-6 py-3 text-base font-medium text-white bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 transition-all duration-300 rounded-full shadow-lg hover:shadow-xl"
                    >
                      Get Started
                      <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                    </Button>
                    <Button
                      variant="outline"
                      size="lg"
                      className="flex items-center gap-2 px-6 py-3 text-base font-medium transition-all duration-300 bg-white/10 backdrop-blur-sm border-white/20 hover:bg-white/20"
                    >
                      <Play className="w-4 h-4" />
                      Watch Demo
                    </Button>
                  </div>
                </MotionWrapper>

                <MotionWrapper delay={0.8}>
                  <div className="mb-8">
                    <div className="text-white/70 text-sm mb-3 font-medium">Get the InvestPro App</div>
                    <AppDownloadButtons 
                      variant="horizontal" 
                      theme="dark"
                      className="justify-start"
                    />
                  </div>
                </MotionWrapper>

                <MotionWrapper delay={1.0}>
                  <div className="flex items-center justify-start space-x-6 text-sm">
                    <div className="flex items-center">
                      <CheckCircle className="w-4 h-4 mr-2 text-yellow-400" />
                      SECP Licensed
                    </div>
                    <div className="flex items-center">
                      <CheckCircle className="w-4 h-4 mr-2 text-yellow-400" />
                      PSX Member
                    </div>
                    <div className="flex items-center">
                      <CheckCircle className="w-4 h-4 mr-2 text-yellow-400" />
                      Investor Protection
                    </div>
                  </div>
                </MotionWrapper>
              </div>

              {/* Live Portfolio Performance Widget */}
              <MotionWrapper delay={1.2} direction="left">
                <div className="relative">
                  <motion.div 
                    className="absolute -top-4 -right-4 w-20 h-20 bg-white/10 rounded-full"
                    animate={{
                      rotate: 360,
                      transition: {
                        duration: 20,
                        repeat: Infinity,
                        ease: 'linear'
                      }
                    }}
                  >
                    <div></div>
                  </motion.div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
                    <div className="mb-6">
                      <h3 className="text-xl font-semibold mb-4 text-white">Live Portfolio Performance</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <MotionWrapper delay={1.4}>
                          <div className="bg-white/10 rounded-lg p-4">
                            <div className="text-yellow-400 text-2xl font-bold">
                              +18.5%
                            </div>
                            <div className="text-white/80 text-sm">YTD Returns</div>
                          </div>
                        </MotionWrapper>
                        <MotionWrapper delay={1.6}>
                          <div className="bg-white/10 rounded-lg p-4">
                            <div className="text-yellow-400 text-2xl font-bold">
                              PKR 2.4M
                            </div>
                            <div className="text-white/80 text-sm">Portfolio Value</div>
                          </div>
                        </MotionWrapper>
                      </div>
                    </div>
                    
                    <StaggerWrapper staggerDelay={0.1} className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-white/90">TRG Company</span>
                        <span className="text-yellow-400">+12.4%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-white/90">HBL Stock</span>
                        <span className="text-yellow-400">+8.7%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-white/90">UBL Fund</span>
                        <span className="text-yellow-400">+15.2%</span>
                      </div>
                    </StaggerWrapper>
                    
                    {/* Floating Elements */}
                    <motion.div 
                      className="absolute -top-4 -right-4 w-8 h-8 bg-yellow-400/20 rounded-full"
                      animate={{
                        rotate: 360,
                        transition: {
                          duration: 20,
                          repeat: Infinity,
                          ease: 'linear'
                        }
                      }}
                    >
                      <div></div>
                    </motion.div>
                    <motion.div 
                      className="absolute -bottom-2 -left-2 w-4 h-4 bg-yellow-400/30 rounded-full"
                      animate={{
                        rotate: 360,
                        transition: {
                          duration: 20,
                          repeat: Infinity,
                          ease: 'linear',
                          delay: 0.5
                        }
                      }}
                    >
                      <div></div>
                    </motion.div>
                  </div>
                </div>
              </MotionWrapper>
            </div>
          </div>

          {/* Floating Elements */}
          <motion.div 
            className="absolute -bottom-4 -right-4 w-20 h-20 bg-white/10 rounded-full"
            animate={{
              rotate: 360,
              transition: {
                duration: 20,
                repeat: Infinity,
                ease: 'linear'
              }
            }}
          >
            <div></div>
          </motion.div>
          <motion.div 
            className="absolute top-40 right-20 w-16 h-16 bg-white/5 rounded-full"
            animate={{
              rotate: 360,
              transition: {
                duration: 20,
                repeat: Infinity,
                ease: 'linear'
              }
            }}
          >
            <div></div>
          </motion.div>
          <motion.div 
            className="absolute bottom-40 left-20 w-12 h-12 bg-white/10 rounded-full"
            animate={{
              rotate: 360,
              transition: {
                duration: 20,
                repeat: Infinity,
                ease: 'linear'
              }
            }}
          >
            <div></div>
          </motion.div>
        </section>

        {/* Global Reach Section */}
        <section className="py-20 bg-background">
          <div className="container mx-auto px-4">
            <MotionWrapper>
              <div className="text-center mb-16">
                <h2 className="text-3xl md:text-4xl font-bold mb-4">Global Markets at Your Fingertips</h2>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                  Access international markets with competitive rates and local expertise in the Pakistani financial landscape.
                </p>
              </div>
            </MotionWrapper>

            <StaggerWrapper className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {[
                {
                  icon: <Globe className="w-8 h-8 text-primary" />,
                  title: 'International Markets',
                  description: 'Access to global ETFs and international funds with local support'
                },
                {
                  icon: <Target className="w-8 h-8 text-primary" />,
                  title: 'Precision Trading',
                  description: 'AI-powered trade execution with millisecond precision'
                },
                {
                  icon: <Clock className="w-8 h-8 text-primary" />,
                  title: '24/7 Monitoring',
                  description: 'Round-the-clock portfolio optimization and alerts'
                },
                {
                  icon: <Shield className="w-8 h-8 text-primary" />,
                  title: 'Bank-Grade Security',
                  description: 'Military-grade encryption and investor protection'
                }
              ].map((item, index) => (
                <MotionWrapper key={index} delay={index * 0.1}>
                  <EnhancedCard className="h-full hover:border-primary/50 transition-colors">
                    <CardHeader className="pb-2">
                      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                        {item.icon}
                      </div>
                      <CardTitle className="text-xl">{item.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground">{item.description}</p>
                    </CardContent>
                  </EnhancedCard>
                </MotionWrapper>
              ))}
            </StaggerWrapper>

            <MotionWrapper delay={0.3}>
              <div className="mt-16 bg-muted/30 rounded-2xl p-8 md:p-12 relative overflow-hidden">
                <motion.div 
                  className="absolute -right-10 -top-10 w-40 h-40 bg-primary/5 rounded-full"
                  animate={{
                    rotate: 360,
                    transition: {
                      duration: 20,
                      repeat: Infinity,
                      ease: 'linear'
                    }
                  }}
                >
                  <div></div>
                </motion.div>
                <motion.div 
                  className="absolute -left-10 -bottom-10 w-60 h-60 bg-primary/5 rounded-full"
                  animate={{
                    rotate: 360,
                    transition: {
                      duration: 20,
                      repeat: Infinity,
                      ease: 'linear'
                    }
                  }}
                >
                  <div></div>
                </motion.div>
                
                <div className="relative z-10 grid md:grid-cols-2 gap-8 items-center">
                  <div>
                    <h3 className="text-2xl md:text-3xl font-bold mb-4">Pakistan's Gateway to Global Markets</h3>
                    <p className="text-muted-foreground mb-6">
                      Invest in international markets with local expertise. Our platform provides seamless access to global assets with PKR-based accounts and local support.
                    </p>
                    <ul className="space-y-3 mb-8">
                      {[
                        'Direct access to US, UK, and Asian markets',
                        'Competitive forex rates with no hidden fees',
                        'Local support in Urdu and English',
                        'Shariah-compliant international investment options'
                      ].map((item, index) => (
                        <li key={index} className="flex items-start">
                          <CheckCircle className="w-5 h-5 text-primary mt-0.5 mr-3 flex-shrink-0" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="flex flex-wrap gap-4">
                      <Button onClick={() => onNavigate('signup')} className="bg-primary hover:bg-primary/90">
                        Explore Global Markets
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                      <Button variant="outline" onClick={() => onNavigate('pricing')}>
                        View Pricing
                      </Button>
                    </div>
                  </div>
                  
                  <div className="relative h-full min-h-[300px] bg-muted/50 rounded-xl overflow-hidden flex items-center justify-center">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-primary/10"></div>
                    <div className="relative z-10 p-8 text-center">
                      <Globe className="w-16 h-16 mx-auto text-primary mb-4" />
                      <h4 className="text-xl font-semibold mb-2">Global Market Access</h4>
                      <p className="text-muted-foreground text-sm">
                        Trade international assets with the same ease as local markets
                      </p>
                    </div>
                    
                    {/* Animated market indicators */}
                    <motion.div 
                      className="absolute top-1/4 left-1/4 w-2 h-2 rounded-full bg-green-400 animate-ping"
                      animate={{
                        rotate: 360,
                        transition: {
                          duration: 20,
                          repeat: Infinity,
                          ease: 'linear'
                        }
                      }}
                    >
                      <div></div>
                    </motion.div>
                    <motion.div 
                      className="absolute top-1/3 right-1/4 w-3 h-3 rounded-full bg-blue-400 animate-ping"
                      animate={{
                        rotate: 360,
                        transition: {
                          duration: 20,
                          repeat: Infinity,
                          ease: 'linear',
                          delay: 0.3
                        }
                      }}
                    >
                      <div></div>
                    </motion.div>
                    <motion.div 
                      className="absolute bottom-1/4 left-1/3 w-2 h-2 rounded-full bg-yellow-400 animate-ping"
                      animate={{
                        rotate: 360,
                        transition: {
                          duration: 20,
                          repeat: Infinity,
                          ease: 'linear',
                          delay: 0.6
                        }
                      }}
                    >
                      <div></div>
                    </motion.div>
                    <motion.div 
                      className="absolute bottom-1/3 right-1/3 w-3 h-3 rounded-full bg-purple-400 animate-ping"
                      animate={{
                        rotate: 360,
                        transition: {
                          duration: 20,
                          repeat: Infinity,
                          ease: 'linear',
                          delay: 0.9
                        }
                      }}
                    >
                      <div></div>
                    </motion.div>
                  </div>
                </div>
              </div>
            </MotionWrapper>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-20 bg-background">
          <div className="container mx-auto px-4">
            <MotionWrapper>
              <div className="text-center mb-16">
                <h2 className="text-3xl md:text-4xl font-bold mb-4">Trusted by Pakistani Investors</h2>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                  Join the growing community of successful investors who trust InvestPro for their financial future.
                </p>
              </div>
            </MotionWrapper>

            <StaggerWrapper>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                {stats.map((stat, index) => (
                  <MotionWrapper key={index} delay={index * 0.1}>
                    <div className="text-center">
                      <div className="text-3xl md:text-4xl font-bold text-primary mb-2">
                        <span className="text-4xl font-bold text-primary">
                          {stat.value.toLocaleString()}{stat.suffix}
                        </span>
                      </div>
                      <p className="text-muted-foreground">{stat.label}</p>
                    </div>
                  </MotionWrapper>
                ))}
              </div>
            </StaggerWrapper>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="py-20 bg-muted/50">
          <div className="container mx-auto px-4">
            <MotionWrapper>
              <div className="text-center mb-16">
                <h2 className="text-3xl md:text-4xl font-bold mb-4">Built for Pakistani Investors</h2>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                  Experience the future of investing with our platform designed specifically for the Pakistani market.
                </p>
              </div>
            </MotionWrapper>

            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <MotionWrapper delay={0.2}>
                  <h3 className="text-2xl md:text-3xl font-bold mb-6">Why Investors Choose Us</h3>
                  <p className="text-muted-foreground mb-8">
                    InvestPro combines cutting-edge technology with deep local market expertise to deliver superior investment solutions for Pakistani investors.
                  </p>
                </MotionWrapper>

                <StaggerWrapper className="space-y-6">
                  {[
                    {
                      icon: <Shield className="w-6 h-6 text-primary" />,
                      title: 'SECP Regulated',
                      description: 'Fully licensed and regulated by the Securities and Exchange Commission of Pakistan'
                    },
                    {
                      icon: <TrendingUp className="w-6 h-6 text-primary" />,
                      title: 'AI-Powered Insights',
                      description: 'Advanced algorithms analyze market trends and provide personalized recommendations'
                    },
                    {
                      icon: <Users className="w-6 h-6 text-primary" />,
                      title: 'Local Expertise',
                      description: 'Dedicated support team with deep understanding of Pakistani markets'
                    },
                    {
                      icon: <Zap className="w-6 h-6 text-primary" />,
                      title: 'Lightning Fast Execution',
                      description: 'Trade execution in milliseconds with our high-performance infrastructure'
                    }
                  ].map((item, index) => (
                    <MotionWrapper key={index} delay={index * 0.1}>
                      <div className="flex items-start group">
                        <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mr-4 group-hover:bg-primary/20 transition-colors">
                          {item.icon}
                        </div>
                        <div>
                          <h4 className="font-semibold text-lg mb-1">{item.title}</h4>
                          <p className="text-muted-foreground text-sm">{item.description}</p>
                        </div>
                      </div>
                    </MotionWrapper>
                  ))}
                </StaggerWrapper>

                <MotionWrapper delay={0.6} className="mt-8">
                  <Button 
                    onClick={() => onNavigate('signup')}
                    size="lg" 
                    className="bg-primary hover:bg-primary/90"
                  >
                    Start Investing Today
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </MotionWrapper>
              </div>

              <div className="grid grid-cols-2 gap-6
                before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] before:from-primary/5 before:to-transparent before:opacity-50 before:-z-10">
                {[
                  {
                    value: 24,
                    suffix: '%',
                    label: 'Average Annual Return',
                    icon: <TrendingUp className="w-6 h-6" />,
                    color: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                  },
                  {
                    value: 99.9,
                    suffix: '%',
                    label: 'Platform Uptime',
                    icon: <Shield className="w-6 h-6" />,
                    color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                  },
                  {
                    value: 50,
                    suffix: 'K+',
                    label: 'Active Investors',
                    icon: <Users className="w-6 h-6" />,
                    color: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400'
                  },
                  {
                    value: 2.5,
                    prefix: 'PKR ',
                    suffix: 'B+',
                    label: 'Assets Under Management',
                    icon: <DollarSign className="w-6 h-6" />,
                    color: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'
                  }
                ].map((stat, index) => (
                  <MotionWrapper 
                    key={index} 
                    delay={0.1 * index}
                    className="h-full"
                  >
                    <EnhancedCard 
                      className={`h-full hover:shadow-lg transition-shadow ${stat.color.includes('text-') ? stat.color.split(' ')[0] : ''}`}
                      hover={true}
                      tilt={true}
                    >
                      <CardContent className="p-6">
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 ${stat.color}`}>
                          {stat.icon}
                        </div>
                        <div className="text-3xl font-bold mb-2">
                          {stat.prefix || ''}
                          {stat.value.toLocaleString(undefined, {
                            minimumFractionDigits: stat.value % 1 === 0 ? 0 : 1,
                            maximumFractionDigits: stat.value % 1 === 0 ? 0 : 1
                          })}
                          {stat.suffix}
                        </div>
                        <p className="text-sm text-muted-foreground">{stat.label}</p>
                      </CardContent>
                    </EnhancedCard>
                  </MotionWrapper>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* AI Analytics Demo Section */}
        <AIAnalyticsDemo />

        {/* Testimonials Section */}
        <section className="py-20 bg-background">
          <div className="container mx-auto px-4">
            <MotionWrapper>
              <div className="text-center mb-16">
                <h2 className="text-3xl md:text-4xl font-bold mb-4">What Our Investors Say</h2>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                  Real stories from real Pakistani investors who have transformed their financial future with InvestPro.
                </p>
              </div>
            </MotionWrapper>

            <StaggerWrapper>
              <div className="grid md:grid-cols-3 gap-8">
                {testimonials.map((testimonial, index) => (
                  <MotionWrapper key={index} delay={index * 0.2}>
                    <EnhancedCard>
                      <CardContent className="pt-6">
                        <div className="flex mb-4">
                          {[...Array(testimonial.rating)].map((_, i) => (
                            <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                          ))}
                        </div>
                        <p className="text-muted-foreground mb-4 italic">"{testimonial.content}"</p>
                        <div>
                          <p className="font-semibold">{testimonial.name}</p>
                          <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                        </div>
                      </CardContent>
                    </EnhancedCard>
                  </MotionWrapper>
                ))}
              </div>
            </StaggerWrapper>
          </div>
        </section>

        {/* Pricing Section */}
        <section className="py-20 bg-muted/50">
          <div className="container mx-auto px-4">
            <MotionWrapper>
              <div className="text-center mb-16">
                <h2 className="text-3xl md:text-4xl font-bold mb-4">Simple, Transparent Pricing</h2>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                  Choose the plan that fits your investment journey. Start free and upgrade as you grow.
                </p>
              </div>
            </MotionWrapper>

            <StaggerWrapper>
              <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                {pricingPlans.map((plan, index) => (
                  <MotionWrapper key={index} delay={index * 0.2}>
                    <EnhancedCard className={`relative ${index === 1 ? 'border-primary shadow-lg scale-105' : ''}`}>
                      {index === 1 && (
                        <motion.div 
                          className="absolute -top-10 -right-10 w-24 h-24 text-primary/20"
                          animate={{
                            rotate: 360,
                            transition: {
                              duration: 20,
                              repeat: Infinity,
                              ease: 'linear'
                            }
                          }}
                        >
                          <Globe className="w-full h-full" />
                        </motion.div>
                      )}
                      <CardHeader className="text-center">
                        <CardTitle className="text-2xl">{plan.name}</CardTitle>
                        <div className="text-3xl font-bold text-primary">{plan.price}</div>
                        <CardDescription>{plan.description}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-3 mb-6">
                          {plan.features.map((feature, i) => (
                            <li key={i} className="flex items-center">
                              <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                              <span className="text-sm">{feature}</span>
                            </li>
                          ))}
                        </ul>
                        <CTAButton 
                          className="w-full"
                          variant={index === 1 ? "primary" : "outline"}
                          onClick={() => onNavigate('signup')}
                        >
                          Get Started
                        </CTAButton>
                      </CardContent>
                    </EnhancedCard>
                  </MotionWrapper>
                ))}
              </div>
            </StaggerWrapper>
          </div>
        </section>

        {/* App Download Section */}
        <section className="py-20 bg-background">
          <div className="container mx-auto px-4">
            <MotionWrapper>
              <div className="text-center mb-16">
                <h2 className="text-3xl md:text-4xl font-bold mb-4">Trade Anywhere, Anytime</h2>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                  Download our award-winning mobile app and start investing on the go. Available on iOS and Android.
                </p>
              </div>
            </MotionWrapper>

            <MotionWrapper delay={0.3}>
              <div className="flex justify-center">
                <AppDownloadButtons />
              </div>
            </MotionWrapper>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-gradient-to-r from-primary to-secondary text-white">
          <div className="container mx-auto px-4 text-center">
            <MotionWrapper>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Ready to Start Your Investment Journey?
              </h2>
              <p className="text-xl mb-8 text-white/90 max-w-2xl mx-auto">
                Join thousands of Pakistani investors who are already building wealth with InvestPro. 
                Open your account today and get started with just PKR 1,000.
              </p>
            </MotionWrapper>
            
            <MotionWrapper delay={0.3}>
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
                <MagneticButton 
                  onClick={() => onNavigate('signup')}
                  size="lg" 
                  className="text-lg px-8 bg-white text-primary hover:bg-white/90 hover:text-primary/90"
                >
                  Start Investing Free
                  <EnhancedArrow className="ml-2 h-5 w-5" />
                </MagneticButton>
                <MagneticButton variant="glow" size="lg" onClick={() => onNavigate('signup')}>
                  Learn More
                </MagneticButton>
                <MagneticButton 
                  variant="pulse" 
                  size="lg"
                  className="text-lg px-8 border-white text-white hover:bg-white hover:text-primary"
                >
                  Schedule Demo
                </MagneticButton>
              </div>
            </MotionWrapper>
            
            <MotionWrapper delay={0.5}>
              <p className="text-white/80 text-sm">
                No minimum balance • Start with PKR 1,000 • Cancel anytime
              </p>
            </MotionWrapper>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-background border-t border-border py-12">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-4 gap-8">
              <div>
                <div className="flex items-center space-x-2 mb-4">
                  <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary/70 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-lg">IP</span>
                  </div>
                  <span className="text-xl font-bold text-primary">InvestPro</span>
                </div>
                <p className="text-muted-foreground text-sm">
                  Pakistan's leading investment platform for smart, Shariah-compliant investing.
                </p>
              </div>
              
              <div>
                <h4 className="font-semibold mb-4">Products</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li><Link href="#" className="hover:text-primary">Stocks & ETFs</Link></li>
                  <li><Link href="#" className="hover:text-primary">Mutual Funds</Link></li>
                  <li><Link href="#" className="hover:text-primary">Robo Advisor</Link></li>
                  <li><Link href="#" className="hover:text-primary">Private Wealth</Link></li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold mb-4">Company</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li><Link href="#" className="hover:text-primary">About Us</Link></li>
                  <li><Link href="#" className="hover:text-primary">Careers</Link></li>
                  <li><Link href="#" className="hover:text-primary">Press</Link></li>
                  <li><Link href="#" className="hover:text-primary">Contact</Link></li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold mb-4">Support</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li><Link href="#" className="hover:text-primary">Help Center</Link></li>
                  <li><Link href="#" className="hover:text-primary">Security</Link></li>
                  <li><Link href="#" className="hover:text-primary">Privacy Policy</Link></li>
                  <li><Link href="#" className="hover:text-primary">Terms of Service</Link></li>
                </ul>
              </div>
            </div>
            
            <div className="border-t border-border mt-8 pt-8 text-center text-sm text-muted-foreground">
              <p>&copy; 2024 InvestPro. All rights reserved. Licensed by SECP.</p>
            </div>
          </div>
        </footer>
      </div>
    </PageTransition>
  );
}
