'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart3,
  TrendingUp,
  PieChart,
  Newspaper,
  Star,
  Settings,
  X,
  Home,
  Activity,
  Target,
  Zap,
  Shield,
  BookOpen,
  Users,
  Bell,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

// Client-side only component to prevent hydration mismatch
function MarketStatusFooter() {
  const [currentTime, setCurrentTime] = useState('');
  const [marketStatus, setMarketStatus] = useState('Open');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    // Only set time on client after hydration
    const updateTime = () => {
      setCurrentTime(new Date().toLocaleTimeString());
    };

    updateTime();

    // Update time every second
    const interval = setInterval(updateTime, 1000);

    return () => clearInterval(interval);
  }, []);

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">Market Status</span>
          <Badge variant="success" size="sm">
            Open
          </Badge>
        </div>
        <div className="text-xs text-muted-foreground">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">Market Status</span>
        <Badge variant={marketStatus === 'Open' ? 'success' : 'warning'} size="sm">
          {marketStatus}
        </Badge>
      </div>
      <div className="text-xs text-muted-foreground">
        <p>Last Update: {currentTime}</p>
      </div>
    </div>
  );
}

const navigation = [
  { 
    name: 'Dashboard', 
    href: '/dashboard', 
    icon: Home,
    description: 'Overview & Analytics'
  },
  { 
    name: 'Trading', 
    href: '/dashboard/trading', 
    icon: Activity,
    description: 'Execute Trades',
    badge: 'Live'
  },
  { 
    name: 'Portfolio', 
    href: '/dashboard/portfolio', 
    icon: PieChart,
    description: 'Holdings & Performance'
  },
  { 
    name: 'Markets', 
    href: '/dashboard/markets', 
    icon: TrendingUp,
    description: 'Market Data & Analysis'
  },
  { 
    name: 'AI Trading', 
    href: '/dashboard/ai-trading', 
    icon: Zap,
    description: 'AI-Powered Trading',
    badge: 'New'
  },
  { 
    name: 'Robo Advisor', 
    href: '/dashboard/robo-advisor', 
    icon: Target,
    description: 'Automated Investing'
  },
  { 
    name: 'Watchlists', 
    href: '/dashboard/watchlists', 
    icon: Star,
    description: 'Track Your Stocks'
  },
  { 
    name: 'News', 
    href: '/dashboard/news', 
    icon: Newspaper,
    description: 'Market News & Updates'
  },
  { 
    name: 'Social', 
    href: '/dashboard/social', 
    icon: Users,
    description: 'Community & Social'
  },
  { 
    name: 'Education', 
    href: '/dashboard/education', 
    icon: BookOpen,
    description: 'Learn & Grow'
  },
  { 
    name: 'Settings', 
    href: '/dashboard/settings', 
    icon: Settings,
    description: 'Account & Preferences'
  },
];

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 w-72 bg-card border-r border-border transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 shadow-xl",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/80 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-primary-foreground font-bold text-lg">B</span>
            </div>
            <div>
              <span className="font-bold text-xl text-foreground">Invest Pro</span>
              <p className="text-xs text-muted-foreground">Professional Trading</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="md:hidden hover:bg-accent"
          >
            <X className="h-5 w-5 text-muted-foreground" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-2">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "group flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 hover:bg-accent hover:shadow-sm",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "text-muted-foreground hover:text-foreground"
                )}
                onClick={() => onClose()}
              >
                <item.icon className={cn(
                  "h-5 w-5 transition-colors",
                  isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"
                )} />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span>{item.name}</span>
                    {item.badge && (
                      <Badge variant="secondary" size="sm" className="text-xs">
                        {item.badge}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground group-hover:text-muted-foreground">
                    {item.description}
                  </p>
                </div>
                {isActive && (
                  <ChevronRight className="h-4 w-4 text-primary-foreground" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-6 border-t border-border bg-muted/30">
          <MarketStatusFooter />
        </div>
      </div>
    </>
  );
}