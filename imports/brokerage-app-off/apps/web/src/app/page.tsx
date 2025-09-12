"use client";

export const dynamic = 'force-dynamic';

import Link from "next/link";
import React, { useState, useEffect } from 'react';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { ModernLandingPage } from '../components/ModernLandingPage';
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

type Page = 'landing' | 'login' | 'signup' | 'onboarding' | 'home' | 'portfolio' | 'robo-invest' | 'social' | 'learning' | 'settings' | 'stock-details' | 'trade' | 'funding' | 'withdraw' | 'transactions';

interface User {
  id: string;
  email: string;
  name: string;
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
    const savedUser = localStorage.getItem('tradepro_user');
    if (savedUser) {
      try {
        const userData = JSON.parse(savedUser);
        setAppState(prev => ({
          ...prev,
          user: userData,
          currentPage: 'home'
        }));
      } catch (error) {
        console.error('Error parsing saved user data:', error);
        localStorage.removeItem('tradepro_user');
      }
    }
  }, []);

  const handleLogin = (userData: User) => {
    localStorage.setItem('tradepro_user', JSON.stringify(userData));
    setAppState(prev => ({
      ...prev,
      user: userData,
      currentPage: userData.hasCompletedOnboarding ? 'home' : 'onboarding'
    }));
  };

  const handleCompleteOnboarding = () => {
    if (appState.user) {
      const updatedUser = { ...appState.user, hasCompletedOnboarding: true };
      localStorage.setItem('tradepro_user', JSON.stringify(updatedUser));
      setAppState(prev => ({
        ...prev,
        user: updatedUser,
        currentPage: 'home'
      }));
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('tradepro_user');
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

  const renderCurrentPage = () => {
    const { currentPage, user, selectedStock } = appState;
    
    switch (currentPage) {
      case 'landing':
        return <ModernLandingPage onNavigate={navigateTo} />;
      case 'login':
        return <ModernLogin onLogin={handleLogin} onNavigate={navigateTo} />;
      case 'signup':
        return <ModernSignup onSignup={handleLogin} onNavigate={navigateTo} />;
      case 'onboarding':
        if (!user) {
          return <ModernLandingPage onNavigate={navigateTo} />;
        }
        return <OnboardingFlow onComplete={handleCompleteOnboarding} onSkip={handleCompleteOnboarding} />;
      case 'home':
        if (!user) {
          return <ModernLandingPage onNavigate={navigateTo} />;
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
          return <ModernLandingPage onNavigate={navigateTo} />;
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
          return <ModernLandingPage onNavigate={navigateTo} />;
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
          return <ModernLandingPage onNavigate={navigateTo} />;
        }
        return <FundingPage onNavigate={(page: any) => navigateTo(page)} />;
      case 'withdraw':
        if (!user) {
          return <ModernLandingPage onNavigate={navigateTo} />;
        }
        return <WithdrawPage onNavigate={(page: any) => navigateTo(page)} />;
      case 'transactions':
        if (!user) {
          return <ModernLandingPage onNavigate={navigateTo} />;
        }
        return <TransactionsPage onNavigate={(page: any) => navigateTo(page)} />;
      default:
        return <ModernLandingPage onNavigate={navigateTo} />;
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
