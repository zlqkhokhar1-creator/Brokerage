"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from '@/components/MotionWrappers';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  BarChart3, TrendingUp, DollarSign, Globe, Bell, Brain, 
  Users, Shield, CreditCard, Settings, Search, Command,
  ChevronLeft, ChevronRight, LogOut, User, Plus, Zap,
  PieChart, LineChart, Activity, Briefcase, Target,
  AlertTriangle, Sparkles, ChevronDown, ChevronUp
} from 'lucide-react';

const navigationSections = [
  {
    title: 'Overview',
    items: [
      { name: 'Dashboard', href: '/dashboard', icon: BarChart3, badge: null, shortcut: '⌘D' },
      { name: 'AI Insights', href: '/ai-insights', icon: Brain, badge: 'AI', shortcut: '⌘I' },
    ]
  },
  {
    title: 'Portfolio',
    items: [
      { name: 'Overview', href: '/portfolio', icon: PieChart, badge: null, shortcut: '⌘P' },
      { name: 'Performance', href: '/portfolio/performance', icon: LineChart, badge: null, shortcut: '⌘⇧P' },
      { name: 'Allocation', href: '/portfolio/allocation', icon: Target, badge: null, shortcut: '⌘A' },
      { name: 'Analytics', href: '/portfolio-analytics', icon: Activity, badge: 'Pro', shortcut: '⌘⇧A' },
    ]
  },
  {
    title: 'Trading',
    items: [
      { name: 'Trade', href: '/trade/stocks-etfs', icon: DollarSign, badge: null, shortcut: '⌘T' },
      { name: 'Advanced Orders', href: '/advanced-orders', icon: Zap, badge: 'New', shortcut: '⌘⇧O' },
      { name: 'Options', href: '/options', icon: Briefcase, badge: null, shortcut: '⌘O' },
      { name: 'Trading History', href: '/trading', icon: TrendingUp, badge: null, shortcut: '⌘H' },
    ]
  },
  {
    title: 'Markets',
    items: [
      { name: 'Market Data', href: '/markets', icon: Globe, badge: null, shortcut: '⌘M' },
      { name: 'Screener', href: '/screener', icon: Search, badge: null, shortcut: '⌘S' },
      { name: 'International', href: '/international-markets', icon: Globe, badge: null, shortcut: '⌘⇧I' },
      { name: 'News', href: '/news', icon: Bell, badge: null, shortcut: '⌘N' },
    ]
  },
  {
    title: 'Tools',
    items: [
      { name: 'Risk Management', href: '/risk-management', icon: Shield, badge: null, shortcut: '⌘R' },
      { name: 'Compliance', href: '/compliance', icon: AlertTriangle, badge: null, shortcut: '⌘C' },
      { name: 'Social Trading', href: '/social-trading', icon: Users, badge: 'Beta', shortcut: '⌘⇧S' },
      { name: 'AI Recommendations', href: '/ai-recommendations', icon: Sparkles, badge: 'AI', shortcut: '⌘⇧R' },
    ]
  }
];

const bottomItems = [
  { name: 'Payments', href: '/pricing', icon: CreditCard, badge: null },
  { name: 'Settings', href: '/settings', icon: Settings, badge: null },
];

interface ResponsiveSidebarProps {
  className?: string;
}

export function ResponsiveSidebar({ className }: ResponsiveSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [expandedSections, setExpandedSections] = useState<string[]>(['Overview', 'Portfolio']);
  const [isMobile, setIsMobile] = useState(false);
  const [showMobile, setShowMobile] = useState(false);
  
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (!mobile) setShowMobile(false);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleSection = (title: string) => {
    setExpandedSections(prev => 
      prev.includes(title) 
        ? prev.filter(s => s !== title)
        : [...prev, title]
    );
  };

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const sidebarContent = (
    <div className="flex h-full flex-col bg-card/80 backdrop-blur-xl border-r border-border/50">
      {/* Header */}
      <div className={`flex items-center px-4 py-4 border-b border-border/50 ${isCollapsed && !isMobile ? 'justify-center' : 'justify-between'}`}>
        {(!isCollapsed || isMobile) && (
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-teal-400 to-teal-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">IP</span>
            </div>
            <motion.div
              initial={false}
              animate={{ opacity: isCollapsed && !isMobile ? 0 : 1 }}
              className="overflow-hidden"
            >
              <span className="font-semibold text-lg bg-gradient-to-r from-teal-600 to-teal-400 bg-clip-text text-transparent">
                InvestPro
              </span>
            </motion.div>
          </div>
        )}
        
        {!isMobile && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="h-8 w-8 p-0 hover:bg-accent/10"
          >
            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        )}
      </div>

      {/* Command Palette Hint */}
      {(!isCollapsed || isMobile) && (
        <div className="px-4 py-2">
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start text-muted-foreground border-dashed hover:border-solid transition-all"
            onClick={() => {
              // TODO: Open command palette
              console.log('Open command palette');
            }}
          >
            <Command className="mr-2 h-4 w-4" />
            <span className="flex-1 text-left">Quick actions...</span>
            <Badge variant="outline" className="text-xs">⌘K</Badge>
          </Button>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-3 py-2 overflow-y-auto">
        {navigationSections.map((section) => (
          <div key={section.title} className="mb-4">
            {(!isCollapsed || isMobile) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleSection(section.title)}
                className="w-full justify-between mb-2 font-medium text-xs uppercase tracking-wide text-muted-foreground hover:text-foreground"
              >
                <span>{section.title}</span>
                {expandedSections.includes(section.title) ? (
                  <ChevronUp className="h-3 w-3" />
                ) : (
                  <ChevronDown className="h-3 w-3" />
                )}
              </Button>
            )}
            
            <AnimatePresence>
              {(expandedSections.includes(section.title) || isCollapsed) && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-1 overflow-hidden"
                >
                  {section.items.map((item) => {
                    const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                    const Icon = item.icon;
                    
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`group relative flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-all hover:bg-accent/10 ${
                          isActive 
                            ? 'bg-accent/20 text-accent-foreground shadow-sm border border-accent/20' 
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                        onClick={() => isMobile && setShowMobile(false)}
                      >
                        <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-accent' : ''} ${isCollapsed && !isMobile ? '' : 'mr-3'}`} />
                        
                        {(!isCollapsed || isMobile) && (
                          <motion.div
                            initial={false}
                            animate={{ opacity: 1, x: 0 }}
                            className="flex items-center justify-between flex-1 min-w-0"
                          >
                            <span className="truncate">{item.name}</span>
                            <div className="flex items-center space-x-1">
                              {item.badge && (
                                <Badge 
                                  variant={item.badge === 'AI' ? 'default' : item.badge === 'New' ? 'destructive' : 'secondary'} 
                                  className="text-xs h-5"
                                >
                                  {item.badge}
                                </Badge>
                              )}
                              {item.shortcut && (
                                <Badge variant="outline" className="text-xs h-5 hidden xl:block">
                                  {item.shortcut}
                                </Badge>
                              )}
                            </div>
                          </motion.div>
                        )}
                        
                        {isActive && (
                          <motion.div
                            className="absolute left-0 w-0.5 h-6 bg-accent rounded-r-full"
                            layoutId="activeIndicator"
                            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                          />
                        )}
                      </Link>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </nav>

      <Separator className="mx-4" />

      {/* Bottom Section */}
      <div className="p-3 space-y-2">
        {bottomItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-all hover:bg-accent/10 ${
                isActive 
                  ? 'bg-accent/20 text-accent-foreground' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className={`h-4 w-4 shrink-0 ${isCollapsed && !isMobile ? '' : 'mr-3'}`} />
              {(!isCollapsed || isMobile) && <span>{item.name}</span>}
            </Link>
          );
        })}
      </div>

      <Separator className="mx-4" />

      {/* User Section */}
      <div className="p-3">
        {user && (
          <div className={`space-y-2 ${isCollapsed && !isMobile ? 'flex flex-col items-center' : ''}`}>
            {(!isCollapsed || isMobile) && (
              <div className="flex items-center space-x-3 px-3 py-2">
                <div className="w-8 h-8 bg-gradient-to-br from-teal-400 to-teal-600 rounded-full flex items-center justify-center">
                  <User className="h-4 w-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {user.firstName} {user.lastName}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {user.email}
                  </p>
                </div>
              </div>
            )}
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className={`${isCollapsed && !isMobile ? 'w-8 h-8 p-0' : 'w-full justify-start'} text-muted-foreground hover:text-destructive hover:bg-destructive/10`}
            >
              <LogOut className={`h-4 w-4 ${isCollapsed && !isMobile ? '' : 'mr-2'}`} />
              {(!isCollapsed || isMobile) && <span>Sign out</span>}
            </Button>
          </div>
        )}
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <>
        {/* Mobile Overlay */}
        <AnimatePresence>
          {showMobile && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
                onClick={() => setShowMobile(false)}
              />
              <motion.div
                initial={{ x: -300 }}
                animate={{ x: 0 }}
                exit={{ x: -300 }}
                transition={{ type: "spring", bounce: 0, duration: 0.4 }}
                className="fixed left-0 top-0 h-full w-80 z-50 lg:hidden"
              >
                {sidebarContent}
              </motion.div>
            </>
          )}
        </AnimatePresence>
        
        {/* Mobile Toggle Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowMobile(true)}
          className="lg:hidden fixed top-4 left-4 z-30 bg-card/80 backdrop-blur-sm border border-border/50 shadow-sm"
        >
          <BarChart3 className="h-4 w-4" />
        </Button>
      </>
    );
  }

  return (
    <motion.div
      animate={{ width: isCollapsed ? 72 : 280 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className={`hidden lg:block fixed left-0 top-0 h-full z-30 ${className}`}
    >
      {sidebarContent}
    </motion.div>
  );
}
