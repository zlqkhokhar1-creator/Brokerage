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
    <div className="flex flex-col h-screen gradient-dashboard">
      {/* Enhanced Header with Professional Deep Ocean Blue */}
      <header className="nav-professional sticky top-0 z-40 flex items-center justify-between p-4 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 gradient-primary rounded-xl flex items-center justify-center shadow-lg">
            <TrendingUp className="h-6 w-6 text-white" />
          </div>
          <div>
            <span className="font-bold text-base text-soft-cream">TradePro</span>
            <div className="text-xs text-soft-cream/80 font-medium">Welcome back, {user.name}</div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon-sm" className="relative hover:bg-white/10 rounded-full text-soft-cream">
            <MessageSquare className="h-4 w-4" />
            <div className="absolute -top-1 -right-1 h-2 w-2 bg-coral rounded-full animate-pulse" />
          </Button>
          <Button variant="ghost" size="icon-sm" className="relative hover:bg-white/10 rounded-full text-soft-cream">
            <Bell className="h-4 w-4" />
            <div className="absolute -top-1 -right-1 h-3 w-3 bg-neon-yellow rounded-full animate-pulse border-2 border-deep-ocean" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon-sm" 
            onClick={() => onNavigate('settings')}
            className="text-soft-cream hover:text-garnet hover:bg-garnet/10 rounded-full transition-all duration-200"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Enhanced Main Content with Better Scroll */}
      <main className="flex-1 overflow-y-auto pb-20 scroll-smooth">
        <div className="min-h-full">
          {renderCurrentPage()}
        </div>
      </main>

      {/* Enhanced Floating Trade Button with Verdant Green */}
      {currentPage !== 'trade' && (
        <Button
          variant="trading"
          className="fixed bottom-24 right-6 h-16 w-16 rounded-2xl shadow-2xl z-50 hover:scale-110 transition-all duration-300 border-4 border-soft-cream/20 floating-element"
          onClick={() => onNavigate('trade')}
        >
          <TrendingUp className="h-7 w-7" />
        </Button>
      )}

      {/* Enhanced Bottom Navigation with Professional Styling */}
      <nav className="fixed bottom-0 left-0 right-0 nav-professional border-t border-mocha-mousse/20 shadow-2xl z-30">
        <div className="flex items-center justify-around h-20 px-4 py-2">
          <Button
            variant="ghost"
            className={`flex flex-col items-center gap-1 h-auto py-2 px-4 transition-all duration-300 rounded-2xl min-w-0 flex-1 max-w-20 ${
              isActive('home') 
                ? 'text-mocha-mousse bg-mocha-mousse/15 shadow-lg border border-mocha-mousse/30' 
                : 'text-soft-cream/70 hover:text-soft-cream hover:bg-white/10'
            }`}
            onClick={() => onNavigate('home')}
          >
            <Home className={`h-5 w-5 transition-all duration-300 ${isActive('home') ? 'scale-110' : ''}`} />
            <span className="text-xs font-medium truncate">Home</span>
          </Button>
          
          <Button
            variant="ghost"
            className={`flex flex-col items-center gap-1 h-auto py-2 px-4 transition-all duration-300 rounded-2xl min-w-0 flex-1 max-w-20 ${
              isActive('portfolio') 
                ? 'text-mocha-mousse bg-mocha-mousse/15 shadow-lg border border-mocha-mousse/30' 
                : 'text-soft-cream/70 hover:text-soft-cream hover:bg-white/10'
            }`}
            onClick={() => onNavigate('portfolio')}
          >
            <BarChart3 className={`h-5 w-5 transition-all duration-300 ${isActive('portfolio') ? 'scale-110' : ''}`} />
            <span className="text-xs font-medium truncate">Portfolio</span>
          </Button>
          
          <Button
            variant="ghost"
            className={`flex flex-col items-center gap-1 h-auto py-2 px-4 transition-all duration-300 rounded-2xl min-w-0 flex-1 max-w-20 ${
              isActive('robo-invest') 
                ? 'text-mocha-mousse bg-mocha-mousse/15 shadow-lg border border-mocha-mousse/30' 
                : 'text-soft-cream/70 hover:text-soft-cream hover:bg-white/10'
            }`}
            onClick={() => onNavigate('robo-invest')}
          >
            <Bot className={`h-5 w-5 transition-all duration-300 ${isActive('robo-invest') ? 'scale-110' : ''}`} />
            <span className="text-xs font-medium truncate">Robo</span>
          </Button>
          
          <Button
            variant="ghost"
            className={`flex flex-col items-center gap-1 h-auto py-2 px-4 transition-all duration-300 rounded-2xl min-w-0 flex-1 max-w-20 ${
              isActive('social') 
                ? 'text-mocha-mousse bg-mocha-mousse/15 shadow-lg border border-mocha-mousse/30' 
                : 'text-soft-cream/70 hover:text-soft-cream hover:bg-white/10'
            }`}
            onClick={() => onNavigate('social')}
          >
            <Users className={`h-5 w-5 transition-all duration-300 ${isActive('social') ? 'scale-110' : ''}`} />
            <span className="text-xs font-medium truncate">Social</span>
          </Button>
          
          <Button
            variant="ghost"
            className={`flex flex-col items-center gap-1 h-auto py-2 px-4 transition-all duration-300 rounded-2xl min-w-0 flex-1 max-w-20 ${
              isActive('learning') 
                ? 'text-mocha-mousse bg-mocha-mousse/15 shadow-lg border border-mocha-mousse/30' 
                : 'text-soft-cream/70 hover:text-soft-cream hover:bg-white/10'
            }`}
            onClick={() => onNavigate('learning')}
          >
            <GraduationCap className={`h-5 w-5 transition-all duration-300 ${isActive('learning') ? 'scale-110' : ''}`} />
            <span className="text-xs font-medium truncate">Learn</span>
          </Button>
        </div>
      </nav>
    </div>
  );
}