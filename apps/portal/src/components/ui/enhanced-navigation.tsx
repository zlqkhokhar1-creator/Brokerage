"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Home,
  TrendingUp,
  PieChart,
  Bell,
  Search,
  Settings,
  User,
  ChevronDown,
  Menu,
  X,
  Shield,
  BarChart3,
  Calendar,
  Users,
  Globe,
  Brain,
  Target
} from 'lucide-react';

interface NavigationItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  href: string;
  badge?: number;
  children?: NavigationItem[];
}

const navigationItems: NavigationItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: <Home className="w-5 h-5" />,
    href: '/dashboard'
  },
  {
    id: 'trading',
    label: 'Trading',
    icon: <TrendingUp className="w-5 h-5" />,
    href: '/trading',
    children: [
      { id: 'orders', label: 'Advanced Orders', icon: <Target className="w-4 h-4" />, href: '/trading/orders' },
      { id: 'options', label: 'Options Trading', icon: <BarChart3 className="w-4 h-4" />, href: '/trading/options' },
      { id: 'screener', label: 'Stock Screener', icon: <Search className="w-4 h-4" />, href: '/trading/screener' }
    ]
  },
  {
    id: 'portfolio',
    label: 'Portfolio',
    icon: <PieChart className="w-5 h-5" />,
    href: '/portfolio',
    children: [
      { id: 'analytics', label: 'Analytics', icon: <BarChart3 className="w-4 h-4" />, href: '/portfolio/analytics' },
      { id: 'risk', label: 'Risk Management', icon: <Shield className="w-4 h-4" />, href: '/portfolio/risk' }
    ]
  },
  {
    id: 'markets',
    label: 'Markets',
    icon: <Globe className="w-5 h-5" />,
    href: '/markets',
    children: [
      { id: 'international', label: 'International', icon: <Globe className="w-4 h-4" />, href: '/markets/international' },
      { id: 'calendar', label: 'Economic Calendar', icon: <Calendar className="w-4 h-4" />, href: '/markets/calendar' }
    ]
  },
  {
    id: 'social',
    label: 'Social Trading',
    icon: <Users className="w-5 h-5" />,
    href: '/social'
  },
  {
    id: 'ai',
    label: 'AI Analytics',
    icon: <Brain className="w-5 h-5" />,
    href: '/ai-analytics'
  },
  {
    id: 'alerts',
    label: 'Alerts',
    icon: <Bell className="w-5 h-5" />,
    href: '/alerts',
    badge: 3
  }
];

interface EnhancedNavigationProps {
  currentPath?: string;
  onNavigate?: (href: string) => void;
}

const EnhancedNavigation: React.FC<EnhancedNavigationProps> = ({ 
  currentPath = '/dashboard',
  onNavigate 
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const toggleExpanded = (itemId: string) => {
    setExpandedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const isActive = (href: string) => currentPath === href;
  const isParentActive = (item: NavigationItem) => {
    if (isActive(item.href)) return true;
    return item.children?.some(child => isActive(child.href)) || false;
  };

  const handleNavigation = (href: string) => {
    onNavigate?.(href);
    setMobileMenuOpen(false);
  };

  const NavItem: React.FC<{ item: NavigationItem; level?: number }> = ({ item, level = 0 }) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.includes(item.id);
    const active = isActive(item.href);
    const parentActive = isParentActive(item);

    return (
      <div className="space-y-1">
        <button
          onClick={() => {
            if (hasChildren) {
              toggleExpanded(item.id);
            } else {
              handleNavigation(item.href);
            }
          }}
          className={`
            w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-all duration-200
            ${level === 0 ? 'text-sm font-medium' : 'text-sm ml-4'}
            ${active 
              ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-sm' 
              : parentActive && level === 0
                ? 'bg-slate-50 text-slate-900'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }
          `}
        >
          <div className="flex items-center space-x-3">
            <span className={active ? 'text-blue-600' : 'text-slate-500'}>
              {item.icon}
            </span>
            <span>{item.label}</span>
            {item.badge && (
              <Badge className="bg-red-500 text-white text-xs px-1.5 py-0.5 min-w-[1.25rem] h-5">
                {item.badge}
              </Badge>
            )}
          </div>
          
          {hasChildren && (
            <ChevronDown 
              className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                isExpanded ? 'rotate-180' : ''
              }`} 
            />
          )}
        </button>

        {hasChildren && isExpanded && (
          <div className="space-y-1 animate-in slide-in-from-top-2 duration-200">
            {item.children?.map(child => (
              <NavItem key={child.id} item={child} level={level + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex h-screen" style={{backgroundColor: 'var(--color-primary-50)'}}>
      {/* Desktop Sidebar */}
      <div className={`hidden lg:flex lg:flex-shrink-0 transition-all duration-300 ${
        sidebarCollapsed ? 'lg:w-16' : 'lg:w-64'
      }`}>
        <div className="flex flex-col w-full">
          <div className="flex flex-col flex-grow pt-5 pb-4 overflow-y-auto bg-white shadow-lg" style={{borderRight: '1px solid var(--color-primary-200)'}}>
            {/* Logo */}
            <div className="flex items-center flex-shrink-0 px-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{backgroundColor: 'var(--color-secondary-600)'}}>
                  <span className="text-white font-bold text-sm">IP</span>
                </div>
                {!sidebarCollapsed && (
                  <span className="text-xl font-bold" style={{color: 'var(--color-primary-900)'}}>InvestPro</span>
                )}
              </div>
            </div>

            {/* Navigation Items */}
            <div className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
              {navigationItems.map(item => (
                <NavItem key={item.id} item={item} />
              ))}
            </div>
          </div>
          {/* User Profile */}
          <div className="flex-shrink-0 p-4 border-t border-slate-200">
            <button className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors">
              <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-slate-600" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium text-slate-900">John Doe</p>
                <p className="text-xs text-slate-500">Premium Account</p>
              </div>
              <Settings className="w-4 h-4 text-slate-400" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className="lg:hidden">
        {/* Mobile Header */}
        <div className="flex items-center justify-between h-16 px-4 bg-white border-b border-slate-200">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-slate-900">TradePro</span>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2"
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </Button>
        </div>

        {/* Mobile Menu Overlay */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="fixed inset-0 bg-black bg-opacity-25" onClick={() => setMobileMenuOpen(false)} />
            
            <div className="fixed top-0 right-0 bottom-0 w-full max-w-sm bg-white shadow-xl">
              <div className="flex items-center justify-between h-16 px-4 border-b border-slate-200">
                <span className="text-lg font-semibold text-slate-900">Menu</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
              
              <div className="px-4 py-6 space-y-2 overflow-y-auto">
                {navigationItems.map(item => (
                  <NavItem key={item.id} item={item} />
                ))}
              </div>
              
              {/* Mobile User Profile */}
              <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-200 bg-white">
                <button className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors">
                  <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-slate-600" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium text-slate-900">John Doe</p>
                    <p className="text-xs text-slate-500">Premium Account</p>
                  </div>
                  <Settings className="w-4 h-4 text-slate-400" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quick Actions Bar (Mobile) */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-4 py-2">
        <div className="flex items-center justify-around">
          {navigationItems.slice(0, 5).map(item => (
            <button
              key={item.id}
              onClick={() => handleNavigation(item.href)}
              className={`flex flex-col items-center space-y-1 px-3 py-2 rounded-lg transition-colors ${
                isActive(item.href) 
                  ? 'text-blue-600' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {item.icon}
              <span className="text-xs font-medium">{item.label}</span>
              {item.badge && (
                <Badge className="absolute -top-1 -right-1 bg-red-500 text-white text-xs px-1 py-0 min-w-[1rem] h-4">
                  {item.badge}
                </Badge>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default EnhancedNavigation;
