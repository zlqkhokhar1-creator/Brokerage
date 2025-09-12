import React from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { TrendingUp, Shield, Smartphone, DollarSign, BarChart3, Users } from 'lucide-react';

interface LandingPageProps {
  onNavigate: (page: 'login' | 'signup') => void;
}

export function LandingPage({ onNavigate }: LandingPageProps) {
  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-primary" />
              <span className="ml-2 text-xl text-primary">InvestPro</span>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => onNavigate('login')}>
                Sign In
              </Button>
              <Button onClick={() => onNavigate('signup')}>
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative py-20 lg:py-32 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:grid lg:grid-cols-12 lg:gap-8 items-center">
            <div className="lg:col-span-6">
              <h1 className="text-4xl lg:text-6xl mb-6">
                Invest in your future with confidence
              </h1>
              <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
                Commission-free trading, powerful analytics, and real-time market data. 
                Start building your portfolio today with our professional-grade platform.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button size="lg" onClick={() => onNavigate('signup')}>
                  Start Trading Free
                </Button>
                <Button variant="outline" size="lg">
                  Learn More
                </Button>
              </div>
            </div>
            <div className="lg:col-span-6 mt-12 lg:mt-0">
              <div className="relative">
                <img
                  src="https://images.unsplash.com/photo-1648293981217-420f71485b59?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBmaW5hbmNpYWwlMjB0cmFkaW5nfGVufDF8fHx8MTc1NzEzOTYwOXww&ixlib=rb-4.1.0&q=80&w=1080"
                  alt="Trading Dashboard"
                  className="w-full h-auto rounded-lg shadow-2xl"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl mb-4">
              Everything you need to trade like a pro
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Our platform combines powerful tools with an intuitive interface, 
              making professional trading accessible to everyone.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card>
              <CardHeader>
                <DollarSign className="h-12 w-12 text-primary mb-4" />
                <CardTitle>Zero Commission</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Trade stocks, ETFs, and options with zero commission fees. 
                  Keep more of your profits.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <BarChart3 className="h-12 w-12 text-primary mb-4" />
                <CardTitle>Advanced Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Professional-grade charts, technical indicators, and market analysis 
                  tools to inform your decisions.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Shield className="h-12 w-12 text-primary mb-4" />
                <CardTitle>Bank-Level Security</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Your investments are protected with 256-bit encryption and 
                  SIPC insurance up to $500,000.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Smartphone className="h-12 w-12 text-primary mb-4" />
                <CardTitle>Mobile First</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Trade anywhere, anytime with our mobile-optimized platform. 
                  Never miss a market opportunity.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <TrendingUp className="h-12 w-12 text-primary mb-4" />
                <CardTitle>Real-Time Data</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Get real-time market data, news, and alerts to stay ahead 
                  of market movements.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Users className="h-12 w-12 text-primary mb-4" />
                <CardTitle>Expert Support</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  24/7 customer support from licensed professionals ready to 
                  help with your trading questions.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl lg:text-4xl mb-6">
            Ready to start investing?
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            Join thousands of investors who trust InvestPro for their trading needs.
          </p>
          <Button size="lg" onClick={() => onNavigate('signup')}>
            Open Free Account
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12 bg-muted/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center mb-4">
                <TrendingUp className="h-6 w-6 text-primary" />
                <span className="ml-2 text-lg">InvestPro</span>
              </div>
              <p className="text-muted-foreground">
                Professional trading platform for modern investors.
              </p>
            </div>
            <div>
              <h3 className="mb-4">Trading</h3>
              <ul className="space-y-2 text-muted-foreground">
                <li>Stocks</li>
                <li>ETFs</li>
                <li>Options</li>
                <li>Crypto</li>
              </ul>
            </div>
            <div>
              <h3 className="mb-4">Resources</h3>
              <ul className="space-y-2 text-muted-foreground">
                <li>Education</li>
                <li>Market News</li>
                <li>Research</li>
                <li>Help Center</li>
              </ul>
            </div>
            <div>
              <h3 className="mb-4">Company</h3>
              <ul className="space-y-2 text-muted-foreground">
                <li>About Us</li>
                <li>Careers</li>
                <li>Legal</li>
                <li>Privacy</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border mt-8 pt-8 text-center text-muted-foreground">
            <p>&copy; 2024 InvestPro. All rights reserved. Securities offered through InvestPro Securities LLC.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
