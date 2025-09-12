import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { MotionWrapper, StaggerWrapper } from '../animations/MotionWrapper';
import { EnhancedCard } from '../ui/EnhancedCard';
import { 
  ChevronDown, 
  HelpCircle, 
  DollarSign, 
  Shield, 
  TrendingUp,
  Users,
  Clock,
  Phone
} from 'lucide-react';

interface FAQ {
  id: number;
  category: string;
  question: string;
  answer: string;
  icon: React.ComponentType<any>;
}

export const FAQSection: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState('general');
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null);

  const categories = [
    { id: 'general', label: 'General', icon: HelpCircle },
    { id: 'pricing', label: 'Pricing & Fees', icon: DollarSign },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'investing', label: 'Investing', icon: TrendingUp },
    { id: 'account', label: 'Account', icon: Users },
    { id: 'support', label: 'Support', icon: Phone }
  ];

  const faqs: FAQ[] = [
    // General FAQs
    {
      id: 1,
      category: 'general',
      question: 'What is InvestPro and how does it work?',
      answer: 'InvestPro is Pakistan\'s first AI-driven digital brokerage platform that makes investing accessible, intelligent, and profitable. Our platform combines advanced artificial intelligence with deep Pakistani market expertise to provide personalized investment recommendations, automated portfolio management, and real-time market insights.',
      icon: HelpCircle
    },
    {
      id: 2,
      category: 'general',
      question: 'Is InvestPro regulated and licensed in Pakistan?',
      answer: 'Yes, InvestPro is fully licensed by the Securities and Exchange Commission of Pakistan (SECP) and is a member of the Pakistan Stock Exchange (PSX). We comply with all regulatory requirements and maintain the highest standards of financial conduct and investor protection.',
      icon: Shield
    },
    {
      id: 3,
      category: 'general',
      question: 'What makes InvestPro different from traditional brokers?',
      answer: 'InvestPro leverages artificial intelligence to provide personalized investment insights, automated portfolio management, and real-time optimization. Unlike traditional brokers, we offer transparent pricing, no hidden fees, and 24/7 AI-powered portfolio monitoring at a fraction of the cost.',
      icon: TrendingUp
    },
    
    // Pricing FAQs
    {
      id: 4,
      category: 'pricing',
      question: 'What are InvestPro\'s fees and charges?',
      answer: 'We offer transparent, competitive pricing: Starter plan is completely free, Pro plan costs PKR 499/month, Robo-Advisor charges 0.25% annually, and Private Wealth has custom pricing. No hidden fees, no account maintenance charges, and no minimum balance requirements for most plans.',
      icon: DollarSign
    },
    {
      id: 5,
      category: 'pricing',
      question: 'Are there any hidden fees I should know about?',
      answer: 'Absolutely not. We believe in complete transparency. The only costs are your monthly subscription (for Pro) or annual management fee (for Robo-Advisor). There are no account opening fees, maintenance charges, or hidden transaction costs.',
      icon: DollarSign
    },
    {
      id: 6,
      category: 'pricing',
      question: 'How does your pricing compare to traditional brokers?',
      answer: 'Our fees are typically 70-90% lower than traditional brokers. While traditional brokers charge 0.5% per trade plus PKR 2,000 account opening and PKR 500 monthly maintenance, we offer commission-free trading and transparent subscription pricing.',
      icon: DollarSign
    },
    
    // Security FAQs
    {
      id: 7,
      category: 'security',
      question: 'How secure is my money and personal information?',
      answer: 'Your security is our top priority. We use bank-grade 256-bit encryption, two-factor authentication, and segregated client accounts. Your funds are protected by investor protection schemes up to PKR 5 million. We never store sensitive financial information on our servers.',
      icon: Shield
    },
    {
      id: 8,
      category: 'security',
      question: 'What happens if InvestPro goes out of business?',
      answer: 'Your investments are held in segregated accounts with our custodian partners, separate from InvestPro\'s operational funds. In the unlikely event of business closure, your assets remain protected and can be transferred to another licensed broker of your choice.',
      icon: Shield
    },
    
    // Investing FAQs
    {
      id: 9,
      category: 'investing',
      question: 'What can I invest in through InvestPro?',
      answer: 'You can invest in Pakistani stocks (PSX), mutual funds, ETFs, government bonds, and Shariah-compliant securities. Our platform also provides access to select international funds and global diversification opportunities for qualified investors.',
      icon: TrendingUp
    },
    {
      id: 10,
      category: 'investing',
      question: 'How does the AI Robo-Advisor work?',
      answer: 'Our AI Robo-Advisor uses machine learning algorithms to analyze your risk tolerance, investment goals, and market conditions. It automatically creates and manages a diversified portfolio, rebalances when needed, and optimizes for tax efficiency—all without requiring your daily attention.',
      icon: TrendingUp
    },
    {
      id: 11,
      category: 'investing',
      question: 'Can I invest according to Islamic/Shariah principles?',
      answer: 'Yes! We offer a comprehensive range of Shariah-compliant investment options, including halal stocks, Islamic mutual funds, Sukuk bonds, and Shariah-compliant ETFs. Our Islamic investment advisory ensures all recommendations align with Islamic finance principles.',
      icon: TrendingUp
    },
    
    // Account FAQs
    {
      id: 12,
      category: 'account',
      question: 'How do I open an account with InvestPro?',
      answer: 'Opening an account is simple and takes just 5 minutes online. You\'ll need your CNIC, bank account details, and a selfie for verification. Our digital onboarding process is completely paperless and SECP-compliant.',
      icon: Users
    },
    {
      id: 13,
      category: 'account',
      question: 'What is the minimum amount needed to start investing?',
      answer: 'You can start with as little as PKR 100 for stock investments and PKR 5,000 for mutual funds. Our Robo-Advisor requires a minimum of PKR 10,000, while Private Wealth services start at PKR 25 million.',
      icon: Users
    },
    
    // Support FAQs
    {
      id: 14,
      category: 'support',
      question: 'How can I get help if I have questions?',
      answer: 'We offer multiple support channels: 24/7 live chat, email support, phone support during business hours, and an extensive knowledge base. Pro and higher tier customers get priority support with faster response times.',
      icon: Phone
    },
    {
      id: 15,
      category: 'support',
      question: 'Do you provide investment advice and education?',
      answer: 'Yes! We offer comprehensive investment education through our blog, webinars, and learning center. Our AI provides personalized insights, and Private Wealth clients get dedicated financial advisors for personalized investment guidance.',
      icon: Phone
    }
  ];

  const filteredFAQs = faqs.filter(faq => faq.category === activeCategory);

  const toggleFAQ = (id: number) => {
    setExpandedFAQ(expandedFAQ === id ? null : id);
  };

  return (
    <section className="py-20 bg-background-alt">
      <div className="container mx-auto px-4">
        <MotionWrapper>
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-heading font-bold text-primary mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-xl text-muted max-w-3xl mx-auto">
              Get answers to common questions about InvestPro's platform, services, and investing in Pakistan.
            </p>
          </div>
        </MotionWrapper>

        <div className="max-w-6xl mx-auto">
          {/* Category Tabs */}
          <MotionWrapper className="mb-12">
            <div className="flex flex-wrap justify-center gap-2 mb-8">
              {categories.map((category) => {
                const IconComponent = category.icon;
                return (
                  <motion.button
                    key={category.id}
                    className={`flex items-center px-4 py-3 rounded-lg font-medium transition-all duration-300 ${
                      activeCategory === category.id
                        ? 'bg-secondary text-white shadow-lg'
                        : 'bg-white text-foreground hover:bg-secondary/10 border border-border'
                    }`}
                    onClick={() => setActiveCategory(category.id)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <IconComponent className={`w-4 h-4 mr-2 ${
                      activeCategory === category.id ? 'text-white' : 'text-secondary'
                    }`} />
                    {category.label}
                  </motion.button>
                );
              })}
            </div>
          </MotionWrapper>

          {/* FAQ List */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeCategory}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <StaggerWrapper className="space-y-4">
                {filteredFAQs.map((faq) => {
                  const IconComponent = faq.icon;
                  const isExpanded = expandedFAQ === faq.id;
                  
                  return (
                    <EnhancedCard
                      key={faq.id}
                      hover
                      className="cursor-pointer overflow-hidden"
                    >
                      <motion.div
                        onClick={() => toggleFAQ(faq.id)}
                        className="flex items-center justify-between p-6"
                      >
                        <div className="flex items-start">
                          <div className="w-10 h-10 bg-secondary/10 rounded-lg flex items-center justify-center mr-4 flex-shrink-0">
                            <IconComponent className="w-5 h-5 text-secondary" />
                          </div>
                          <h3 className="text-lg font-semibold text-foreground pr-4">
                            {faq.question}
                          </h3>
                        </div>
                        <motion.div
                          animate={{ rotate: isExpanded ? 180 : 0 }}
                          transition={{ duration: 0.3 }}
                          className="flex-shrink-0"
                        >
                          <ChevronDown className="w-5 h-5 text-muted" />
                        </motion.div>
                      </motion.div>
                      
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
                            className="overflow-hidden"
                          >
                            <div className="px-6 pb-6">
                              <div className="ml-14 text-muted leading-relaxed">
                                {faq.answer}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </EnhancedCard>
                  );
                })}
              </StaggerWrapper>
            </motion.div>
          </AnimatePresence>

          {/* Contact Support */}
          <MotionWrapper className="mt-16">
            <EnhancedCard hover glow className="text-center">
              <div className="p-8">
                <div className="w-16 h-16 bg-secondary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <HelpCircle className="w-8 h-8 text-secondary" />
                </div>
                <h3 className="text-2xl font-bold text-primary mb-4">
                  Still have questions?
                </h3>
                <p className="text-muted mb-6 max-w-2xl mx-auto">
                  Can't find the answer you're looking for? Our support team is here to help you with any questions about investing, our platform, or your account.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <motion.button
                    className="inline-flex items-center justify-center px-6 py-3 bg-secondary text-white rounded-lg font-medium hover:bg-accent transition-colors"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Phone className="w-5 h-5 mr-2" />
                    Call Support
                  </motion.button>
                  <motion.button
                    className="inline-flex items-center justify-center px-6 py-3 bg-white text-secondary border border-secondary rounded-lg font-medium hover:bg-secondary/5 transition-colors"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Clock className="w-5 h-5 mr-2" />
                    Live Chat
                  </motion.button>
                </div>
                <div className="flex items-center justify-center mt-4 text-sm text-muted">
                  <Clock className="w-4 h-4 mr-1" />
                  Average response time: Under 2 minutes
                </div>
              </div>
            </EnhancedCard>
          </MotionWrapper>
        </div>
      </div>
    </section>
  );
};