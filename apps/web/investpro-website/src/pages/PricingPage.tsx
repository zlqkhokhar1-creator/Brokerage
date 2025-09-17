import React from 'react';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
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
  Shield
} from 'lucide-react';

export const PricingPage: React.FC = () => {
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
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-primary text-white py-20">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl lg:text-5xl font-heading font-bold mb-6">
            Transparent Pricing, 
            <span className="text-secondary">No Hidden Fees</span>
          </h1>
          <p className="text-xl text-white/90 mb-8 max-w-3xl mx-auto">
            Choose the plan that fits your investment goals. All plans include bank-grade security, SECP compliance, and access to Pakistani and international markets.
          </p>
          
          <div className="inline-flex items-center bg-secondary/20 text-secondary px-6 py-3 rounded-full">
            <Shield className="w-5 h-5 mr-2" />
            All plans include investor protection up to PKR 5 million
          </div>
        </div>
      </section>

      {/* Pricing Plans */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-4 gap-8">
            {pricingPlans.map((plan, index) => (
              <Card key={index} className={`relative ${plan.color} ${plan.popular ? 'shadow-xl' : ''}`}>
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <div className="bg-secondary text-white px-4 py-1 rounded-full text-sm font-medium flex items-center">
                      <Star className="w-4 h-4 mr-1" />
                      Most Popular
                    </div>
                  </div>
                )}
                
                <CardHeader className="text-center">
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 ${
                    plan.name === 'Starter' ? 'bg-blue-100' :
                    plan.name === 'Pro' ? 'bg-secondary/10' :
                    plan.name === 'Robo-Advisor' ? 'bg-purple-100' :
                    'bg-yellow-100'
                  }`}>
                    {plan.name === 'Starter' && <Users className="w-8 h-8 text-blue-600" />}
                    {plan.name === 'Pro' && <Zap className="w-8 h-8 text-secondary" />}
                    {plan.name === 'Robo-Advisor' && <Clock className="w-8 h-8 text-purple-600" />}
                    {plan.name === 'Private Wealth' && <Crown className="w-8 h-8 text-yellow-600" />}
                  </div>
                  
                  <CardTitle className="text-2xl mb-2">{plan.name}</CardTitle>
                  
                  <div className="mb-4">
                    <div className="text-4xl font-bold text-primary">{plan.price}</div>
                    <div className="text-muted">{plan.period}</div>
                  </div>
                  
                  <p className="text-muted text-sm">{plan.description}</p>
                </CardHeader>
                
                <CardContent>
                  <div className="space-y-4 mb-8">
                    {plan.features.map((feature, featureIndex) => (
                      <div key={featureIndex} className="flex items-center">
                        <CheckCircle className="w-5 h-5 text-secondary mr-3 flex-shrink-0" />
                        <span className="text-foreground text-sm">{feature}</span>
                      </div>
                    ))}
                    
                    {plan.limitations.map((limitation, limitIndex) => (
                      <div key={limitIndex} className="flex items-center">
                        <X className="w-5 h-5 text-red-400 mr-3 flex-shrink-0" />
                        <span className="text-muted text-sm">{limitation}</span>
                      </div>
                    ))}
                  </div>
                  
                  <Button 
                    variant={plan.buttonVariant}
                    className={`w-full ${plan.popular ? 'bg-secondary hover:bg-accent' : ''}`}
                  >
                    {plan.name === 'Private Wealth' ? 'Contact Us' : 
                     plan.name === 'Starter' ? 'Get Started Free' : 'Start Free Trial'}
                  </Button>
                  
                  {plan.name === 'Pro' && (
                    <p className="text-xs text-muted text-center mt-2">
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
      <section className="py-20 bg-background-alt">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-heading font-bold text-primary mb-4">
              Fee Comparison: InvestPro vs Traditional Brokers
            </h2>
            <p className="text-xl text-muted max-w-3xl mx-auto">
              See how much you can save with InvestPro's transparent, low-cost pricing structure.
            </p>
          </div>
          
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-primary text-white">
                  <tr>
                    <th className="text-left p-4">Service</th>
                    <th className="text-center p-4">InvestPro</th>
                    <th className="text-center p-4">Traditional Brokers</th>
                    <th className="text-center p-4">Your Savings</th>
                  </tr>
                </thead>
                <tbody>
                  {tradingFees.map((fee, index) => (
                    <tr key={index} className={index % 2 === 0 ? 'bg-background-alt' : 'bg-white'}>
                      <td className="p-4 font-medium">{fee.category}</td>
                      <td className="p-4 text-center font-bold text-secondary">{fee.investpro}</td>
                      <td className="p-4 text-center text-red-600">{fee.traditional}</td>
                      <td className="p-4 text-center font-bold text-secondary">{fee.savings}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
          
          <div className="text-center mt-8">
            <div className="inline-flex items-center bg-secondary/10 text-secondary px-6 py-3 rounded-full">
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
            <h2 className="text-3xl lg:text-4xl font-heading font-bold text-primary mb-4">
              Feature Comparison
            </h2>
            <p className="text-xl text-muted max-w-3xl mx-auto">
              Compare features across all plans to find the perfect fit for your investment needs.
            </p>
          </div>
          
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-background-alt">
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
                    <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-background-alt'}>
                      <td className="p-4 font-medium">{service.service}</td>
                      <td className="p-4 text-center">
                        {service.starter ? 
                          <CheckCircle className="w-5 h-5 text-secondary mx-auto" /> : 
                          <X className="w-5 h-5 text-red-400 mx-auto" />
                        }
                      </td>
                      <td className="p-4 text-center">
                        {service.pro ? 
                          <CheckCircle className="w-5 h-5 text-secondary mx-auto" /> : 
                          <X className="w-5 h-5 text-red-400 mx-auto" />
                        }
                      </td>
                      <td className="p-4 text-center">
                        {service.robo ? 
                          <CheckCircle className="w-5 h-5 text-secondary mx-auto" /> : 
                          <X className="w-5 h-5 text-red-400 mx-auto" />
                        }
                      </td>
                      <td className="p-4 text-center">
                        {service.wealth ? 
                          <CheckCircle className="w-5 h-5 text-secondary mx-auto" /> : 
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
      <section className="py-20 bg-background-alt">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-heading font-bold text-primary mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-xl text-muted max-w-3xl mx-auto">
              Get answers to common questions about our pricing and services.
            </p>
          </div>
          
          <div className="max-w-4xl mx-auto space-y-6">
            {faqs.map((faq, index) => (
              <Card key={index} hover>
                <CardHeader>
                  <CardTitle className="text-lg">{faq.question}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted leading-relaxed">{faq.answer}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-primary text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl lg:text-4xl font-heading font-bold mb-6">
            Ready to Start Investing?
          </h2>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            Join thousands of Pakistani investors who have already switched to InvestPro's transparent, low-cost investing.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <Button size="lg" variant="secondary" className="text-lg px-8">
              Start Free Account
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button size="lg" variant="outline" className="text-lg px-8 border-white text-white hover:bg-white hover:text-primary">
              Try Pro Free for 30 Days
            </Button>
          </div>
          
          <p className="text-white/80 text-sm">
            No commitment • No hidden fees • Cancel anytime
          </p>
        </div>
      </section>
    </div>
  );
};