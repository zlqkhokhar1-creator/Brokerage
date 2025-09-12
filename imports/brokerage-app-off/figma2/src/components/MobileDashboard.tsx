import React from 'react';
import { Button } from './ui/button';
import { Home, BarChart3, Bot, Users, Settings, TrendingUp, User, Bell, MessageSquare, LogOut, GraduationCap } from 'lucide-react';
import { HomePage } from './mobile/HomePage';
import { PortfolioPage } from './mobile/PortfolioPage';
import { RoboInvestPage } from './mobile/RoboInvestPage';
import { SocialPage } from './mobile/SocialPage';
import { SettingsPage } from './mobile/SettingsPage';
import { TradePage } from './mobile/TradePage';
import { GamifiedLearningHub } from './mobile/GamifiedLearningHub';

type MobilePage = 'home' | 'portfolio' | 'robo-invest' | 'social' | 'learning' | 'settings' | 'trade';

interface MobileDashboardProps {
  user: { id: string; email: string; name: string };
  currentPage: MobilePage;
  onLogout: () => void;
  onStockClick: (symbol: string) => void;
  onNavigate: (page: MobilePage) => void;
}

export function MobileDashboard({ user, currentPage, onLogout, onStockClick, onNavigate }: MobileDashboardProps) {
  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'home':
        return <HomePage onStockClick={onStockClick} onNavigate={onNavigate} />;
      case 'portfolio':
        return <PortfolioPage onStockClick={onStockClick} />;
      case 'robo-invest':
        return <RoboInvestPage onNavigate={onNavigate} />;
      case 'social':
        return <SocialPage onStockClick={onStockClick} />;
      case 'learning':
        return <GamifiedLearningHub onNavigate={onNavigate} />;
      case 'settings':
        return <SettingsPage user={user} onLogout={onLogout} onNavigate={onNavigate} />;
      case 'trade':
        return <TradePage onNavigate={onNavigate} />;
      default:
        return <HomePage onStockClick={onStockClick} onNavigate={onNavigate} />;
    }
  };

  const isActive = (page: string) => currentPage === page;

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="flex items-center justify-between p-4 bg-card/50 backdrop-blur-xl border-b border-border/50 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 bg-gradient-to-br from-primary to-primary/70 rounded-lg flex items-center justify-center">
            <TrendingUp className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <span className="font-semibold text-sm bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">TradePro</span>
            <div className="text-xs text-muted-foreground">Welcome back, {user.name}</div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" className="relative">
            <MessageSquare className="h-5 w-5 text-muted-foreground" />
          </Button>
          <Button variant="ghost" size="sm" className="relative">
            <Bell className="h-5 w-5 text-muted-foreground" />
            <div className="absolute -top-1 -right-1 h-3 w-3 bg-primary rounded-full animate-pulse" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => onNavigate('settings')}
            className="text-muted-foreground hover:text-destructive"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pb-20">
        {renderCurrentPage()}
      </main>

      {/* Floating Trade Button */}
      {currentPage !== 'trade' && (
        <Button
          className="fixed bottom-20 right-4 h-14 w-14 rounded-full shadow-2xl z-50 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 transition-all duration-200 hover:scale-105 border-2 border-background"
          onClick={() => onNavigate('trade')}
        >
          <TrendingUp className="h-6 w-6" />
        </Button>
      )}

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-card/80 backdrop-blur-xl border-t border-border/50 shadow-lg">
        <div className="flex items-center justify-around h-16 px-2">
          <Button
            variant="ghost"
            className={`flex flex-col items-center gap-1 h-auto py-2 px-3 transition-colors rounded-lg ${
              isActive('home') ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => onNavigate('home')}
          >
            <Home className="h-5 w-5" />
            <span className="text-xs">Home</span>
          </Button>
          
          <Button
            variant="ghost"
            className={`flex flex-col items-center gap-1 h-auto py-2 px-3 transition-colors rounded-lg ${
              isActive('portfolio') ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => onNavigate('portfolio')}
          >
            <BarChart3 className="h-5 w-5" />
            <span className="text-xs">Portfolio</span>
          </Button>
          
          <Button
            variant="ghost"
            className={`flex flex-col items-center gap-1 h-auto py-2 px-3 transition-colors rounded-lg ${
              isActive('robo-invest') ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => onNavigate('robo-invest')}
          >
            <Bot className="h-5 w-5" />
            <span className="text-xs">Robo</span>
          </Button>
          
          <Button
            variant="ghost"
            className={`flex flex-col items-center gap-1 h-auto py-2 px-3 transition-colors rounded-lg ${
              isActive('social') ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => onNavigate('social')}
          >
            <Users className="h-5 w-5" />
            <span className="text-xs">Social</span>
          </Button>
          
          <Button
            variant="ghost"
            className={`flex flex-col items-center gap-1 h-auto py-2 px-3 transition-colors rounded-lg ${
              isActive('learning') ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => onNavigate('learning')}
          >
            <GraduationCap className="h-5 w-5" />
            <span className="text-xs">Learn</span>
          </Button>
        </div>
      </nav>
    </div>
  );
}