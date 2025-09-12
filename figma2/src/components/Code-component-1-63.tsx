import React from 'react';
import { Button } from './ui/button';
import { Home, BarChart3, Eye, Compass, TrendingUp, User, Bell, MessageSquare, LogOut } from 'lucide-react';
import { HomePage } from './mobile/HomePage';
import { PortfolioPage } from './mobile/PortfolioPage';
import { WatchlistPage } from './mobile/WatchlistPage';
import { ExplorePage } from './mobile/ExplorePage';
import { TradePage } from './mobile/TradePage';

type MobilePage = 'home' | 'portfolio' | 'watchlist' | 'explore' | 'trade';

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
      case 'watchlist':
        return <WatchlistPage onStockClick={onStockClick} />;
      case 'explore':
        return <ExplorePage onStockClick={onStockClick} />;
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
      <header className="flex items-center justify-between p-4 bg-background border-b border-border">
        <div className="flex items-center gap-2">
          <User className="h-6 w-6" />
          <span className="text-sm">IBKR</span>
        </div>
        
        <div className="flex items-center">
          <TrendingUp className="h-8 w-8 text-red-600" />
          <span className="ml-2 text-xl">InteractiveBrokers</span>
        </div>
        
        <div className="flex items-center gap-3">
          <MessageSquare className="h-5 w-5 text-muted-foreground" />
          <div className="relative">
            <Bell className="h-5 w-5 text-muted-foreground" />
            <div className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full flex items-center justify-center">
              <span className="text-xs text-white">1</span>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onLogout}
            className="p-1"
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
          className="fixed bottom-20 right-4 h-12 w-12 rounded-full shadow-lg z-50 bg-blue-600 hover:bg-blue-700"
          onClick={() => onNavigate('trade')}
        >
          <TrendingUp className="h-5 w-5" />
        </Button>
      )}

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-background border-t border-border">
        <div className="flex items-center justify-around h-16 px-2">
          <Button
            variant="ghost"
            className={`flex flex-col items-center gap-1 h-auto py-2 px-3 ${
              isActive('home') ? 'text-blue-600' : 'text-muted-foreground'
            }`}
            onClick={() => onNavigate('home')}
          >
            <Home className="h-5 w-5" />
            <span className="text-xs">Home</span>
          </Button>
          
          <Button
            variant="ghost"
            className={`flex flex-col items-center gap-1 h-auto py-2 px-3 ${
              isActive('portfolio') ? 'text-blue-600' : 'text-muted-foreground'
            }`}
            onClick={() => onNavigate('portfolio')}
          >
            <BarChart3 className="h-5 w-5" />
            <span className="text-xs">Portfolio</span>
          </Button>
          
          <Button
            variant="ghost"
            className={`flex flex-col items-center gap-1 h-auto py-2 px-3 ${
              isActive('watchlist') ? 'text-blue-600' : 'text-muted-foreground'
            }`}
            onClick={() => onNavigate('watchlist')}
          >
            <Eye className="h-5 w-5" />
            <span className="text-xs">Watchlist</span>
          </Button>
          
          <Button
            variant="ghost"
            className={`flex flex-col items-center gap-1 h-auto py-2 px-3 ${
              isActive('explore') ? 'text-blue-600' : 'text-muted-foreground'
            }`}
            onClick={() => onNavigate('explore')}
          >
            <Compass className="h-5 w-5" />
            <span className="text-xs">Explore</span>
          </Button>
        </div>
      </nav>
    </div>
  );
}