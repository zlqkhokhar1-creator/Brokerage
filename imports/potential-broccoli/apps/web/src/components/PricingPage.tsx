import React from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { 
  CheckCircle, 
  X, 
  Crown, 
  Zap, 
  Users,
  ArrowRight,
  Star,
  DollarSign,
  Clock,
  Shield,
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

interface PricingPageProps {
  onNavigate: (page: string) => void;
}

export function PricingPage({ onNavigate }: PricingPageProps) {
  const pricingPlans = [
    {
      name: 'Starter',
      price: 'Free',
      period: 'Forever',
      description: 'Perfect for beginning investors who want to start their investment journey',
      features: [
        'PKR 0 account opening',
        'Basic market research',
        'Educational content access',
        'Mobile app access',
        'Email support',
        'Limited to 5 trades/month'
      ],
      limitations: [
        'No AI insights',
        'No robo-advisor',
        'Basic charting tools'
      ],
      popular: false,
      color: 'border-border',
      buttonVariant: 'outline' as const
    },
    {
      name: 'Pro',
      price: 'PKR 499',
      period: 'per month',
      description: 'Advanced tools and AI insights for serious investors',
      features: [
        'Unlimited trading',
        'AI-powered market insights',
        'Advanced charting tools',
        'Real-time market data',
        'Priority customer support',
        'Tax optimization tools',
        'Portfolio analytics',
        'Risk management alerts'
      ],
      limitations: [],
      popular: true,
      color: 'border-secondary ring-2 ring-secondary',
      buttonVariant: 'primary' as const
    },
    {
      name: 'Robo-Advisor',
      price: '0.25%',
      period: 'annually',
      description: 'Fully automated portfolio management with AI optimization',
      features: [
        'AI portfolio management',
        'Automatic rebalancing',
        'Tax-loss harvesting',
        'Goal-based investing',
        'Risk assessment',
        'Performance tracking',
        'Dedicated support',
        'Minimum: PKR 10,000'
      ],
      limitations: [],
      popular: false,
      color: 'border-border',
      buttonVariant: 'outline' as const
    },
    {
      name: 'Private Wealth',
      price: 'Custom',
      period: 'pricing',
      description: 'Exclusive wealth management for high-net-worth individuals',
      features: [
        'Dedicated relationship manager',
        'Bespoke investment strategies',
        'Alternative investments',
        'Estate planning services',
        'Tax optimization',
        'Concierge services',
        '24/7 premium support',
        'Minimum: PKR 25M'
      ],
      limitations: [],
      popular: false,
      color: 'border-primary',
      buttonVariant: 'outline' as const
    }
  ];

  const tradingFees = [
    {
      category: 'Equity Trading',
      investpro: '0.10%',
      traditional: '0.50%',
      savings: '80% savings'
    },
    {
      category: 'Mutual Funds',
      investpro: '0%',
      traditional: '2-3%',
      savings: '100% savings'
    },
    {
      category: 'Account Opening',
      investpro: 'Free',
      traditional: 'PKR 2,000',
      savings: 'PKR 2,000'
    },
    {
      category: 'Account Maintenance',
      investpro: 'Free',
      traditional: 'PKR 500/month',
      savings: 'PKR 6,000/year'
    }
  ];

  const additionalServices = [
    {
      service: 'AI Market Insights',
      starter: false,
      pro: true,
      robo: true,
      wealth: true
    },
    {
      service: 'Advanced Charting',
      starter: false,
      pro: true,
      robo: false,
      wealth: true
    },
    {
      service: 'Real-time Data',
      starter: false,
      pro: true,
      robo: true,
      wealth: true
    },
    {
      service: 'Portfolio Analytics',
      starter: false,
      pro: true,
      robo: true,
      wealth: true
    },
    {
      service: 'Tax Optimization',
      starter: false,
      pro: true,
      robo: true,
      wealth: true
    },
    {
      service: 'Dedicated Manager',
      starter: false,
      pro: false,
      robo: false,
      wealth: true
    }
  ];

  const faqs = [
    {
      question: 'Is there really no minimum balance requirement for the Starter plan?',
      answer: 'Absolutely! You can open a Starter account with PKR 0 and start investing with as little as PKR 100. This makes investing accessible to everyone, regardless of their financial situation.'
    },
    {
      question: 'How does the 0.25% Robo-Advisor fee compare to traditional fund management?',
      answer: 'Traditional mutual funds typically charge 1.5-3% annually. Our 0.25% fee is 85-90% lower, which can save you hundreds of thousands of rupees over time while providing superior AI-driven management.'
    },
    {
      question: 'Can I upgrade or downgrade my plan anytime?',
      answer: 'Yes, you can change your plan at any time. Upgrades take effect immediately, while downgrades take effect at the next billing cycle. There are no penalties for switching plans.'
    },
    {
      question: 'Are there any hidden fees I should know about?',
      answer: 'No hidden fees, ever. We believe in complete transparency. The only costs are the monthly subscription (for Pro) or annual management fee (for Robo-Advisor). Everything else is included.'
    },
    {
      question: 'How does Private Wealth pricing work?',
      answer: 'Private Wealth fees are customized based on your portfolio size and services required. Typically ranging from 0.50-1.00% annually, which is still significantly lower than traditional private banking fees.'
    }
  ];

  return (
    <PageTransition>
      <div className="min-h-screen">
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
                <MagneticButton variant="default" size="lg" className="w-full">
                  Learn More
                </MagneticButton>
                <CTAButton onClick={() => onNavigate('signup')}>
                  Get Started
                </CTAButton>
              </div>
            </div>
          </div>
        </nav>

        {/* Hero Section */}
        <MotionWrapper>
          <section className="bg-gradient-to-r from-primary via-primary to-primary/80 text-white py-20">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl lg:text-5xl font-bold mb-6">
            Transparent Pricing, 
            <span className="text-yellow-400">No Hidden Fees</span>
          </h1>
          <p className="text-xl text-white/90 mb-8 max-w-3xl mx-auto">
            Choose the plan that fits your investment goals. All plans include bank-grade security, SECP compliance, and access to Pakistani and international markets.
          </p>
          
          <div className="inline-flex items-center bg-yellow-400/20 text-yellow-400 px-6 py-3 rounded-full">
            <Shield className="w-5 h-5 mr-2" />
            All plans include investor protection up to PKR 5 million
          </div>
        </div>
      </section>
        </MotionWrapper>

      {/* Pricing Plans */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-4 gap-8">
            {pricingPlans.map((plan, index) => (
              <Card key={index} className={`relative ${plan.color} ${plan.popular ? 'shadow-xl' : ''}`}>
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <div className="bg-yellow-400 text-gray-900 px-4 py-1 rounded-full text-sm font-medium flex items-center">
                      <Star className="w-4 h-4 mr-1" />
                      Most Popular
                    </div>
                  </div>
                )}
                
                <CardHeader className="text-center">
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 ${
                    plan.name === 'Starter' ? 'bg-blue-100' :
                    plan.name === 'Pro' ? 'bg-yellow-100' :
                    plan.name === 'Robo-Advisor' ? 'bg-purple-100' :
                    'bg-yellow-100'
                  }`}>
                    {plan.name === 'Starter' && <Users className="w-8 h-8 text-blue-600" />}
                    {plan.name === 'Pro' && <Zap className="w-8 h-8 text-yellow-600" />}
                    {plan.name === 'Robo-Advisor' && <Clock className="w-8 h-8 text-purple-600" />}
                    {plan.name === 'Private Wealth' && <Crown className="w-8 h-8 text-yellow-600" />}
                  </div>
                  
                  <CardTitle className="text-2xl mb-2">{plan.name}</CardTitle>
                  
                  <div className="mb-4">
                    <div className="text-4xl font-bold text-blue-600">{plan.price}</div>
                    <div className="text-gray-600">{plan.period}</div>
                  </div>
                  
                  <p className="text-gray-600 text-sm">{plan.description}</p>
                </CardHeader>
                
                <CardContent>
                  <div className="space-y-4 mb-8">
                    {plan.features.map((feature, featureIndex) => (
                      <div key={featureIndex} className="flex items-center">
                        <CheckCircle className="w-5 h-5 text-yellow-400 mr-3 flex-shrink-0" />
                        <span className="text-gray-900 text-sm">{feature}</span>
                      </div>
                    ))}
                    
                    {plan.limitations.map((limitation, limitIndex) => (
                      <div key={limitIndex} className="flex items-center">
                        <X className="w-5 h-5 text-red-400 mr-3 flex-shrink-0" />
                        <span className="text-gray-600 text-sm">{limitation}</span>
                      </div>
                    ))}
                  </div>
                  
                  <CTAButton 
                    variant={plan.buttonVariant === 'primary' ? 'primary' : 'outline'}
                    className={`w-full ${plan.popular ? 'bg-yellow-400 hover:bg-yellow-500 text-gray-900' : ''}`}
                    onClick={() => onNavigate('signup')}
                  >
                    {plan.name === 'Private Wealth' ? 'Contact Us' : 
                     plan.name === 'Starter' ? 'Get Started Free' : 'Start Free Trial'}
                  </CTAButton>
                  
                  {plan.name === 'Pro' && (
                    <p className="text-xs text-gray-600 text-center mt-2">
                      30-day free trial, then PKR 499/month
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Fee Comparison */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Fee Comparison: InvestPro vs Traditional Brokers
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              See how much you can save with InvestPro's transparent, low-cost pricing structure.
            </p>
          </div>
          
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-blue-600 text-white">
                  <tr>
                    <th className="text-left p-4">Service</th>
                    <th className="text-center p-4">InvestPro</th>
                    <th className="text-center p-4">Traditional Brokers</th>
                    <th className="text-center p-4">Your Savings</th>
                  </tr>
                </thead>
                <tbody>
                  {tradingFees.map((fee, index) => (
                    <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                      <td className="p-4 font-medium">{fee.category}</td>
                      <td className="p-4 text-center font-bold text-yellow-600">{fee.investpro}</td>
                      <td className="p-4 text-center text-red-600">{fee.traditional}</td>
                      <td className="p-4 text-center font-bold text-yellow-600">{fee.savings}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
          
          <div className="text-center mt-8">
            <div className="inline-flex items-center bg-yellow-400/10 text-yellow-600 px-6 py-3 rounded-full">
              <DollarSign className="w-5 h-5 mr-2" />
              Average investor saves PKR 25,000+ annually with InvestPro
            </div>
          </div>
        </div>
      </section>

      {/* Feature Comparison */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Feature Comparison
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Compare features across all plans to find the perfect fit for your investment needs.
            </p>
          </div>
          
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left p-4">Features</th>
                    <th className="text-center p-4">Starter</th>
                    <th className="text-center p-4">Pro</th>
                    <th className="text-center p-4">Robo-Advisor</th>
                    <th className="text-center p-4">Private Wealth</th>
                  </tr>
                </thead>
                <tbody>
                  {additionalServices.map((service, index) => (
                    <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="p-4 font-medium">{service.service}</td>
                      <td className="p-4 text-center">
                        {service.starter ? 
                          <CheckCircle className="w-5 h-5 text-yellow-400 mx-auto" /> : 
                          <X className="w-5 h-5 text-red-400 mx-auto" />
                        }
                      </td>
                      <td className="p-4 text-center">
                        {service.pro ? 
                          <CheckCircle className="w-5 h-5 text-yellow-400 mx-auto" /> : 
                          <X className="w-5 h-5 text-red-400 mx-auto" />
                        }
                      </td>
                      <td className="p-4 text-center">
                        {service.robo ? 
                          <CheckCircle className="w-5 h-5 text-yellow-400 mx-auto" /> : 
                          <X className="w-5 h-5 text-red-400 mx-auto" />
                        }
                      </td>
                      <td className="p-4 text-center">
                        {service.wealth ? 
                          <CheckCircle className="w-5 h-5 text-yellow-400 mx-auto" /> : 
                          <X className="w-5 h-5 text-red-400 mx-auto" />
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Get answers to common questions about our pricing and services.
            </p>
          </div>
          
          <div className="max-w-4xl mx-auto space-y-6">
            {faqs.map((faq, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="text-lg">{faq.question}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">{faq.answer}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold mb-6">
            Ready to Start Your Investment Journey?
          </h2>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            Join thousands of Pakistani investors who trust InvestPro with their financial future.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              variant="secondary"
              className="bg-yellow-400 text-gray-900 hover:bg-yellow-500"
              onClick={() => onNavigate('signup')}
            >
              Start Free Account
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="border-white text-white hover:bg-white hover:text-blue-600"
              onClick={() => onNavigate('landing')}
            >
              Learn More
            </Button>
          </div>
        </div>
      </section>
    </div>
    </PageTransition>
  );
}
