"use client";

export const dynamic = 'force-dynamic';

import Link from "next/link";
import React, { useState, useEffect } from 'react';
import { ErrorBoundary } from '../components/ErrorBoundary';
import InvestProLandingPage from '../components/InvestProLandingPage';
import { ModernLogin } from '../components/ModernLogin';
import { ModernSignup } from '../components/ModernSignup';
import { MobileDashboard } from '../components/MobileDashboard';
import { StockDetails } from '../components/StockDetails';
import { OnboardingFlow } from '../components/OnboardingFlow';
import { FundingPage } from '../components/mobile/FundingPage';
import { WithdrawPage } from '../components/mobile/WithdrawPage';
import { TransactionsPage } from '../components/mobile/TransactionsPage';
import EnhancedNavigation from '@/components/ui/enhanced-navigation';
import EnhancedRiskManagementDashboard from '@/components/enhanced/RiskManagementDashboard';
import { PricingPage } from '../components/PricingPage';
import { StocksETFsPage } from '../components/StocksETFsPage';
import { MutualFundsPage } from '../components/MutualFundsPage';
import { RoboAdvisorPage } from '../components/RoboAdvisorPage';
import { PrivateWealthPage } from '../components/PrivateWealthPage';
import { BlogPage } from '../components/BlogPage';
import { RetirementCalculatorPage } from '../components/RetirementCalculatorPage';

type Page = 'landing' | 'login' | 'signup' | 'onboarding' | 'home' | 'portfolio' | 'robo-invest' | 'social' | 'learning' | 'settings' | 'stock-details' | 'trade' | 'funding' | 'withdraw' | 'transactions' | 'pricing' | 'mutual-funds' | 'stocks-etfs' | 'robo-advisor' | 'private-wealth' | 'blog' | 'retirement-calculator';

interface User {
  id: string;
  email: string;
  name: string;
  phone: string;
  hasCompletedOnboarding?: boolean;
}

export default function App() {
  const [appState, setAppState] = useState({
    currentPage: 'landing' as Page,
    user: null as User | null,
    selectedStock: ''
  });

  // Check for existing session
  useEffect(() => {
    const checkAuthStatus = async () => {
      const savedUser = localStorage.getItem('investpro_user');
      const authToken = localStorage.getItem('authToken');
      
      if (savedUser && authToken) {
        try {
          const userData = JSON.parse(savedUser);
          setAppState(prev => ({
            ...prev,
            user: userData,
            currentPage: userData.hasCompletedOnboarding ? 'home' : 'onboarding'
          }));
        } catch (error) {
          console.error('Error parsing saved user data:', error);
          localStorage.removeItem('investpro_user');
          localStorage.removeItem('authToken');
        }
      }
    };
    
    checkAuthStatus();
  }, []);

  const handleLogin = (userData: User) => {
    localStorage.setItem('investpro_user', JSON.stringify(userData));
    setAppState(prev => ({
      ...prev,
      user: userData,
      currentPage: userData.hasCompletedOnboarding ? 'home' : 'onboarding'
    }));
  };

  const handleCompleteOnboarding = () => {
    if (appState.user) {
      const updatedUser = { ...appState.user, hasCompletedOnboarding: true };
      localStorage.setItem('investpro_user', JSON.stringify(updatedUser));
      setAppState(prev => ({
        ...prev,
        user: updatedUser,
        currentPage: 'home'
      }));
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('investpro_user');
    localStorage.removeItem('authToken');
    setAppState(prev => ({
      ...prev,
      user: null,
      currentPage: 'landing'
    }));
  };

  const handleStockClick = (symbol: string) => {
    setAppState(prev => ({
      ...prev,
      selectedStock: symbol,
      currentPage: 'stock-details'
    }));
  };

  const navigateTo = (page: Page) => {
    setAppState(prev => ({
      ...prev,
      currentPage: page
    }));
  };

  const handleNavigation = (page: Page) => {
    navigateTo(page);
  };

  const handleStringNavigate = (page: string) => {
    navigateTo(page as Page);
  };

  const renderCurrentPage = () => {
    const { currentPage, user, selectedStock } = appState;
    
    switch (currentPage) {
      case 'landing':
        return <InvestProLandingPage onNavigate={handleStringNavigate} />;
      case 'login':
        return <ModernLogin onLogin={handleLogin} onNavigate={navigateTo} />;
      case 'signup':
        return <ModernSignup onSignup={handleLogin} onNavigate={navigateTo} />;
      case 'onboarding':
        if (!user) {
          return <InvestProLandingPage onNavigate={handleStringNavigate} />;
        }
        return <OnboardingFlow onComplete={handleCompleteOnboarding} onSkip={handleCompleteOnboarding} />;
      case 'home':
        if (!user) {
          return <InvestProLandingPage onNavigate={handleStringNavigate} />;
        }
        return (
          <div className="min-h-screen" style={{backgroundColor: 'var(--color-primary-50)'}}>
            <EnhancedNavigation currentPath="/dashboard" />
            <div className="lg:pl-64">
              <EnhancedRiskManagementDashboard />
            </div>
          </div>
        );
      case 'portfolio':
      case 'robo-invest':
      case 'social':
      case 'learning':
      case 'settings':
      case 'trade':
        if (!user) {
          return <InvestProLandingPage onNavigate={handleStringNavigate} />;
        }
        return (
          <MobileDashboard 
            user={user}
            currentPage={currentPage}
            onLogout={handleLogout}
            onStockClick={handleStockClick}
            onNavigate={navigateTo}
          />
        );
      case 'stock-details':
        if (!user) {
          return <InvestProLandingPage onNavigate={handleStringNavigate} />;
        }
        return (
          <StockDetails
            symbol={selectedStock}
            onNavigate={() => navigateTo('home')}
            onBack={() => navigateTo('home')}
          />
        );
      case 'funding':
        if (!user) {
          return <InvestProLandingPage onNavigate={handleStringNavigate} />;
        }
        return <FundingPage onNavigate={(page: any) => navigateTo(page)} />;
      case 'withdraw':
        if (!user) {
          return <InvestProLandingPage onNavigate={handleStringNavigate} />;
        }
        return <WithdrawPage onNavigate={(page: any) => navigateTo(page)} />;
      case 'transactions':
        if (!user) {
          return <InvestProLandingPage onNavigate={handleStringNavigate} />;
        }
        return <TransactionsPage onNavigate={(page: any) => navigateTo(page)} />;
      case 'pricing':
        return <PricingPage onNavigate={handleStringNavigate} />;
      case 'stocks-etfs':
        return <StocksETFsPage onNavigate={handleStringNavigate} />;
      case 'mutual-funds':
        return <MutualFundsPage onNavigate={handleStringNavigate} />;
      case 'robo-advisor':
        return <RoboAdvisorPage onNavigate={handleStringNavigate} />;
      case 'private-wealth':
        return <PrivateWealthPage onNavigate={handleStringNavigate} />;
      case 'blog':
        return <BlogPage onNavigate={handleStringNavigate} />;
      case 'retirement-calculator':
        return <RetirementCalculatorPage onNavigate={handleStringNavigate} />;
      default:
        return <InvestProLandingPage onNavigate={handleStringNavigate} />;
    }
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-background text-foreground antialiased">
        {renderCurrentPage()}
      </div>
    </ErrorBoundary>
  );
}
