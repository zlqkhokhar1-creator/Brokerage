import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { AppDownloadButtons } from '../components/ui/AppDownloadButtons';
import { MotionWrapper, StaggerWrapper, Floating } from '../components/animations/MotionWrapper';
import { CountUp } from '../components/animations/CountUp';
import { EnhancedCard, MagneticButton } from '../components/ui/EnhancedCard';
import { EnhancedArrow, CTAButton } from '../components/ui/EnhancedArrow';
import { AIAnalyticsDemo } from '../components/interactive/AIAnalyticsDemo';
import { InvestmentGuide } from '../components/educational/InvestmentGuide';
import { RiskAssessment } from '../components/interactive/RiskAssessment';
import { FAQSection } from '../components/sections/FAQSection';
import { 
  TrendingUp, 
  Shield, 
  Smartphone, 
  Brain, 
  PieChart, 
  Users,
  Star,
  ArrowRight,
  CheckCircle,
  BarChart3,
  Zap,
  Award,
  Globe,
  Target,
  Clock
} from 'lucide-react';

export const HomePage: React.FC = () => {
  const features = [
    {
      icon: Brain,
      title: 'AI-Powered Analytics',
      description: 'Advanced artificial intelligence analyzes market trends and provides personalized investment insights tailored to your financial goals.',
      link: '/trade/stocks-etfs'
    },
    {
      icon: PieChart,
      title: 'Robo-Advisor',
      description: 'Automated portfolio management that optimizes your investments 24/7 using sophisticated algorithms and risk assessment.',
      link: '/invest/robo-advisor'
    },
    {
      icon: Smartphone,
      title: 'Mobile-First Experience',
      description: 'Trade on-the-go with our intuitive mobile app designed specifically for Pakistani investors. Simple, secure, and lightning-fast.',
      link: '/pricing'
    },
    {
      icon: Shield,
      title: 'Bank-Grade Security',
      description: 'Your investments are protected with military-grade encryption, SECP compliance, and comprehensive insurance coverage.',
      link: '/pricing'
    }
  ];

  const stats = [
    { number: 50000, label: 'Active Investors', prefix: '', suffix: '+' },
    { number: 2.5, label: 'Assets Under Management', prefix: 'PKR ', suffix: 'B+', decimals: 1 },
    { number: 15, label: 'Average Annual Returns', prefix: '', suffix: '%' },
    { number: 99.9, label: 'Platform Uptime', prefix: '', suffix: '%', decimals: 1 }
  ];

  const globalReach = [
    { icon: Globe, title: 'International Markets', description: 'Access to global ETFs and international funds' },
    { icon: Target, title: 'Precision Trading', description: 'AI-powered trade execution in under 100ms' },
    { icon: Clock, title: '24/7 Monitoring', description: 'Round-the-clock portfolio optimization' },
    { icon: Shield, title: 'Bank-Grade Security', description: 'Military-grade encryption and investor protection' }
  ];

  const testimonials = [
    {
      name: 'Ahmed Hassan',
      role: 'Software Engineer, Karachi',
      content: 'InvestPro’s AI recommendations helped me grow my portfolio by 22% in just 8 months. The robo-advisor is incredibly smart!',
      rating: 5
    },
    {
      name: 'Fatima Khan',
      role: 'Business Owner, Lahore',
      content: 'Finally, a Pakistani platform that makes investing simple. The educational content helped me understand mutual funds completely.',
      rating: 5
    },
    {
      name: 'Ali Raza',
      role: 'Doctor, Islamabad',
      content: 'Zero hidden fees and transparent pricing. InvestPro has revolutionized how I invest for my retirement.',
      rating: 5
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
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-gradient-primary text-white py-20 lg:py-32 overflow-hidden">
        <div className="absolute inset-0 opacity-30">
          <div className="w-full h-full bg-repeat" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Cpolygon points='30,0 60,30 30,60 0,30'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
          }}></div>
        </div>
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <MotionWrapper>
              <div className="max-w-2xl">
                <MotionWrapper delay={0.2}>
                  <div className="inline-flex items-center bg-secondary/20 text-secondary px-4 py-2 rounded-full text-sm font-medium mb-6">
                    <Award className="w-4 h-4 mr-2" />
                    Pakistan's First AI-Driven Digital Brokerage
                  </div>
                </MotionWrapper>
                
                <MotionWrapper delay={0.4}>
                  <h1 className="text-4xl lg:text-6xl font-heading font-bold mb-6 leading-tight">
                    Invest Smarter with
                    <span className="text-secondary"> AI Technology</span>
                  </h1>
                </MotionWrapper>
                
                <MotionWrapper delay={0.6}>
                  <p className="text-xl text-white/90 mb-8 leading-relaxed">
                    Join thousands of Pakistani investors who trust InvestPro's advanced AI algorithms to maximize their returns. Start with as little as PKR 1,000.
                  </p>
                </MotionWrapper>
                
                <MotionWrapper delay={0.8}>
                  <div className="flex flex-col sm:flex-row gap-4 mb-8">
                    <CTAButton 
                      variant="primary" 
                      size="lg"
                      className="bg-secondary text-white hover:bg-accent"
                    >
                      Start Investing Today
                    </CTAButton>
                    <MagneticButton 
                      variant="glow" 
                      size="lg" 
                      className="border border-white text-white hover:bg-white hover:text-primary transition-colors"
                    >
                      <span className="flex items-center">
                        Watch Demo
                        <EnhancedArrow 
                          variant="pulse" 
                          size="sm" 
                          className="ml-2" 
                        />
                      </span>
                    </MagneticButton>
                  </div>
                </MotionWrapper>
                
                <MotionWrapper delay={0.9}>
                  <div className="mb-8">
                    <div className="text-white/70 text-sm mb-3 font-medium">Get the InvestPro App</div>
                    <AppDownloadButtons 
                      variant="horizontal" 
                      theme="dark" 
                      showComingSoon={true}
                      className="justify-start"
                    />
                  </div>
                </MotionWrapper>
                
                <MotionWrapper delay={1.0}>
                  <div className="text-white/80 text-sm">
                    <StaggerWrapper className="flex items-center space-x-4">
                      <div className="flex items-center">
                        <CheckCircle className="w-4 h-4 mr-2 text-secondary" />
                        SECP Licensed
                      </div>
                      <div className="flex items-center">
                        <CheckCircle className="w-4 h-4 mr-2 text-secondary" />
                        PSX Member
                      </div>
                      <div className="flex items-center">
                        <CheckCircle className="w-4 h-4 mr-2 text-secondary" />
                        Investor Protection
                      </div>
                    </StaggerWrapper>
                  </div>
                </MotionWrapper>
              </div>
            </MotionWrapper>
            
            <MotionWrapper delay={1.2} direction="left">
              <div className="relative">
                <Floating intensity={8} speed={4}>
                  <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
                    <div className="mb-6">
                      <h3 className="text-xl font-semibold mb-4">Live Portfolio Performance</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <MotionWrapper delay={1.4}>
                          <div className="bg-white/10 rounded-lg p-4">
                            <div className="text-secondary text-2xl font-bold">
                              +<CountUp end={18.5} decimals={1} suffix="%" duration={2} />
                            </div>
                            <div className="text-white/80 text-sm">YTD Returns</div>
                          </div>
                        </MotionWrapper>
                        <MotionWrapper delay={1.6}>
                          <div className="bg-white/10 rounded-lg p-4">
                            <div className="text-secondary text-2xl font-bold">
                              PKR <CountUp end={2.4} decimals={1} suffix="M" duration={2} />
                            </div>
                            <div className="text-white/80 text-sm">Portfolio Value</div>
                          </div>
                        </MotionWrapper>
                      </div>
                    </div>
                    
                    <StaggerWrapper staggerDelay={0.1} className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-white/90">TRG Company</span>
                        <span className="text-secondary">+12.4%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-white/90">HBL Stock</span>
                        <span className="text-secondary">+8.7%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-white/90">UBL Fund</span>
                        <span className="text-secondary">+15.2%</span>
                      </div>
                    </StaggerWrapper>
                    
                    {/* Floating Elements */}
                    <div className="absolute -top-4 -right-4 w-8 h-8 bg-secondary/20 rounded-full animate-pulse"></div>
                    <div className="absolute -bottom-2 -left-2 w-4 h-4 bg-accent/30 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
                  </div>
                </Floating>
              </div>
            </MotionWrapper>
          </div>
        </div>
      </section>

      {/* Trust Indicators */}
      <section className="py-12 bg-background-alt">
        <div className="container mx-auto px-4">
          <StaggerWrapper className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
            {stats.map((stat, index) => (
              <MotionWrapper key={index} delay={index * 0.1}>
                <div className="space-y-2">
                  <div className="text-3xl lg:text-4xl font-heading font-bold text-primary">
                    <CountUp 
                      end={stat.number} 
                      prefix={stat.prefix} 
                      suffix={stat.suffix}
                      decimals={stat.decimals || 0}
                      duration={2.5}
                    />
                  </div>
                  <div className="text-muted text-sm lg:text-base">
                    {stat.label}
                  </div>
                </div>
              </MotionWrapper>
            ))}
          </StaggerWrapper>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-heading font-bold text-primary mb-4">
              Why Choose InvestPro?
            </h2>
            <p className="text-xl text-muted max-w-3xl mx-auto">
              Experience the future of investing with cutting-edge technology designed specifically for Pakistani investors.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => {
              const IconComponent = feature.icon;
              return (
                <Card key={index} hover className="text-center group">
                  <CardHeader>
                    <div className="w-16 h-16 bg-secondary/10 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:bg-secondary group-hover:scale-110 transition-all duration-300">
                      <IconComponent className="w-8 h-8 text-secondary group-hover:text-white" />
                    </div>
                    <CardTitle className="text-lg">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted leading-relaxed mb-4">
                      {feature.description}
                    </p>
                    <Link 
                      to={feature.link}
                      className="inline-flex items-center text-secondary hover:text-accent transition-colors font-medium"
                    >
                      Learn More
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </Link>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-background-alt">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl lg:text-4xl font-heading font-bold text-primary mb-6">
                Built for Pakistani Investors
              </h2>
              <p className="text-xl text-muted mb-8">
                InvestPro understands the unique needs of Pakistani investors. From Shariah-compliant options to local market expertise, we've got you covered.
              </p>
              
              <div className="grid gap-4 mb-8">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-secondary mr-3 flex-shrink-0" />
                    <span className="text-foreground">{benefit}</span>
                  </div>
                ))}
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/pricing">
                  <Button size="lg">View Pricing</Button>
                </Link>
                <Link to="/discover/blog">
                  <Button size="lg" variant="outline">Learn More</Button>
                </Link>
              </div>
            </div>
            
            <div className="relative">
              <div className="grid grid-cols-2 gap-4">
                <Card className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <TrendingUp className="w-8 h-8 text-secondary" />
                    <span className="text-2xl font-bold text-secondary">+24%</span>
                  </div>
                  <p className="text-sm text-muted">Average Portfolio Growth</p>
                </Card>
                
                <Card className="p-6 mt-8">
                  <div className="flex items-center justify-between mb-4">
                    <BarChart3 className="w-8 h-8 text-secondary" />
                    <span className="text-2xl font-bold text-secondary">1M+</span>
                  </div>
                  <p className="text-sm text-muted">Trades Executed</p>
                </Card>
                
                <Card className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <Zap className="w-8 h-8 text-secondary" />
                    <span className="text-2xl font-bold text-secondary">&lt;1s</span>
                  </div>
                  <p className="text-sm text-muted">Trade Execution Time</p>
                </Card>
                
                <Card className="p-6 mt-8">
                  <div className="flex items-center justify-between mb-4">
                    <Users className="w-8 h-8 text-secondary" />
                    <span className="text-2xl font-bold text-secondary">98%</span>
                  </div>
                  <p className="text-sm text-muted">Customer Satisfaction</p>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-heading font-bold text-primary mb-4">
              What Our Investors Say
            </h2>
            <p className="text-xl text-muted max-w-2xl mx-auto">
              Join thousands of satisfied Pakistani investors who trust InvestPro with their financial future.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="p-6 text-center">
                <div className="flex justify-center mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-muted mb-6 italic leading-relaxed">
                  "{testimonial.content}"
                </p>
                <div>
                  <div className="font-semibold text-foreground">{testimonial.name}</div>
                  <div className="text-sm text-muted">{testimonial.role}</div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-primary text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl lg:text-4xl font-heading font-bold mb-6">
            Ready to Start Your Investment Journey?
          </h2>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            Open your account in minutes and start building wealth with Pakistan's most advanced investment platform.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <Button size="lg" variant="secondary" className="text-lg px-8">
              Open Free Account
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button size="lg" variant="outline" className="text-lg px-8 border-white text-white hover:bg-white hover:text-primary">
              Schedule Demo
            </Button>
          </div>
          
          <p className="text-white/80 text-sm">
            No minimum balance • Start with PKR 1,000 • Cancel anytime
          </p>
        </div>
      </section>
    </div>
  );
};