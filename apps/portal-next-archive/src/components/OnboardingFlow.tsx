"use client";
import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { 
  TrendingUp, 
  BarChart3, 
  Shield, 
  Smartphone, 
  Bell, 
  Eye,
  ArrowRight,
  ArrowLeft,
  Check
} from 'lucide-react';

interface OnboardingFlowProps {
  onComplete: () => void;
  onSkip: () => void;
}

const onboardingSteps = [
  {
    id: 1,
    title: "Welcome to TradePro",
    description: "Your professional trading platform with real-time market data and advanced analytics.",
    icon: TrendingUp,
    features: [
      "Real-time market data",
      "Advanced charting tools",
      "Professional trading interface"
    ]
  },
  {
    id: 2,
    title: "Track Your Portfolio",
    description: "Monitor your investments with comprehensive portfolio analytics and performance tracking.",
    icon: BarChart3,
    features: [
      "Portfolio performance tracking",
      "Asset allocation analysis",
      "Profit & loss insights"
    ]
  },
  {
    id: 3,
    title: "Stay Informed",
    description: "Get real-time notifications and market updates to never miss important opportunities.",
    icon: Bell,
    features: [
      "Price alerts & notifications",
      "Market news updates",
      "Custom watchlists"
    ]
  },
  {
    id: 4,
    title: "Secure & Mobile",
    description: "Trade with confidence using our secure platform optimized for mobile devices.",
    icon: Shield,
    features: [
      "Bank-level security",
      "Biometric authentication",
      "Mobile-first design"
    ]
  }
];

export function OnboardingFlow({ onComplete, onSkip }: OnboardingFlowProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < onboardingSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const step = onboardingSteps[currentStep];
  const IconComponent = step.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/20 flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center p-4">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 bg-gradient-to-br from-primary to-primary/70 rounded-lg flex items-center justify-center">
            <TrendingUp className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-semibold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            TradePro
          </span>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onSkip}
          className="text-muted-foreground hover:text-foreground"
        >
          Skip
        </Button>
      </div>

      {/* Progress Indicators */}
      <div className="flex justify-center gap-2 px-4 mb-8">
        {onboardingSteps.map((_, index) => (
          <div
            key={index}
            className={`h-2 rounded-full transition-all duration-300 ${
              index <= currentStep
                ? 'bg-primary w-8'
                : 'bg-muted w-2'
            }`}
          />
        ))}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-32">
        <Card className="w-full max-w-md border-0 shadow-xl bg-card/50 backdrop-blur-xl">
          <CardContent className="p-8 text-center">
            {/* Icon */}
            <div className="mx-auto w-20 h-20 bg-gradient-to-br from-primary/20 to-primary/10 rounded-2xl flex items-center justify-center mb-6">
              <IconComponent className="h-10 w-10 text-primary" />
            </div>

            {/* Title */}
            <h2 className="text-2xl font-semibold mb-4 text-foreground">
              {step.title}
            </h2>

            {/* Description */}
            <p className="text-muted-foreground mb-8 leading-relaxed">
              {step.description}
            </p>

            {/* Features */}
            <div className="space-y-3 mb-8">
              {step.features.map((feature, index) => (
                <div key={index} className="flex items-center gap-3 text-left">
                  <div className="h-5 w-5 bg-success/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <Check className="h-3 w-3 text-success" />
                  </div>
                  <span className="text-sm text-foreground">{feature}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-card/80 backdrop-blur-xl border-t border-border/50 p-4">
        <div className="flex justify-between items-center max-w-md mx-auto">
          <Button
            variant="ghost"
            onClick={handlePrevious}
            disabled={currentStep === 0}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Previous
          </Button>

          <span className="text-sm text-muted-foreground">
            {currentStep + 1} of {onboardingSteps.length}
          </span>

          <Button
            onClick={handleNext}
            className="flex items-center gap-2 bg-gradient-to-r from-primary to-primary/80"
          >
            {currentStep === onboardingSteps.length - 1 ? 'Get Started' : 'Next'}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}