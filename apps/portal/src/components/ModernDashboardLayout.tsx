"use client";
'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from '@/components/MotionWrappers';
import { useRouter, usePathname } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
  LayoutDashboard, 
  LineChart, 
  BrainCircuit, 
  BarChart3, 
  UserCog, 
  AlertCircle, 
  Search, 
  Option, 
  Shield, 
  Users, 
  Settings, 
  Bell, 
  HelpCircle,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

const sidebarItems = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'portfolio', label: 'Portfolio', icon: LineChart },
  { id: 'ai-insights', label: 'AI Insights', icon: BrainCircuit },
  { id: 'trading', label: 'Trading', icon: BarChart3 },
  { id: 'screener', label: 'Stock Screener', icon: Search },
  { id: 'options', label: 'Options', icon: Option },
  { id: 'risk', label: 'Risk Management', icon: AlertCircle },
  { id: 'compliance', label: 'Compliance', icon: Shield },
  { id: 'social', label: 'Social Trading', icon: Users },
];

const settingsItems = [
  { id: 'settings', label: 'Settings', icon: Settings },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'help', label: 'Help & Support', icon: HelpCircle },
];

const MotionDiv = motion.div;

const ModernDashboardLayout = ({ children }: { children: React.ReactNode }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const router = useRouter();
  const pathname = usePathname();

  // Update active tab based on route
  useEffect(() => {
    const currentTab = sidebarItems.find(item => pathname.includes(item.id))?.id || 'overview';
    setActiveTab(currentTab);
  }, [pathname]);

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    router.push(`/dashboard/${tabId}`);
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <motion.div
        className={`h-full bg-card border-r border-border flex flex-col ${isCollapsed ? 'w-16' : 'w-64'}`}
        initial={{ width: 256 }}
        animate={{ width: isCollapsed ? 64 : 256 }}
        transition={{ duration: 0.2, ease: 'easeInOut' }}
      >
        <div className="p-4 border-b border-border flex items-center justify-between">
          {!isCollapsed && <h1 className="text-xl font-bold">InvestPro</h1>}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="h-8 w-8"
          >
            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto py-4">
          <nav className="space-y-1 px-2">
            {sidebarItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              
              return (
                <button
                  key={item.id}
                  onClick={() => handleTabChange(item.id)}
                  className={`w-full flex items-center px-4 py-3 rounded-lg transition-colors ${
                    isActive 
                      ? 'bg-primary/10 text-primary font-medium' 
                      : 'text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  {!isCollapsed && <span className="ml-3">{item.label}</span>}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-border">
          {settingsItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                className="w-full flex items-center px-4 py-3 rounded-lg text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground transition-colors"
              >
                <Icon className="h-5 w-5" />
                {!isCollapsed && <span className="ml-3">{item.label}</span>}
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Navigation */}
        <header className="h-16 border-b border-border bg-card/50 backdrop-blur-sm">
          <div className="h-full px-6 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h2 className="text-xl font-semibold">
                {sidebarItems.find(item => item.id === activeTab)?.label || 'Dashboard'}
              </h2>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="outline" size="sm" className="rounded-full">
                <Bell className="h-4 w-4 mr-2" />
                <span>Notifications</span>
              </Button>
              <Button variant="outline" size="sm" className="rounded-full">
                <HelpCircle className="h-4 w-4 mr-2" />
                <span>Help</span>
              </Button>
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <UserCog className="h-4 w-4 text-primary" />
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6 bg-muted/10">
          <AnimatePresence mode="wait">
            <MotionDiv
              key={activeTab}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              className="h-full"
            >
              {children}
            </MotionDiv>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};

export default ModernDashboardLayout;
