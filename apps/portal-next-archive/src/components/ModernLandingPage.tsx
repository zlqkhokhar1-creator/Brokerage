"use client";
import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { 
  TrendingUp, 
  Shield, 
  Smartphone, 
  DollarSign, 
  BarChart3, 
  Users,
  ArrowRight,
  CheckCircle,
  Star,
  Globe,
  Zap,
  Eye,
  Moon,
  Sun,
  Menu,
  X
} from 'lucide-react';

interface ModernLandingPageProps {
  onNavigate: (page: 'login' | 'signup') => void;
}

export function ModernLandingPage({ onNavigate }: ModernLandingPageProps) {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark');
  };

  const features = [
    {
      icon: DollarSign,
      title: "Zero Commission Trading",
      description: "Trade stocks, ETFs, and options with absolutely no commission fees. Keep 100% of your profits.",
      highlight: "No hidden fees"
    },
    {
      icon: BarChart3,
      title: "Advanced Analytics",
      description: "Professional-grade charts, technical indicators, and real-time market analysis tools.",
      highlight: "Pro tools"
    },
    {
      icon: Shield,
      title: "Bank-Level Security",
      description: "Your investments are protected with 256-bit encryption and SIPC insurance up to $500,000.",
      highlight: "Fully insured"
    },
    {
      icon: Smartphone,
      title: "Mobile-First Platform",
      description: "Trade anywhere, anytime with our award-winning mobile app. Never miss a market opportunity.",
      highlight: "Award-winning"
    },
    {
      icon: Zap,
      title: "Lightning Fast Execution",
      description: "Execute trades in milliseconds with our cutting-edge technology and direct market access.",
      highlight: "Instant execution"
    },
    {
      icon: Globe,
      title: "Global Markets",
      description: "Access stocks from major exchanges worldwide. Trade US, European, and Asian markets seamlessly.",
      highlight: "50+ countries"
    }
  ];

  const testimonials = [
    {
      name: "Sarah Chen",
      role: "Day Trader",
      content: "The fastest and most reliable platform I've ever used. The mobile app is absolutely phenomenal.",
      rating: 5,
      avatar: "SC"
    },
    {
      name: "Michael Rodriguez",
      role: "Portfolio Manager",
      content: "Professional-grade analytics at zero cost. This platform has transformed how I manage investments.",
      rating: 5,
      avatar: "MR"
    },
    {
      name: "Emma Thompson",
      role: "Retail Investor",
      content: "Perfect for beginners and experts alike. The educational resources are top-notch.",
      rating: 5,
      avatar: "ET"
    }
  ];

  const stats = [
    { value: "2M+", label: "Active Users" },
    { value: "$50B+", label: "Assets Under Management" },
    { value: "99.9%", label: "Uptime" },
    { value: "0.1s", label: "Average Execution Time" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/20">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="flex items-center">
                <div className="h-8 w-8 bg-gradient-to-br from-primary to-primary/70 rounded-lg flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-primary-foreground" />
                </div>
                <span className="ml-3 text-xl font-semibold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                  TradePro
                </span>
              </div>
            </div>
            
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">Features</a>
              <a href="#pricing" className="text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
              <a href="#about" className="text-muted-foreground hover:text-foreground transition-colors">About</a>
              <Button variant="ghost" size="sm" onClick={toggleDarkMode}>
                {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
              <Button variant="ghost" onClick={() => onNavigate('login')}>
                Sign In
              </Button>
              <Button onClick={() => onNavigate('signup')}>
                Get Started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={toggleDarkMode}>
                {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </div>
          </div>

          {/* Mobile menu */}
          {isMobileMenuOpen && (
            <div className="md:hidden">
              <div className="px-2 pt-2 pb-3 space-y-1">
                <a href="#features" className="block px-3 py-2 text-muted-foreground hover:text-foreground">Features</a>
                <a href="#pricing" className="block px-3 py-2 text-muted-foreground hover:text-foreground">Pricing</a>
                <a href="#about" className="block px-3 py-2 text-muted-foreground hover:text-foreground">About</a>
                <div className="pt-4 flex flex-col gap-2">
                  <Button variant="ghost" onClick={() => onNavigate('login')}>Sign In</Button>
                  <Button onClick={() => onNavigate('signup')}>Get Started</Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 lg:py-32">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="lg:grid lg:grid-cols-12 lg:gap-12 items-center">
            <div className="lg:col-span-6">
              <Badge variant="secondary" className="mb-6 bg-primary/10 text-primary border-primary/20">
                <Zap className="h-3 w-3 mr-1" />
                New: AI-Powered Portfolio Insights
              </Badge>
              
              <h1 className="text-4xl lg:text-6xl font-bold mb-6 leading-tight">
                Invest in your
                <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent"> future </span>
                with confidence
              </h1>
              
              <p className="text-xl text-muted-foreground mb-8 leading-relaxed max-w-2xl">
                Join millions who trust TradePro for commission-free trading, real-time analytics, 
                and professional-grade tools. Start building your wealth today.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 mb-12">
                <Button size="lg" className="text-lg px-8 py-6" onClick={() => onNavigate('signup')}>
                  Start Trading Free
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <Button variant="outline" size="lg" className="text-lg px-8 py-6">
                  <Eye className="mr-2 h-5 w-5" />
                  Watch Demo
                </Button>
              </div>
              
              {/* Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-8">
                {stats.map((stat, index) => (
                  <div key={index} className="text-center">
                    <div className="text-2xl font-bold text-primary">{stat.value}</div>
                    <div className="text-sm text-muted-foreground">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="lg:col-span-6 mt-12 lg:mt-0">
              <div className="relative">
                <div className="relative z-10 bg-gradient-to-br from-card to-card/80 rounded-2xl p-8 shadow-2xl border border-border/50 backdrop-blur-sm">
                  <ImageWithFallback
                    src="/fintech-technology.jpg"
                    alt="TradePro Dashboard"
                    className="w-full h-auto rounded-xl"
                  />
                </div>
                
                {/* Floating elements */}
                <div className="absolute -top-4 -right-4 bg-success text-success-foreground px-4 py-2 rounded-full text-sm font-medium shadow-lg">
                  +24.5% this month
                </div>
                <div className="absolute -bottom-4 -left-4 bg-card border border-border/50 px-4 py-2 rounded-full text-sm shadow-lg backdrop-blur-sm">
                  <TrendingUp className="inline h-4 w-4 text-success mr-1" />
                  Live trading
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-4 bg-primary/10 text-primary border-primary/20">
              Why Choose TradePro
            </Badge>
            <h2 className="text-3xl lg:text-5xl font-bold mb-6">
              Everything you need to trade like a pro
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Our platform combines cutting-edge technology with intuitive design, 
              making professional trading accessible to everyone.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="group hover:shadow-xl transition-all duration-300 border-border/50 bg-card/50 backdrop-blur-sm">
                <CardContent className="p-8">
                  <div className="flex items-center justify-between mb-6">
                    <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      <feature.icon className="h-6 w-6 text-primary" />
                    </div>
                    <Badge variant="secondary" className="text-xs bg-success/10 text-success">
                      {feature.highlight}
                    </Badge>
                  </div>
                  <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-4 bg-primary/10 text-primary border-primary/20">
              Testimonials
            </Badge>
            <h2 className="text-3xl lg:text-5xl font-bold mb-6">
              Trusted by millions of traders worldwide
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="bg-card/50 backdrop-blur-sm border-border/50">
                <CardContent className="p-6">
                  <div className="flex items-center mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-warning text-warning" />
                    ))}
                  </div>
                  <p className="text-muted-foreground mb-6 leading-relaxed">"{testimonial.content}"</p>
                  <div className="flex items-center">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-medium text-primary">
                      {testimonial.avatar}
                    </div>
                    <div className="ml-3">
                      <p className="font-medium">{testimonial.name}</p>
                      <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl lg:text-5xl font-bold mb-6">
            Ready to start your trading journey?
          </h2>
          <p className="text-xl opacity-90 mb-8 max-w-2xl mx-auto">
            Join over 2 million traders who've chosen TradePro. Open your free account in minutes 
            and start trading with zero commissions.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              variant="secondary"
              className="text-lg px-8 py-6"
              onClick={() => onNavigate('signup')}
            >
              Open Free Account
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              className="text-lg px-8 py-6 border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/10"
            >
              Contact Sales
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-card border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="col-span-1">
              <div className="flex items-center mb-4">
                <div className="h-8 w-8 bg-gradient-to-br from-primary to-primary/70 rounded-lg flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-primary-foreground" />
                </div>
                <span className="ml-3 text-lg font-semibold">TradePro</span>
              </div>
              <p className="text-muted-foreground mb-4">
                Professional trading platform for the modern investor. Trade with confidence, 
                grow with purpose.
              </p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Shield className="h-4 w-4" />
                SIPC Protected
              </div>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Trading</h3>
              <ul className="space-y-2 text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">Stocks</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">ETFs</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Options</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Crypto</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Resources</h3>
              <ul className="space-y-2 text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">Education Hub</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Market Analysis</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Research</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Help Center</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Company</h3>
              <ul className="space-y-2 text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">About Us</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Legal</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Privacy Policy</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-border mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-muted-foreground text-sm">
              © 2024 TradePro. All rights reserved. Securities offered through TradePro Securities LLC.
            </p>
            <div className="flex items-center gap-4 mt-4 md:mt-0">
              <Badge variant="secondary" className="bg-success/10 text-success border-success/20">
                <CheckCircle className="h-3 w-3 mr-1" />
                99.9% Uptime
              </Badge>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}