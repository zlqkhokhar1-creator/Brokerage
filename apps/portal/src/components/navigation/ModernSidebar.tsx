"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  BarChart3, TrendingUp, DollarSign, Globe, Bell, Brain,
  Users, Shield, CreditCard, Settings, Search, Command,
  ChevronLeft, ChevronRight, LogOut, User, Plus, Zap,
  PieChart, LineChart, Activity, Briefcase, Target,
  AlertTriangle, Sparkles, Menu, X, Home, Wallet
} from 'lucide-react';

const navigationSections = [
  {
    title: 'Overview',
    items: [
      { name: 'Dashboard', href: '/dashboard', icon: Home, badge: null, shortcut: '⌘D' },
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
      { name: 'Orders', href: '/orders', icon: Briefcase, badge: null, shortcut: '⌘O' },
      { name: 'History', href: '/trading', icon: TrendingUp, badge: null, shortcut: '⌘H' },
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
      { name: 'Robo-Advisor', href: '/robo-advisor', icon: Sparkles, badge: 'AI', shortcut: '⌘⇧A' },
    ]
  }
];

const bottomItems = [
  { name: 'Payments', href: '/pricing', icon: CreditCard, badge: null },
  { name: 'Settings', href: '/settings', icon: Settings, badge: null },
];

interface ModernSidebarProps {
  className?: string;
}

export function ModernSidebar({ className }: ModernSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [expandedSections, setExpandedSections] = useState<string[]>(['Overview']);
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
    <div className="sidebar-modern">
      {/* Header */}
      <div className="sidebar-header-modern">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-lg">I</span>
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                InvestPro
              </span>
              <span className="text-xs text-muted-foreground">AI-Powered Trading</span>
            </div>
          </div>
          {!isMobile && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="h-8 w-8 p-0 hover:bg-primary/10"
            >
              {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
          )}
        </div>
      </div>

      {/* Command Palette */}
      <div className="px-4 pb-4">
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start text-muted-foreground border-border/50 hover:border-primary/50 bg-card/50"
          onClick={() => {
            console.log('Open command palette');
          }}
        >
          <Command className="mr-2 h-4 w-4" />
          <span className="flex-1 text-left">Quick actions...</span>
          <Badge variant="outline" className="text-xs">⌘K</Badge>
        </Button>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav-modern">
        {navigationSections.map((section) => (
          <div key={section.title} className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {section.title}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleSection(section.title)}
                className="h-6 w-6 p-0 hover:bg-primary/10"
              >
                {expandedSections.includes(section.title) ? '−' : '+'}
              </Button>
            </div>

            <AnimatePresence>
              {expandedSections.includes(section.title) && (
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
                        className={`sidebar-nav-item-modern group ${
                          isActive ? 'active bg-primary/20 text-primary border-l-2 border-primary' : ''
                        }`}
                        onClick={() => isMobile && setShowMobile(false)}
                      >
                        <Icon className={`h-5 w-5 shrink-0 ${isActive ? 'text-primary' : ''}`} />
                        <span className="truncate">{item.name}</span>
                        {item.badge && (
                          <Badge
                            variant={item.badge === 'AI' ? 'default' : item.badge === 'New' ? 'destructive' : 'secondary'}
                            className="text-xs h-5 ml-auto"
                          >
                            {item.badge}
                          </Badge>
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

      <Separator className="mx-4 opacity-50" />

      {/* Bottom Section */}
      <div className="p-4 space-y-2">
        {bottomItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar-nav-item-modern ${
                isActive ? 'active bg-primary/20 text-primary' : ''
              }`}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </div>

      <Separator className="mx-4 opacity-50" />

      {/* User Section */}
      <div className="p-4">
        {user && (
          <div className="space-y-3">
            <div className="flex items-center space-x-3 p-3 rounded-lg bg-card-secondary">
              <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center">
                <User className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate text-foreground">
                  {user.firstName} {user.lastName}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {user.email}
                </p>
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="w-full justify-start text-muted-foreground hover:text-error hover:bg-error/10"
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>Sign out</span>
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
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 lg:hidden"
                onClick={() => setShowMobile(false)}
              />
              <motion.div
                initial={{ x: -320 }}
                animate={{ x: 0 }}
                exit={{ x: -320 }}
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
          className="lg:hidden fixed top-4 left-4 z-30 bg-card/80 backdrop-blur-sm border border-border/50 shadow-lg hover:bg-card"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </>
    );
  }

  return (
    <motion.div
      animate={{ width: isCollapsed ? 80 : 320 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className={`hidden lg:block fixed left-0 top-0 h-full z-30 ${className}`}
    >
      {sidebarContent}
    </motion.div>
  );
}