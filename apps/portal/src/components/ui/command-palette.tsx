"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from '@/components/MotionWrappers';
import { useRouter } from 'next/navigation';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { 
  Search, BarChart3, TrendingUp, DollarSign, Globe, Brain, 
  Users, Shield, Settings, CreditCard, Target, Zap, Activity,
  PieChart, LineChart, Briefcase, Bell, AlertTriangle, Sparkles,
  Command as CommandIcon, ArrowRight, Hash, Calculator, Calendar
} from 'lucide-react';

interface CommandPaletteProps {
  open: boolean;
  setOpen: (open: boolean) => void;
}

interface Command {
  id: string;
  title: string;
  description?: string;
  shortcut?: string;
  icon?: React.ComponentType<{ className?: string }>;
  category: 'navigation' | 'actions' | 'ai' | 'tools' | 'settings';
  action: () => void;
  keywords?: string[];
}

export function CommandPalette({ open, setOpen }: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');

  // Define all available commands
  const commands: Command[] = [
    // Navigation
    {
      id: 'nav-dashboard',
      title: 'Go to Dashboard',
      description: 'View your portfolio overview and AI insights',
      shortcut: '⌘D',
      icon: BarChart3,
      category: 'navigation',
      action: () => router.push('/dashboard'),
      keywords: ['dashboard', 'home', 'overview']
    },
    {
      id: 'nav-portfolio',
      title: 'Go to Portfolio',
      description: 'Manage your investments and allocations',
      shortcut: '⌘P',
      icon: PieChart,
      category: 'navigation',
      action: () => router.push('/portfolio'),
      keywords: ['portfolio', 'holdings', 'investments']
    },
    {
      id: 'nav-trading',
      title: 'Go to Trading',
      description: 'Execute trades and manage orders',
      shortcut: '⌘T',
      icon: DollarSign,
      category: 'navigation',
      action: () => router.push('/trading'),
      keywords: ['trading', 'orders', 'buy', 'sell']
    },
    {
      id: 'nav-markets',
      title: 'Go to Markets',
      description: 'View market data and analysis',
      shortcut: '⌘M',
      icon: Globe,
      category: 'navigation',
      action: () => router.push('/markets'),
      keywords: ['markets', 'data', 'stocks', 'quotes']
    },
    {
      id: 'nav-ai-insights',
      title: 'Go to AI Insights',
      description: 'View AI-powered recommendations',
      shortcut: '⌘I',
      icon: Brain,
      category: 'navigation',
      action: () => router.push('/ai-insights'),
      keywords: ['ai', 'insights', 'recommendations', 'analysis']
    },

    // Actions
    {
      id: 'action-new-order',
      title: 'New Order',
      description: 'Create a new buy or sell order',
      shortcut: '⌘N',
      icon: Target,
      category: 'actions',
      action: () => {
        router.push('/trading');
        // TODO: Focus order entry form
      },
      keywords: ['order', 'trade', 'buy', 'sell', 'new']
    },
    {
      id: 'action-portfolio-rebalance',
      title: 'Rebalance Portfolio',
      description: 'AI-powered portfolio rebalancing',
      shortcut: '⌘R',
      icon: Activity,
      category: 'actions',
      action: () => {
        router.push('/portfolio?tab=allocation');
        // TODO: Trigger rebalance modal
      },
      keywords: ['rebalance', 'allocation', 'optimize']
    },
    {
      id: 'action-search-stocks',
      title: 'Search Stocks',
      description: 'Search for stocks and ETFs',
      shortcut: '⌘S',
      icon: Search,
      category: 'actions',
      action: () => router.push('/screener'),
      keywords: ['search', 'stocks', 'etfs', 'screener']
    },

    // AI Commands
    {
      id: 'ai-analyze-portfolio',
      title: 'AI Portfolio Analysis',
      description: 'Get AI insights on your portfolio',
      icon: Sparkles,
      category: 'ai',
      action: () => {
        // TODO: Trigger AI analysis
        console.log('AI Portfolio Analysis triggered');
      },
      keywords: ['ai', 'analyze', 'portfolio', 'insights']
    },
    {
      id: 'ai-market-outlook',
      title: 'AI Market Outlook',
      description: 'Get AI-powered market predictions',
      icon: Brain,
      category: 'ai',
      action: () => {
        // TODO: Show AI market outlook
        console.log('AI Market Outlook triggered');
      },
      keywords: ['ai', 'market', 'outlook', 'prediction']
    },
    {
      id: 'ai-risk-assessment',
      title: 'AI Risk Assessment',
      description: 'Analyze portfolio risk with AI',
      icon: AlertTriangle,
      category: 'ai',
      action: () => {
        router.push('/portfolio?tab=risk');
      },
      keywords: ['ai', 'risk', 'assessment', 'analysis']
    },

    // Tools
    {
      id: 'tool-calculator',
      title: 'Investment Calculator',
      description: 'Calculate returns and projections',
      icon: Calculator,
      category: 'tools',
      action: () => {
        // TODO: Open calculator modal
        console.log('Investment Calculator opened');
      },
      keywords: ['calculator', 'returns', 'projections']
    },
    {
      id: 'tool-calendar',
      title: 'Economic Calendar',
      description: 'View upcoming economic events',
      icon: Calendar,
      category: 'tools',
      action: () => router.push('/calendar'),
      keywords: ['calendar', 'events', 'economic', 'earnings']
    },

    // Settings
    {
      id: 'settings-account',
      title: 'Account Settings',
      description: 'Manage your account preferences',
      icon: Settings,
      category: 'settings',
      action: () => router.push('/settings'),
      keywords: ['settings', 'account', 'preferences']
    },
    {
      id: 'settings-notifications',
      title: 'Notification Settings',
      description: 'Configure alerts and notifications',
      icon: Bell,
      category: 'settings',
      action: () => router.push('/settings/notifications'),
      keywords: ['notifications', 'alerts', 'settings']
    }
  ];

  // Filter commands based on query
  const filteredCommands = commands.filter(command => {
    if (!query) return true;
    
    const searchText = query.toLowerCase();
    const matchesTitle = command.title.toLowerCase().includes(searchText);
    const matchesDescription = command.description?.toLowerCase().includes(searchText);
    const matchesKeywords = command.keywords?.some(keyword => 
      keyword.toLowerCase().includes(searchText)
    );
    
    return matchesTitle || matchesDescription || matchesKeywords;
  });

  // Group commands by category
  const groupedCommands = filteredCommands.reduce((groups, command) => {
    const category = command.category;
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(command);
    return groups;
  }, {} as Record<string, Command[]>);

  // Handle command execution
  const executeCommand = useCallback((command: Command) => {
    setOpen(false);
    setQuery('');
    command.action();
  }, [setOpen]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Open command palette with Cmd+K
      if (e.metaKey && e.key === 'k') {
        e.preventDefault();
        setOpen(true);
        return;
      }

      // Execute shortcuts when palette is closed
      if (!open) {
        const shortcut = e.metaKey ? `⌘${e.key.toUpperCase()}` : null;
        if (shortcut) {
          const command = commands.find(cmd => cmd.shortcut === shortcut);
          if (command) {
            e.preventDefault();
            command.action();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [commands, open, setOpen]);

  const categoryLabels = {
    navigation: 'Navigation',
    actions: 'Actions',
    ai: 'AI Commands',
    tools: 'Tools',
    settings: 'Settings'
  };

  const categoryIcons = {
    navigation: ArrowRight,
    actions: Zap,
    ai: Sparkles,
    tools: Hash,
    settings: Settings
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="p-0 max-w-2xl">
        <Command className="rounded-lg border shadow-md">
          <div className="flex items-center border-b px-3">
            <CommandIcon className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <CommandInput 
              placeholder="Type a command or search..."
              value={query}
              onValueChange={setQuery}
              className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
            />
            <Badge variant="outline" className="ml-2 text-xs">
              ⌘K
            </Badge>
          </div>
          
          <CommandList className="max-h-[400px] overflow-y-auto">
            <CommandEmpty>
              <div className="py-6 text-center text-sm">
                <Search className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                No results found for "{query}"
              </div>
            </CommandEmpty>
            
            {Object.entries(groupedCommands).map(([category, categoryCommands]) => {
              const CategoryIcon = categoryIcons[category as keyof typeof categoryIcons];
              
              return (
                <CommandGroup 
                  key={category} 
                  heading={
                    <div className="flex items-center space-x-2">
                      <CategoryIcon className="h-4 w-4" />
                      <span>{categoryLabels[category as keyof typeof categoryLabels]}</span>
                    </div>
                  }
                >
                  {categoryCommands.map((command) => {
                    const Icon = command.icon;
                    
                    return (
                      <CommandItem
                        key={command.id}
                        onSelect={() => executeCommand(command)}
                        className="flex items-center justify-between p-3 cursor-pointer hover:bg-accent"
                      >
                        <div className="flex items-center space-x-3">
                          {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
                          <div>
                            <div className="font-medium">{command.title}</div>
                            {command.description && (
                              <div className="text-sm text-muted-foreground">
                                {command.description}
                              </div>
                            )}
                          </div>
                        </div>
                        {command.shortcut && (
                          <Badge variant="outline" className="text-xs">
                            {command.shortcut}
                          </Badge>
                        )}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              );
            })}
          </CommandList>
          
          <div className="border-t px-3 py-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Press ↵ to select • ⌘K to toggle • ↑↓ to navigate</span>
              <div className="flex items-center space-x-1">
                <span>AI Enhanced</span>
                <Sparkles className="h-3 w-3" />
              </div>
            </div>
          </div>
        </Command>
      </DialogContent>
    </Dialog>
  );
}

// Hook for using command palette
export function useCommandPalette() {
  const [open, setOpen] = useState(false);

  return {
    open,
    setOpen,
    toggle: () => setOpen(!open),
  };
}