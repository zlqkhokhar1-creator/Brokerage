"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

const navigationSections = [
  {
    title: 'Overview',
    items: [
      { name: 'Dashboard', href: '/dashboard', icon: '📊', shortcut: '⌘D' },
      { name: 'AI Insights', href: '/ai-insights', icon: '🧠', badge: 'AI', shortcut: '⌘I' },
    ]
  },
  {
    title: 'Portfolio',
    items: [
      { name: 'Overview', href: '/portfolio', icon: '💼', shortcut: '⌘P' },
      { name: 'Performance', href: '/portfolio/performance', icon: '📈', shortcut: '⌘⇧P' },
      { name: 'Allocation', href: '/portfolio/allocation', icon: '🎯', shortcut: '⌘A' },
      { name: 'Analytics', href: '/portfolio-analytics', icon: '⚡', badge: 'Pro', shortcut: '⌘⇧A' },
    ]
  },
  {
    title: 'Trading',
    items: [
      { name: 'Trade', href: '/trading', icon: '💰', shortcut: '⌘T' },
      { name: 'Advanced Orders', href: '/advanced-orders', icon: '⚡', badge: 'New', shortcut: '⌘⇧O' },
      { name: 'Options', href: '/options', icon: '📊', shortcut: '⌘O' },
    ]
  },
  {
    title: 'Markets',
    items: [
      { name: 'Market Data', href: '/markets', icon: '🌐', shortcut: '⌘M' },
      { name: 'Screener', href: '/screener', icon: '🔍', shortcut: '⌘S' },
      { name: 'International', href: '/international-markets', icon: '🌍', shortcut: '⌘⇧I' },
      { name: 'News', href: '/news', icon: '📰', shortcut: '⌘N' },
    ]
  },
  {
    title: 'Tools',
    items: [
      { name: 'Risk Management', href: '/risk-management', icon: '🛡️', shortcut: '⌘R' },
      { name: 'Compliance', href: '/compliance', icon: '⚠️', shortcut: '⌘C' },
      { name: 'Social Trading', href: '/social-trading', icon: '👥', badge: 'Beta', shortcut: '⌘⇧S' },
      { name: 'Robo-Advisor', href: '/robo-advisor', icon: '🤖', badge: 'New', shortcut: '⌘⇧A' },
    ]
  }
];

const bottomItems = [
  { name: 'Payments', href: '/pricing', icon: '💳' },
  { name: 'Settings', href: '/settings', icon: '⚙️' },
];

export function SimpleSidebar() {
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
            <span className="font-semibold text-lg bg-gradient-to-r from-teal-600 to-teal-400 bg-clip-text text-transparent">
              InvestPro
            </span>
          </div>
        )}
        
        {!isMobile && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="h-8 w-8 p-0 hover:bg-accent/10"
          >
            {isCollapsed ? '→' : '←'}
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
          >
            <span className="mr-2">⌘</span>
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
                <span>{expandedSections.includes(section.title) ? '▲' : '▼'}</span>
              </Button>
            )}
            
            {(expandedSections.includes(section.title) || isCollapsed) && (
              <div className="space-y-1">
                {section.items.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                  
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
                      <span className={`text-lg ${isCollapsed && !isMobile ? '' : 'mr-3'}`}>
                        {item.icon}
                      </span>
                      
                      {(!isCollapsed || isMobile) && (
                        <div className="flex items-center justify-between flex-1 min-w-0">
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
                        </div>
                      )}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </nav>

      <Separator className="mx-4" />

      {/* Bottom Section */}
      <div className="p-3 space-y-2">
        {bottomItems.map((item) => {
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
              <span className={`text-lg ${isCollapsed && !isMobile ? '' : 'mr-3'}`}>
                {item.icon}
              </span>
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
                  <span className="text-white text-sm">👤</span>
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
              <span className={`text-lg ${isCollapsed && !isMobile ? '' : 'mr-2'}`}>🚪</span>
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
        {showMobile && (
          <>
            <div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
              onClick={() => setShowMobile(false)}
            />
            <div className="fixed left-0 top-0 h-full w-80 z-50 lg:hidden">
              {sidebarContent}
            </div>
          </>
        )}
        
        {/* Mobile Toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowMobile(true)}
          className="lg:hidden fixed top-4 left-4 z-30 bg-card/80 backdrop-blur-sm border border-border/50 shadow-sm"
        >
          📊
        </Button>
      </>
    );
  }

  return (
    <div
      className={`hidden lg:block fixed left-0 top-0 h-full z-30 transition-all duration-300 ${isCollapsed ? 'w-18' : 'w-70'}`}
      style={{ width: isCollapsed ? '72px' : '280px' }}
    >
      {sidebarContent}
    </div>
  );
}