import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../ui/Button';
import { AppDownloadButtons } from '../ui/AppDownloadButtons';
import { Facebook, Twitter, Linkedin, Instagram, Mail, Smartphone } from 'lucide-react';

export const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  const footerSections = [
    {
      title: 'Products',
      links: [
        { label: 'Stocks & ETFs', path: '/trade/stocks-etfs' },
        { label: 'Mutual Funds', path: '/trade/mutual-funds' },
        { label: 'Robo-Advisor', path: '/invest/robo-advisor' },
        { label: 'Private Wealth', path: '/invest/private-wealth' }
      ]
    },
    {
      title: 'Company',
      links: [
        { label: 'About Us', path: '/about' },
        { label: 'Careers', path: '/careers' },
        { label: 'Press', path: '/press' },
        { label: 'Contact', path: '/contact' }
      ]
    },
    {
      title: 'Resources',
      links: [
        { label: 'Blog', path: '/discover/blog' },
        { label: 'Retirement Calculator', path: '/discover/retirement-calculator' },
        { label: 'Help Center', path: '/help' },
        { label: 'API Documentation', path: '/api-docs' }
      ]
    },
    {
      title: 'Legal',
      links: [
        { label: 'Privacy Policy', path: '/privacy' },
        { label: 'Terms of Service', path: '/terms' },
        { label: 'Cookie Policy', path: '/cookies' },
        { label: 'Compliance', path: '/compliance' }
      ]
    }
  ];

  const socialLinks = [
    { icon: Facebook, href: '#', label: 'Facebook' },
    { icon: Twitter, href: '#', label: 'Twitter' },
    { icon: Linkedin, href: '#', label: 'LinkedIn' },
    { icon: Instagram, href: '#', label: 'Instagram' }
  ];

  return (
    <footer className="bg-primary text-white">
      <div className="container mx-auto px-4 py-16">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-8 mb-12">
          {/* Brand Section */}
          <div className="lg:col-span-2">
            <Link to="/" className="flex items-center space-x-2 mb-6">
              <div className="w-8 h-8 bg-gradient-secondary rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">IP</span>
              </div>
              <span className="text-2xl font-heading font-bold">InvestPro</span>
            </Link>
            <p className="text-white/80 mb-6 leading-relaxed">
              Pakistan's first AI-driven digital brokerage platform. Making investing accessible, intelligent, and profitable for everyone.
            </p>
            
            {/* Newsletter Signup */}
            <div className="mb-6">
              <h4 className="font-semibold mb-3">Stay Updated</h4>
              <div className="flex flex-col sm:flex-row gap-2">
                <input 
                  type="email" 
                  placeholder="Enter your email" 
                  className="flex-1 px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-secondary focus:border-transparent"
                />
                <Button variant="secondary" size="sm">
                  <Mail className="w-4 h-4 mr-2" />
                  Subscribe
                </Button>
              </div>
            </div>
            
            {/* Mobile App Download */}
            <div className="mb-6">
              <div className="flex items-center mb-3">
                <Smartphone className="w-5 h-5 mr-2 text-secondary" />
                <h4 className="font-semibold">Get the InvestPro App</h4>
              </div>
              <p className="text-white/70 text-sm mb-4">
                Trade and invest on the go with our mobile app. Available soon on iOS and Android.
              </p>
              <AppDownloadButtons 
                variant="horizontal" 
                theme="dark" 
                showComingSoon={true}
                className="justify-start"
              />
            </div>
            
            {/* Social Links */}
            <div className="flex space-x-4">
              {socialLinks.map((social, index) => {
                const IconComponent = social.icon;
                return (
                  <a
                    key={index}
                    href={social.href}
                    className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center hover:bg-secondary transition-colors"
                    aria-label={social.label}
                  >
                    <IconComponent className="w-5 h-5" />
                  </a>
                );
              })}
            </div>
          </div>

          {/* Footer Links */}
          {footerSections.map((section, index) => (
            <div key={index}>
              <h4 className="font-semibold mb-4">{section.title}</h4>
              <ul className="space-y-3">
                {section.links.map((link, linkIndex) => (
                  <li key={linkIndex}>
                    <Link 
                      to={link.path} 
                      className="text-white/80 hover:text-secondary transition-colors text-sm"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom Section */}
        <div className="pt-8 border-t border-white/20">
          <div className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
            <div className="text-white/60 text-sm">
              © {currentYear} InvestPro. All rights reserved. | SECP Licensed | Member PSX
            </div>
            <div className="text-white/60 text-sm">
              Regulated by SECP • Member of Pakistan Stock Exchange • Investor Protection Fund
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};